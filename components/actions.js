var debug = require('debug')('tots:actions');
module.exports = function(webserver, db) {


    webserver.post('/actions/post', function(req, res) {

        if (req.user && req.body.text && req.body.text != '') {
            var post = new db.posts();
            post.text = req.body.text;
            post.user = req.user_profile._id;
            post.save();
            debug('NEW POST',post);
            res.redirect('/me');
        } else {
            res.redirect('/login');
        }

    });

    webserver.post('/actions/editprofile', function(req, res) {

      if (req.user_profile) {
        db.users.count({username: req.body.username, _id: {$ne: req.user_profile._id}}, function(err, existing) {
          if (existing == 0) {
             req.user_profile.username = req.body.username;
          }
          req.user_profile.displayName = req.body.displayName;
          req.user_profile.bio = req.body.bio;
          req.user_profile.save();
          res.redirect('/me');
        });
      } else {
          res.redirect('/login');
      }


    })


    webserver.get('/actions/follow/:uid', function(req, res) {
        console.log(req.params);
        if (req.user) {
            db.follow.findOne({user: req.user_profile._id, following: req.params.uid}, function(err, follow) {
                if (!follow) {
                    console.log('q',{_id: req.params.uid});
                    db.users.findOne({_id: req.params.uid}, function(err, followee) {
                        if (followee) {
                            if (String(followee._id) != String(req.user_profile._id)) {
                                follow = new db.follow();
                                console.log('CREATING NEW REC');
                                follow.user = req.user_profile._id;
                                follow.following = followee._id;
                                follow.save();
                                res.json({ok: true});

                                var notification = new db.notifications();
                                notification.user = followee._id;
                                notification.actor = req.user_profile._id;
                                notification.type = 'follow';
                                notification.text = '<@' + req.user_profile._id + '> followed you';
                                notification.save();
                            } else {
                                res.json({ok: true, same_user: true});
                            }
                        } else if (err) {
                            res.json({ok: false, error: err});
                        } else {
                            res.json({ok: false, error: 'user_not_found'});
                        }
                    });
                } else {
                    res.json({ok: true, exists: true});
                }

            });

        } else {
            res.json({ok: false, error: 'auth_required'});
        }
    });


    webserver.get('/actions/unfollow/:uid', function(req, res) {
        console.log(req.params);
        if (req.user) {
            db.follow.remove({user: req.user_profile._id, following: req.params.uid}, function(err, follow) {
                res.json({ok: true});
            });
        } else {
            res.json({ok: false, error: 'auth_required'});
        }
    });



        webserver.get('/actions/fave/:pid', function(req, res) {
            if (req.user) {
                db.faves.findOne({user: req.user_profile._id, post: req.params.pid}, function(err, fave) {
                    if (!fave) {
                        db.posts.findOne({_id: req.params.pid}, function(err, post) {
                            if (post) {
                                fave = new db.faves();
                                fave.user = req.user_profile._id;
                                fave.post = post._id;
                                fave.save();
                                res.json({ok: true});

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
                                res.json({ok: false, error: err});
                            } else {
                                res.json({ok: false, error: 'post_not_found'});
                            }
                        });
                    } else {
                        res.json({ok: true, exists: true});
                    }
                });
            } else {
                res.json({ok: false, error: 'auth_required'});
            }
        });


        webserver.get('/actions/unfave/:pid', function(req, res) {
            console.log(req.params);
            if (req.user) {
                db.follow.remove({user: req.user_profile._id, following: req.params.uid}, function(err, follow) {
                    res.json({ok: true});
                });
            } else {
                res.json({ok: false, error: 'auth_required'});
            }
        });




}
