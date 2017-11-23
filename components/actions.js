var debug = require('debug')('tots:actions');

var s3 = require('s3');

var client = s3.createClient({
    s3Options: {
        accessKeyId: process.env.aws_key,
        secretAccessKey: process.env.aws_secret,
        region: 'us-east-1'
    }
});

module.exports = function(webserver, db) {

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
                            replyCount: count
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

    webserver.post('/actions/edit', function(req, res) {

      if (req.user && req.body._id) {
        db.posts.findOne({user: req.user_profile._id, _id: req.body._id}, function(err, original_post) {

          if (!original_post) {
            return res.json({ok:false});
          } else {

            var revision = new db.revisions();
            revision.post = original_post._id;
            revision.text = original_post.text;
            revision.images = original_post.images;
            revision.save();

            original_post.text = req.body.text;
            original_post.updated = new Date();
            original_post.save();

            return res.json({
              ok: true
            });

          }
        });
      } else {

        res.json({
          ok: false
        })

      }


    })

    webserver.post('/actions/post', function(req, res) {

        if (req.user && req.body.text && req.body.text != '') {
            var post = new db.posts();
            post.text = req.body.text;
            post.user = req.user_profile._id;
            post.save();

            if (req.files && req.files.image) {
                debug('Got a file upload', req.files.image);
                req.files.image.mv('/tmp/' + req.user_profile._id + '_' + req.files.image.name, function(err) {
                    if (err) {
                        console.error(err);

                        debug('NEW POST', post);
                        res.redirect('/me');

                    } else {
                        debug('File ready to upload');
                        var ts = new Date().getTime();
                        var uploader = client.uploadFile({
                            localFile: '/tmp/' + req.user_profile._id + '_' + req.files.image.name,
                            s3Params: {
                                Bucket: 'tots',
                                Key: 'images/' + req.user_profile._id + '_' + ts + '_' + req.files.image.name,
                            }
                        });
                        uploader.on('error', function(err) {
                            console.error("unable to upload:", err.stack);
                        });
                        uploader.on('end', function() {

                            post.images.push({
                                name: req.files.image.name,
                                s3_key: 'images/' + req.user_profile._id + '_' + ts + '_' + req.files.image.name,
                                url: 'https://s3.amazonaws.com/tots/images/' + req.user_profile._id + '_' + ts + '_' + req.files.image.name
                            })
                            post.save();

                            debug('NEW POST', post);
                            res.redirect('/me');

                        });
                    }
                });
            } else {
                debug('NEW POST', post);
                res.redirect('/me');
            }
        } else {
            res.redirect('/login');
        }

    });

    webserver.post('/actions/comment/:post', function(req, res) {

        if (req.user && req.body.text && req.body.text != '') {
            db.posts.findOne({
                _id: req.params.post
            }, function(err, post) {
                if (post) {

                    var comment = new db.comments();
                    comment.text = req.body.text;
                    comment.user = req.user_profile._id;
                    comment.replyTo = post._id;
                    comment.save(function() {
                        updateCommentCount({
                            _id: req.params.post
                        });
                    });

                    if (req.body.post_to_feed == true) {
                        var repost = new db.posts();
                        repost.text = req.body.text;
                        repost.user = req.user_profile._id;
                        repost.replyTo = post._id;
                        repost.save(function(saved_post) {
                            comment.post = repost._id;
                            comment.save();
                        });
                    }

                    if (String(req.user_profile._id) != String(post.user)) {
                        var notification = new db.notifications();
                        notification.user = post.user;
                        notification.actor = req.user_profile._id;
                        notification.post = post._id;
                        notification.comment = comment._id;
                        notification.type = 'comment';
                        notification.text = '<@' + req.user_profile._id + '> replied to your post';
                        notification.save();
                    }

                    res.json({
                        ok: true,
                        data: comment,
                    })
                }
            });

        } else {
            res.json({
                ok: false,
            })
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
                }
                req.user_profile.displayName = req.body.displayName;
                req.user_profile.bio = req.body.bio;
                req.user_profile.save();

                if (req.files && req.files.image) {
                    debug('Got a file upload', req.files.image);
                    req.files.image.mv('/tmp/' + req.user_profile._id + '_' + req.files.image.name, function(err) {
                        if (err) {
                            console.error(err);

                            debug('NEW POST', post);
                            res.redirect('/me');

                        } else {
                            debug('File ready to upload');
                            var ts = new Date().getTime();
                            var uploader = client.uploadFile({
                                localFile: '/tmp/' + req.user_profile._id + '_' + req.files.image.name,
                                s3Params: {
                                    Bucket: 'tots',
                                    Key: 'images/' + req.user_profile._id + '_' + ts + '_' + req.files.image.name,
                                }
                            });
                            uploader.on('error', function(err) {
                                console.error("unable to upload:", err.stack);
                            });
                            uploader.on('end', function() {

                                req.user_profile.avatar_url = 'https://s3.amazonaws.com/tots/images/' + req.user_profile._id + '_' + ts + '_' + req.files.image.name;
                                req.user_profile.save();

                                res.redirect('/me');

                            });
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
