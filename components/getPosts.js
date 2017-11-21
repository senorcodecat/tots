var debug = require('debug')('tots:getPosts');

module.exports = function(webserver, db) {


  webserver.post('/get/liked', function(req, res) {
    if (req.user) {
      db.faves.find({user: req.user_profile._id, post: {$in: req.body.posts}}, function(err, faves) {
        res.json({
          ok: true,
          data: faves,
        });
      });
    } else {
      res.json({
        ok:true,
        data: []
      })
    }
  });


  webserver.get('/posts/public', function(req, res) {
      publicRoute(req, res);
  });

  webserver.get('/posts/feed', function(req, res) {
    if (req.user) {
        feedRoute(req, res);
    } else {
        publicRoute(req, res);
    }
  });

  webserver.get('/posts/search', function(req, res) {
        var query = req.query.query;
        var limit = 25;
        var page = 1;
        var skip = 0;
        if (req.query.page) {
            page = parseInt(req.query.page)
            if (page < 1) {
                page = 1;
            }
        }
        if (req.query.limit) {
          limit = parseInt(req.query.limit);
        }
        skip = (page - 1) * limit;
        // escape some chars
        query = query.replace(/(\#)/g,'\\$1');
        var pattern = new RegExp(query,'im');
        db.posts.find({text: {$regex: pattern}}).populate('user').populate({path: 'replyTo', populate: { path: 'user'}}).sort({date: -1}).limit(limit).skip(skip).exec(function(err, posts) {
          res.json({
            ok: true,
            data: posts,
          });
        });
  })

  webserver.get('/posts/post', function(req, res) {
      db.users.findOne({username: req.query.username}, function(err, user) {
          if (user) {
              db.posts.findOne({user: user._id, _id: req.query.post}).populate('user').populate({path: 'post', populate: { path: 'user'}}).exec(function(err, post) {
                if (post) {
                    res.json({
                        ok: true,
                        data: post,
                    })
                } else {
                    res.json({
                        ok: false
                    })
                }
              });
          } else {
              res.json({
                  ok: false
              });
          }
      });
      console.log(req.query);
  });

  webserver.get('/posts/comments', function(req, res) {
      db.posts.findOne({_id: req.query.post}).populate('user').exec(function(err, post) {
        if (post) {
            db.comments.find({replyTo: post._id}).populate('user').exec(function(err, comments) {
                res.json({
                    ok: true,
                    data: comments,
                })
            });
        } else {
            res.json({
                ok: false
            })
        }
      });
      console.log(req.query);
  });
  webserver.get('/posts/user', function(req, res) {

    var limit = 25;
    var page = parseInt(req.query.page) || 1;
    if (page < 1) {
        page = 1;
    }
    if (req.query.limit) {
      limit = parseInt(req.query.limit);
    }

    var skip = (page - 1) * limit;
    db.users.findOne({username: req.query.username}, function(err, user_profile) {
        if (err || !user_profile) {
            return res.json({
              ok: false,
              error: 'user_not_found',
            })
        }

        checkFollowing(req.user_profile, user_profile, function(following, followback) {
            db.posts.find({user: user_profile._id}).populate('user').populate({path: 'post', populate: { path: 'user'}}).sort({date: -1}).limit(limit).skip(skip).exec(function(err, posts) {
              res.json({
                ok: true,
                data: {
                  posts,
                  profile: user_profile,
                  following: following,
                  followback: followback
                }
              });
            });
        });
    });
  });

  webserver.get('/posts/user/faves', function(req, res) {

    var limit = 25;
    var page = parseInt(req.query.page) || 1;
    if (page < 1) {
        page = 1;
    }
    if (req.query.limit) {
      limit = parseInt(req.query.limit);
    }

    var skip = (page - 1) * limit;
    db.users.findOne({username: req.query.username}, function(err, user_profile) {
        if (err || !user_profile) {
            return res.json({
              ok: false,
              error: 'user_not_found',
            })
        }

        checkFollowing(req.user_profile, user_profile, function(following, followback) {
          db.faves.find({user: user_profile._id}).populate({path: 'post', populate: [{ path: 'user'},{path:'replyTo',populate:'user'}]}).sort({date: -1}).limit(limit).skip(skip).exec(function(err, faves) {
              var posts = [];
              for (var p = 0; p < faves.length; p++) {
                  posts.push(faves[p].post);
              }
              res.json({
                ok: true,
                data: {
                  posts,
                  profile: user_profile,
                  following: following,
                  followback: followback
                }
              });
            });
        });
    });
  });


  function checkFollowing(current_user, profile_user, cb) {

          if (!current_user) {
              cb(false,false);
          } else {
              db.follow.findOne({user: current_user._id, following: profile_user._id}, function(err, following) {
                  db.follow.findOne({user: profile_user._id, following: current_user._id}, function(err, followback) {
                      if (following) {
                          following = true;
                      } else {
                          following = false;
                      }
                      if (followback) {
                          followback = true;
                      } else {
                          followback = false;
                      }

                      cb(following,followback);
                  });
              });
          }
  }
  //
  // app.get('/@:username/following/:page?', function(req, res, next) {
  //     res.send('coming soon?');
  // });
  //
  // app.get('/@:username/followers/:page?', function(req, res, next) {
  //     res.send('coming soon?');
  // });
  //
  // app.get('/@:username/faves/:page?', function(req, res, next) {
  //     var limit = 25;
  //     var page = parseInt(req.params.page) || 1;
  //     if (page < 1) {
  //         page = 1;
  //     }
  //     var skip = (page - 1) * limit;
  //     db.users.findOne({username: req.params.username}, function(err, user_profile) {
  //         if (err || !user_profile) {
  //             return res.send('User not found');
  //         }
  //
  //         checkFollowing(req.user_profile, user_profile, function(following, followback) {
  //             db.faves.find({user: user_profile._id}).populate({path: 'post', populate: { path: 'user'}}).sort({date: -1}).limit(limit).skip(skip).exec(function(err, faves) {
  //                 var posts = [];
  //                 for (var p = 0; p < faves.length; p++) {
  //                     posts.push(faves[p].post);
  //                 }
  //                 res.render('faves', {
  //                   posts: posts,
  //                   profile: user_profile,
  //                   following: following,
  //                   followback: followback,
  //                   layout: 'layouts/default',
  //                   page: page,
  //                   next: page+1,
  //                   previous: (page > 1) ? page-1 : null,
  //                 });
  //             });
  //         });
  //     });
  //
  // });

  //
  // app.get('/@:username/:page?', function(req, res, next) {
  //     var limit = 25;
  //     var page = parseInt(req.params.page) || 1;
  //     if (page < 1) {
  //         page = 1;
  //     }
  //     var skip = (page - 1) * limit;
  //     db.users.findOne({username: req.params.username}, function(err, user_profile) {
  //         if (err || !user_profile) {
  //             return res.send('User not found');
  //         }
  //
  //         checkFollowing(req.user_profile, user_profile, function(following, followback) {
  //             db.posts.find({user: user_profile._id}).populate('user').sort({date: -1}).limit(limit).skip(skip).exec(function(err, posts) {
  //                 res.render('user', {
  //                   posts: posts,
  //                   profile: user_profile,
  //                   following: following,
  //                   followback: followback,
  //                   layout: 'layouts/default',
  //                   page: page,
  //                   next: page+1,
  //                   previous: (page > 1) ? page-1 : null,
  //                 });
  //             });
  //         });
  //     });
  //
  // });





  function feedRoute(req, res) {

        var limit = 25;
        var page = 1;
        var skip = 0;
        if (req.query.page) {
            page = parseInt(req.query.page)
            if (page < 1) {
                page = 1;
            }
        }
        if (req.query.limit) {
          limit = parseInt(req.query.limit);
        }

        skip = (page - 1) * limit;

        db.follow.find({user: req.user_profile._id}, function(err, following) {
            var following = following.map(function(f) { return f.following; });
            following.push(req.user_profile._id);
            db.posts.find({user: {$in: following}}).populate('user').populate({path: 'replyTo', populate: { path: 'user'}}).sort({date: -1}).limit(limit).skip(skip).exec(function(err, posts) {
              res.json({
                ok: true,
                data: posts,
              });
            });
        });

  }

  function publicRoute(req, res) {

    var limit = 25;
    var page = 1;
    var skip = 0;
    if (req.query.page) {
        page = parseInt(req.query.page)
        if (page < 1) {
            page = 1;
        }
    }
    if (req.query.limit) {
      limit = parseInt(req.query.limit);
    }

    skip = (page - 1) * limit;

    db.posts.find({}).populate('user').populate({path: 'replyTo', populate: { path: 'user'}}).sort({date: -1}).limit(limit).skip(skip).exec(function(err, posts) {
      res.json({
        ok: true,
        data: posts,
      });
    });

  }


}
