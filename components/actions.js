var jimp = require('jimp');
var debug = require('debug')('tots:actions');
var generateAttachments = require('./generateAttachments');
var jo = require('jpeg-autorotate');
var fs = require('fs');
var s3 = require('s3');
var async = require('async');
var client = s3.createClient({
    s3Options: {
        accessKeyId: process.env.aws_key,
        secretAccessKey: process.env.aws_secret,
        region: 'us-east-1'
    }
});
var request = require('request');

var gm = require('gm');

module.exports = function(webserver, db, botkit) {

    function updateFaveCount(post) {
        return new Promise(function(resolve, reject) {
            db.faves.count({
                post: post._id
            }, function(err, count) {
                if (!err) {
                    post.faveCount = count;
                    db.posts.update({
                        _id: post._id
                    }, {
                        $set: {
                            faveCount: count
                        }
                    }, function(err, res) {
                        resolve(count);
                    });
                } else {
                    reject(err);
                    console.error('error loading faves', err);
                }
            });
        });
    }


    function updateCommentCount(post) {
        return new Promise(function(resolve, reject) {
            db.comments.count({
                replyTo: post._id
            }, function(err, count) {
                if (!err) {
                    post.replyCount = count;
                    db.posts.update({
                        _id: post._id
                    }, {
                        $set: {
                            replyCount: count,
                            lastReply: new Date(),
                        }
                    }, function(err, res) {
                        resolve(count);
                    });
                } else {
                    reject(err);
                    console.error('error loading comments', err);
                }
            });
        });
    }

    db.updateCommentCount = updateCommentCount;



    function sendLiveNotifications(post, fromuser) {

        if (post.live && process.env.TWILIO_ACCOUNT_SID) {
            // find people who want a notification about this live post.
            db.follow.find({
                following: post.user,
            }, {
                user: 1
            }, function(err, followers) {

                var list = followers.map(function(f) {
                    return f.user;
                });
                db.users.find({
                    _id: {
                        $in: list
                    },
                    phonenumber_verified: true,
                    "notifications.friends_live": true,
                }, function(err, alert_friends) {

                    var bot = botkit.spawn({});
                    var text = fromuser.displayName + ' has started a live chat on tots.cool! Click below to join: \n';
                    text = text + 'http://tots.cool/@' + fromuser.username + '/tots/' + post._id + '/live';

                    async.each(alert_friends, function(friend, next) {

                        bot.say({
                            text: text,
                            user: friend.phonenumber,
                            channel: friend.phonenumber,
                        }, function(err) {
                            if (err) {
                                console.error('ERROR SENDING NOTIFICATION SMS', err);
                            }
                        });

                    }, function() {

                        // done sending
                    });
                });
            });
        }
    }

    webserver.post('/actions/delete', function(req, res) {

        if (req.user && req.body.post) {
            db.posts.findOne({
                user: req.user_profile._id,
                _id: req.body.post
            }, function(err, original_post) {
                if (original_post) {
                    original_post.deleted = true;
                    original_post.updated = new Date();
                    original_post.save(function(err) {
                        if (err) {
                            res.json({
                                ok: false,
                                error: err,
                            })
                        } else {
                            res.json({
                                ok: true,
                            })
                        }
                    });
                } else {
                    res.json({
                        ok: false,
                        error: 'Cannot delete this post',
                    })
                }
            });
        } else {
            // todo: better way to handle this
            res.json({
                ok: false,
            })
        }


    });

    webserver.post('/actions/edit', function(req, res) {

        if (req.user && req.body._id) {
            db.posts.findOne({
                user: req.user_profile._id,
                _id: req.body._id
            }, function(err, original_post) {

                if (!original_post) {
                    return res.json({
                        ok: false
                    });
                } else {

                    var revision = new db.revisions();
                    revision.post = original_post._id;
                    revision.text = original_post.text;
                    revision.images = original_post.images;
                    revision.save();

                    original_post.text = req.body.text;
                    console.log('SETTING LIVE SETTING TO ', req.body.live);

                    if (req.body.live) {
                        console.log('SETTING LIVE SETTING TO ', req.body.live);
                        original_post.live = true;

                        sendLiveNotifications(original_post, req.user_profile);

                        // TODO: turn off other live posts by this user.
                        db.posts.update({
                            user: req.user_profile._id,
                            _id: {
                                $ne: original_post._id
                            },
                            live: true,
                        }, {
                            $set: {
                                live: "false"
                            }
                        }, {
                            multi: 1
                        }, function(err, rez) {
                            if (err) {
                                console.error('Error reseting live status', err);
                            } else {
                                console.log('UPDATED LIVE', rez);
                            }
                        });

                    } else {
                        original_post.live = false;
                    }
                    handleMentions(original_post, function(err, original_post) {
                        generateAttachments(original_post.text).then(function(attachments) {
                            original_post.attachments = attachments;
                            original_post.updated = new Date();
                            original_post.save();

                            return res.json({
                                ok: true
                            });
                        });
                    }, true);

                }
            });
        } else {

            res.json({
                ok: false
            })

        }


    })

    function handleMentions(post, cb, donotnotify) {

        if (post.text) {
            var matches = post.text.match(/(\@\w+)/img);

            if (!matches) {
                return cb(null, post);
            }

            // remove dupes
            var mentions = matches.filter(function(item, pos) {
                return matches.indexOf(item) == pos;
            })

            async.each(mentions, function(username, next) {
                username = username.substr(1);

                // look up user by username
                db.users.findOne({
                    username: username
                }, function(err, user) {
                    if (user) {
                        var pattern = new RegExp('\@' + username, 'ig');
                        post.text = post.text.replace(pattern, '<@' + user._id + '>');

                        // don't notify of self-mentions
                        // this checks if mentioned user is post or comment owner
                        if (donotnotify !== true) {
                            if (String(user._id) != String(post.user)) {
                                // send a notification to mentioned person
                                var notification = new db.notifications();
                                notification.user = user._id;
                                notification.actor = post.user;
                                // is this a comment or a post?
                                if (post.replyTo) {
                                    // this is a comment
                                    notification.post = post.replyTo;
                                    notification.comment = post._id;
                                } else {
                                    notification.post = post._id;
                                }
                                notification.type = 'mention';
                                notification.text = '<@' + post.user + '> mentioned you in a post';
                                notification.save();
                            }
                        }
                        next();


                    } else {
                        next();
                    }
                });

            }, function() {

                cb(null, post);

            });

        } else {
            cb(null, post)
        }
    }

    db.handleMentions = handleMentions;

    db.createPost = function(text, user) {

        return new Promise(function(resolve, reject) {
                var post = new db.posts();
                post.text = text;
                post.user = user;
                handleMentions(post, function(err, post) {
                        generateAttachments(post.text).then(function(attachments) {
                            post.attachments = attachments;
                            if (err) {
                                return reject(err);
                            }
                            post.save(function(err) {
                                if (err) {
                                    return reject(err);
                                }
                                resolve(post);
                            });
                        });
                });
        });
}

db.createPicturePost = function(url, content_type, text, user) {

    return new Promise(function(resolve, reject) {
        var post = new db.posts();
        db.acceptMMS(url, content_type, user, function(err, s3_file) {
            if (err) {
                return reject(err);
            }
            post.images.push(s3_file)
            post.save();

            post.text = text;
            post.user = user;
            handleMentions(post, function(err, post) {

                if (err) {
                    return reject(err);
                }
                post.save(function(err) {
                    if (err) {
                        return reject(err);
                    }
                    resolve(post);
                });
            });
        });
    });
}

webserver.post('/actions/post', function(req, res) {

    if (req.user && req.body.text && req.body.text != '') {
        var post = new db.posts();
        post.text = req.body.text;
        post.user = req.user_profile._id;
        if (req.body.live) {
            post.live = true;

            // TODO: turn off other live posts by this user.
            db.posts.update({
                user: req.user_profile._id,
                _id: {
                    $ne: post._id
                },
                live: true,
            }, {
                $set: {
                    live: "false"
                }
            }, {
                multi: 1
            }, function(err, rez) {
                if (err) {
                    console.error('Error reseting live status', err);
                } else {
                    console.log('UPDATED LIVE', rez);
                }
            });
        }
        handleMentions(post, function(err, post) {
            generateAttachments(post.text).then(function(attachments) {
                post.attachments = attachments;
                post.save();

                if (post.live) {
                    sendLiveNotifications(post, req.user_profile);
                }

                if (req.files && req.files.image) {
                    debug('Got a file upload', req.files.image);
                    acceptUpload(req.files.image, req.files.image.name, req.user_profile._id, false, function(err, s3_file) {
                        if (err) {
                            console.error('FAILED TO ACCEPT UPLOAD', err);
                            res.json({
                                ok: false,
                                error: err
                            });
                        } else {
                            post.images.push(s3_file)
                            post.save();

                            debug('NEW POST', post);
                            res.json({
                                ok: true,
                                data: post
                            });
                        }

                    })
                } else {
                    debug('NEW POST', post);
                    res.json({
                        ok: true,
                        data: post
                    });
                }
            }); //attachments
        }); // mentions
    } else {
        res.redirect('/login');
    }

});

webserver.post('/actions/comment/:post', function(req, res) {

    if (req.user && ((req.body.text && req.body.text != '') || (req.files && req.files.image))) {
        db.posts.findOne({
            _id: req.params.post
        }, function(err, post) {
            if (post) {

                var comment = new db.comments();
                comment.text = req.body.text;
                comment.user = req.user_profile._id;
                comment.replyTo = post._id;
                handleMentions(comment, function(err, comment) {
                    generateAttachments(comment.text).then(function(attachments) {
                        comment.attachments = attachments;
                        comment.save(function() {
                            updateCommentCount({
                                _id: req.params.post
                            });
                        });


                        if (req.files && req.files.image) {
                            debug('Got a file upload', req.files.image);
                            console.log('posting a comment.', req.body)
                            acceptUpload(req.files.image, req.files.image.name, req.user_profile._id, false, function(err, s3_file) {
                                if (err) {
                                    console.error('FAILED TO ACCEPT UPLOAD', err);

                                    res.json({
                                        ok: false,
                                        error: err
                                    });
                                } else {
                                    comment.images.push(s3_file)
                                    comment.save();

                                    debug('NEW POST', post);
                                    res.json({
                                        ok: true,
                                        data: comment,
                                    })

                                    if (req.body.post_to_feed == true || req.body.post_to_feed == 'true') {
                                        var repost = new db.posts();
                                        repost.text = comment.text;
                                        repost.user = req.user_profile._id;
                                        repost.replyTo = post._id;
                                        repost.images = comment.images;
                                        repost.save(function(saved_post) {
                                            comment.post = repost._id;
                                            comment.save();
                                        });
                                    }
                                }
                            })
                        } else {


                            res.json({
                                ok: true,
                                data: comment,
                            })

                            if (req.body.post_to_feed == true) {
                                var repost = new db.posts();
                                repost.text = comment.text;
                                repost.user = req.user_profile._id;
                                repost.replyTo = post._id;
                                repost.save(function(saved_post) {
                                    comment.post = repost._id;
                                    comment.save();
                                });
                            }

                        }



                        if (String(req.user_profile._id) != String(post.user)) {
                            var pattern = new RegExp("<@" + post.user + ">");
                            // do not send a comment notification if there was already a mention
                            if (!comment.text.match(pattern)) {
                                var notification = new db.notifications();
                                notification.user = post.user;
                                notification.actor = req.user_profile._id;
                                notification.post = post._id;
                                notification.comment = comment._id;
                                notification.type = 'comment';
                                notification.text = '<@' + req.user_profile._id + '> replied to your post';
                                notification.save();
                            }
                        }

                    });

                });

            }
        });

    } else {
        res.json({
            ok: false,
        })
    }
});

function autoResize(file, is_avatar) {
    return new Promise(function(resolve, reject) {
        jimp.read(file).then(function(image) {
            if (is_avatar) {
                image.cover(100,100,jimp.HORIZONTAL_ALIGN_CENTER | jimp.VERTICAL_ALIGN_MIDDLE).write(file, function(err) {
                    resolve();
                });
            } else if (image.bitmap.width > 1000) {
                image.resize(1000,jimp.AUTO).write(file, function(err) {
                    resolve();
                });
            } else {
                resolve();
            }
        }).catch(function(err){
            console.error('FILE RESIZE ERR', err);
            resolve()
        });
    });
}

function autoRotate(file, is_avatar, cb) {

    if (file.match(/\.jpg$/i) || file.match(/\.jpeg$/i)) {

        if (is_avatar) {
            gm(file).autoOrient().resize('100', '100', '^')
             .gravity('Center')
             .crop('100', '100').quality(85)
             .write(file, function (err) {
                 cb(err, file);
             });
        } else {
            gm(file).autoOrient().resize(1000).quality(85).write(file, function (err) {
                cb(err, file);
             });
         }

    } else {
        cb(null, file);
    }

}

function autoRotateold(file, is_avatar, cb) {

    if (file.match(/\.jpg$/i) || file.match(/\.jpeg$/i)) {
        var options = {
            quality: 85,
        };

        autoResize(file, is_avatar).then(function() {
            jo.rotate(file, options, function(error, buffer, orientation) {
            if (error) {
                console.error('JPG ROTATE ERROR', error);
                cb(null, file);
            } else {

                debug('writing rotated file back to tmp');
                fs.writeFile(file, buffer, "binary", function(err) {
                    if (err) {
                        cb(err);
                    } else {
                        cb(null, file);
                    }
                });
            }
        });
          });
    } else {
        cb(null, file);
    }

}

function acceptUpload(file, filename, user_id, is_avatar, cb) {

    var upload_path = '/tmp/' + user_id + '_' + filename;
    file.mv(upload_path, function(err) {
        if (err) {
            console.error(err);

            debug('NEW POST', post);
            res.redirect('/me');

        } else {
            autoRotate(upload_path, is_avatar, function(err) {
                if (err) {
                    cb(err);
                } else {
                    debug('File ready to upload');
                    var ts = new Date().getTime();
                    var uploader = client.uploadFile({
                        localFile: upload_path,
                        s3Params: {
                            Bucket: 'tots',
                            Key: 'images/' + user_id + '_' + ts + '_' + filename,
                        }
                    });
                    uploader.on('error', function(err) {
                        console.error("unable to upload:", err.stack);
                    });
                    uploader.on('end', function() {

                        cb(null, {
                            name: filename,
                            s3_key: 'images/' + user_id + '_' + ts + '_' + filename,
                            url: 'https://s3.amazonaws.com/tots/images/' + user_id + '_' + ts + '_' + filename
                        })

                    });
                }
            });
        }
    });


}

function acceptMMS(url, mime_type, user_id, cb) {
    var ts = new Date().getTime();
    var upload_path = '/tmp/' + user_id + '_' + ts;
    request({
        url: url,
        method: 'GET',
        encoding: null
    }, function(err, response, body) {
        if (err) {
            console.error('Error retrieving MMS', err);
            cb(err);
        } else {
            var file = fs.writeFile(upload_path, body, 'binary', function(err) {
                if (err) {
                    console.error('Error accepting MMS', err);
                    cb(err);
                } else {
                    autoRotate(upload_path, false, function(err) {
                        if (err) {
                            cb(err);
                        } else {
                            debug('File ready to upload');
                            var ts = new Date().getTime();
                            var uploader = client.uploadFile({
                                localFile: upload_path,
                                s3Params: {
                                    ContentType: mime_type,
                                    Bucket: 'tots',
                                    Key: 'images/' + user_id + '_' + ts,
                                }
                            });
                            uploader.on('error', function(err) {
                                console.error("unable to upload:", err.stack);
                            });
                            uploader.on('end', function() {

                                cb(null, {
                                    name: user_id + '_' + ts,
                                    s3_key: 'images/' + user_id + '_' + ts,
                                    url: 'https://s3.amazonaws.com/tots/images/' + user_id + '_' + ts,
                                })

                            });
                        }
                    });
                }
            });
        }
    });
}

db.acceptUpload = acceptUpload;
db.acceptMMS = acceptMMS;

function generateCode() {
    var code = '';
    for (var i = 0; i < 4; i++) {
        code = code + Math.floor(Math.random() * 10);
    }
    return code;

}

db.generateCode = generateCode;

webserver.post('/actions/addphone', function(req, res) {

    if (req.user_profile) {

        if (req.body.phonenumber && !req.body.verification) {
            // TODO: Make sure this number isn't already in use by someone else
            req.user_profile.phonenumber = req.body.phonenumber;
            req.user_profile.phonenumber_verified = false;
            req.user_profile.phonenumber_verification = generateCode();

            // req.user_profile.markModified('phonenumber_verified');

            req.user_profile.save(function(err) {


                var bot = botkit.spawn({});

                bot.say({
                    text: 'Your verification code for tots is: ' + req.user_profile.phonenumber_verification,
                    user: req.user_profile.phonenumber,
                    channel: req.user_profile.phonenumber,
                }, function(err) {
                    if (err) {
                        console.error('SMS ERROR', err);
                        res.json({
                            ok: false,
                            error: err,
                        })
                    } else {
                        res.json({
                            ok: true,
                            data: {
                                phonenumber: req.user_profile.phonenumber,
                                phonenumber_verified: req.user_profile.phonenumber_verified,
                                verification_sent: true,
                            }
                        });
                    }

                });



            })
        } else if (req.body.phonenumber && req.body.verification) {
            if (req.user_profile.phonenumber == req.body.phonenumber && req.body.verification == req.user_profile.phonenumber_verification) {

                req.user_profile.phonenumber_verified = true;
                req.user_profile.phonenumber_verification = null;
                req.user_profile.notifications = {
                    friends_live: true,
                }
                req.user_profile.save(function(err) {

                    var bot = botkit.spawn({});

                    res.json({
                        ok: true,
                        data: {
                            phonenumber_verified: true,
                        }
                    })

                    bot.say({
                        text: 'We are now connected! You can txt me updates! Add me to your contacts!',
                        user: req.user_profile.phonenumber,
                        channel: req.user_profile.phonenumber,
                        mediaUrl: 'http://tots.cool/tots.vcf'
                    }, function(err) {
                        if (err) {
                            console.error('ERROR SENDING SMS', err);
                        }
                    });

                });

            } else {
                res.json({
                    ok: false,
                    error: 'Verification code did not match',
                })

            }

        }
    } else {
        res.json({
            ok: false,
            error: 'auth_required',
        });
    }
});

webserver.post('/actions/togglenotification', function(req, res) {

    var notification = req.body.notification;
    var value = (req.body.value === true);
    req.user_profile.notifications[notification] = value;
    if (req.user_profile) {
        // req.user_profile.markModified('notifications');
        // req.user_profile.save(function(err,rez) {
        db.users.update({
            _id: req.user_profile._id,
        }, {
            $set: {
                notifications: req.user_profile.notifications
            }
        }, function(err, rez) {
            if (err) {
                console.error('error updating notification pref', err);
                res.json({
                    ok: false,
                    error: err
                });
            } else {
                res.json({
                    ok: true,
                    data: req.user_profile
                })
            }
        });
    } else {
        res.json({
            ok: false
        });
    }

});

webserver.post('/actions/editprofile', function(req, res) {

    if (req.user_profile) {
        db.users.count({
            username: req.body.username,
            _id: {
                $ne: req.user_profile._id
            }
        }, function(err, existing) {
            if (existing == 0) {
                req.user_profile.username = req.body.username;

                req.user_profile.username = req.user_profile.username.replace(/\W/g, '');
            }
            req.user_profile.displayName = req.body.displayName;
            req.user_profile.bio = req.body.bio;

            if (req.body.nightmode) {
              req.user_profile.settings.nightmode = true;
            } else {
              req.user_profile.settings.nightmode = false;
            }

            if (req.body.darknightmode) {
              req.user_profile.settings.darknightmode = true;
            } else {
              req.user_profile.settings.darknightmode = false;
            }


            req.user_profile.markModified('settings');

            req.user_profile.save();

            if (req.files && req.files.image) {
                debug('Got a file upload', req.files.image);
                acceptUpload(req.files.image, req.files.image.name, req.user_profile._id, true, function(err, s3_file) {
                    if (err) {
                        res.json({
                            ok: false,
                            error: err
                        });
                    } else {
                        req.user_profile.avatar_url = s3_file.url;
                        req.user_profile.save();

                        res.redirect('/me');
                    }
                });
            } else {
                res.redirect('/me');
            }
        });
    } else {
        res.redirect('/login');
    }
})


webserver.get('/actions/follow/:uid', function(req, res) {
    if (req.user) {
        db.follow.findOne({
            user: req.user_profile._id,
            following: req.params.uid
        }, function(err, follow) {
            if (!follow) {
                db.users.findOne({
                    _id: req.params.uid
                }, function(err, followee) {
                    if (followee) {
                        if (String(followee._id) != String(req.user_profile._id)) {
                            follow = new db.follow();
                            follow.user = req.user_profile._id;
                            follow.following = followee._id;
                            follow.save();
                            res.json({
                                ok: true
                            });

                            var notification = new db.notifications();
                            notification.user = followee._id;
                            notification.actor = req.user_profile._id;
                            notification.type = 'follow';
                            notification.text = '<@' + req.user_profile._id + '> followed you';
                            notification.save();
                        } else {
                            res.json({
                                ok: true,
                                same_user: true
                            });
                        }
                    } else if (err) {
                        res.json({
                            ok: false,
                            error: err
                        });
                    } else {
                        res.json({
                            ok: false,
                            error: 'user_not_found'
                        });
                    }
                });
            } else {
                res.json({
                    ok: true,
                    exists: true
                });
            }

        });

    } else {
        res.json({
            ok: false,
            error: 'auth_required'
        });
    }
});


webserver.get('/actions/unfollow/:uid', function(req, res) {
    if (req.user) {
        db.follow.remove({
            user: req.user_profile._id,
            following: req.params.uid
        }, function(err, follow) {
            res.json({
                ok: true
            });
        });
    } else {
        res.json({
            ok: false,
            error: 'auth_required'
        });
    }
});



webserver.get('/actions/fave/:pid', function(req, res) {
    if (req.user) {
        db.faves.findOne({
            user: req.user_profile._id,
            post: req.params.pid
        }, function(err, fave) {
            if (!fave) {
                db.posts.findOne({
                    _id: req.params.pid
                }, function(err, post) {
                    if (post) {
                        fave = new db.faves();
                        fave.user = req.user_profile._id;
                        fave.post = post._id;
                        fave.save(function() {
                            updateFaveCount(post).then(function(count) {
                                res.json({
                                    ok: true,
                                    post: {
                                        faveCount: count,
                                        _id: post._id
                                    }
                                });
                            });
                        });


                        if (String(req.user_profile._id) != String(post.user)) {
                            var notification = new db.notifications();
                            notification.user = post.user;
                            notification.actor = req.user_profile._id;
                            notification.post = post._id;
                            notification.type = 'fave';
                            notification.text = '<@' + req.user_profile._id + '> faved your post';
                            notification.save();
                        }

                    } else if (err) {
                        res.json({
                            ok: false,
                            error: err
                        });
                    } else {
                        res.json({
                            ok: false,
                            error: 'post_not_found'
                        });
                    }
                });
            } else {

                res.json({
                    ok: true,
                    exists: true,
                    post: {
                        _id: req.params.pid,
                    }
                });
            }
        });
    } else {
        res.json({
            ok: false,
            error: 'auth_required'
        });
    }
});


webserver.get('/actions/unfave/:pid', function(req, res) {
    if (req.user) {
        db.posts.findOne({
            _id: req.params.pid
        }, function(err, post) {
            if (post) {
                db.faves.remove({
                    user: req.user_profile._id,
                    post: req.params.pid
                }, function(err, follow) {
                    updateFaveCount(post).then(function(count) {
                        res.json({
                            ok: true,
                            post: {
                                faveCount: count,
                                _id: post._id
                            }
                        });
                    })
                });
            } else {
                res.json({
                    ok: false,
                    error: 'post_not_found'
                });
            }
        });
    } else {
        res.json({
            ok: false,
            error: 'auth_required'
        });
    }
});




}
