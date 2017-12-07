var debug = require('debug')('tots:getPosts');
var async = require('async');
module.exports = function(webserver, db) {


    function renderMentions(post, cb) {

      post.rendered_text = post.text;
      post.editable_text = post.text;
      var matches;
      if (post.text) {
        matches = post.text.match(/\<\@(\w+)\>/igm);
      }
      if (matches) {

          // remove dupes
          var users = matches.filter(function(item, pos) {
              return matches.indexOf(item) == pos;
          });
          users = users.map(function(u) {
                // get the meat of the mention <@(MEAT)>
              return u.substr(2).slice(0,-1);
          })
          // console.log('render mentions', users);


          async.each(users, function(uid, next) {
              db.users.findOne({_id: uid}, function(err, user) {
                  if (user) {
                      var profile_link = '<a href="/@' + user.username + '">@' + user.displayName + '</a>';
                      var pattern = new RegExp('<@' + uid + '>','g');
                      post.rendered_text = post.rendered_text.replace(pattern, profile_link);
                      // console.log('RENDERED MENTION', text);

                      var username_only = '@' + user.username;
                      pattern = new RegExp('<@' + uid + '>','g');

                      post.editable_text = post.editable_text.replace(pattern, username_only);

                  }
                  next();
              });
          }, function() {

              cb(post);
          })
      } else {
          cb(post);
      }
    }

    db.renderMentions = renderMentions;

    function preprocessPosts(posts, cb) {

        var processed = []
        async.each(posts, function(p, next) {
            p = p.toObject();
            renderMentions(p, function(p) {
                // p.text = text;
                processed.push(p);
                next();
            })
        }, function() {

            processed = processed.sort(function(a, b) {
                var a = new Date(a.date);
                var b = new Date(b.date);
                if (a.getTime() > b.getTime()) {
                    return -1;
                } else if (a.getTime() < b.getTime()) {
                    return 1;
                } else {
                    return 0;
                }
            });
            cb(processed);
        });

    }

    function preprocessComments(posts, cb) {

        var processed = []
        async.each(posts, function(p, next) {
            p = p.toObject();
            renderMentions(p, function(p) {
                // p.text = text;
                processed.push(p);
                next();
            })
        }, function() {

            processed = processed.sort(function(a, b) {
                var a = new Date(a.date);
                var b = new Date(b.date);
                if (a.getTime() > b.getTime()) {
                    return 1;
                } else if (a.getTime() < b.getTime()) {
                    return -1;
                } else {
                    return 0;
                }
            });
            cb(processed);
        });

    }

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

  webserver.get('/posts/feed/live', function(req, res) {

    if (!req.user) {
      return res.json([]);
    }

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
            db.posts.find({live: true, user: {$in: following}, deleted: {$ne: true}}).populate('user').populate({path: 'replyTo', populate: { path: 'user'}}).sort({date: -1}).limit(limit).skip(skip).exec(function(err, posts) {
                preprocessPosts(posts, function(posts) {
                  res.json({
                    ok: true,
                    data: posts,
                  });
                });
            });
        });

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
        db.posts.find({text: {$regex: pattern}, deleted: {$ne: true}}).populate('user').populate({path: 'replyTo', populate: { path: 'user'}}).sort({date: -1}).limit(limit).skip(skip).exec(function(err, posts) {
            preprocessPosts(posts, function(posts) {
          res.json({
            ok: true,
            data: posts,
          });
      });
        });
  })

  webserver.get('/get/people', function(req, res) {

      var q = req.query.q;
      // var pattern = new RegExp(q);

      db.users.find({$or:[
          {username: { $regex: q, $options: 'i'}},
          {displayName: { $regex: q, $options: 'i'}},
      ]}).sort({displayName:1}).limit(10).exec(function(err, users) {
            res.json(users || [])
      });

  })

  webserver.get('/posts/post', function(req, res) {
      db.users.findOne({username: req.query.username}, function(err, user) {
          if (user) {
              db.posts.findOne({user: user._id, _id: req.query.post, deleted: {$ne: true}}).populate('user').populate({path: 'replyTo', populate: { path: 'user'}}).exec(function(err, post) {
                if (post) {
                    preprocessPosts([post], function(posts) {
                    post = posts[0];
                    // post.rendered_text = post.text.replace(/<.*?>/g,'');
                    res.json({
                        ok: true,
                        data: post,
                    })
                });
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
  });

  webserver.get('/posts/revisions', function(req, res) {
      db.posts.findOne({_id: req.query.post, deleted: {$ne: true}}).exec(function(err, post) {
        if (post) {
            db.revisions.find({post: post._id}).exec(function(err, revisions) {
                preprocessPosts(revisions, function(revisions) {
                res.json({
                    ok: true,
                    data: revisions,
                })
            });
            });
        } else {
            res.json({
                ok: false
            })
        }
      });
  });

  webserver.get('/posts/comments', function(req, res) {
      db.posts.findOne({_id: req.query.post, deleted: {$ne: true}}).exec(function(err, post) {
        if (post) {
            db.comments.find({replyTo: post._id}).populate('user').exec(function(err, comments) {
                preprocessComments(comments, function(comments) {
                    res.json({
                        ok: true,
                        data: comments,
                    })
                });
            });
        } else {
            res.json({
                ok: false
            })
        }
      });
  });

  webserver.get('/user/followers', function(req, res) {

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

        db.follow.find({following:  user_profile._id}).populate('user').exec(function(err, following) {

            var users = following.map(function(f) { return f.user; });
            res.json({
                ok: true,
                data: {
                    posts: users, // weirdly has to be named posts
                    user_profile: user_profile,
                }
            })

        });
    });
  });


  webserver.get('/user/following', function(req, res) {

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


            db.follow.find({user: user_profile._id}).populate('following').exec(function(err, following) {

                var users = following.map(function(f) { return f.following; });
                res.json({
                    ok: true,
                    data: {
                        posts: users, // weirdly has to be named posts
                        user_profile: user_profile,
                    }
                })

            });
        });
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
            db.posts.find({user: user_profile._id, deleted: {$ne: true}}).populate('user').populate({path: 'replyTo', populate: { path: 'user'}}).sort({date: -1}).limit(limit).skip(skip).exec(function(err, posts) {

                preprocessPosts(posts, function(posts) {
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
                  if (!faves[p].post.deleted) {
                      posts.push(faves[p].post);
                  }
              }
              preprocessPosts(posts, function(posts) {
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
            db.posts.find({user: {$in: following}, deleted: {$ne: true}}).populate('user').populate({path: 'replyTo', populate: { path: 'user'}}).sort({date: -1}).limit(limit).skip(skip).exec(function(err, posts) {
                preprocessPosts(posts, function(posts) {
                  res.json({
                    ok: true,
                    data: posts,
                  });
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

    db.posts.find({ deleted: {$ne: true}}).populate('user').populate({path: 'replyTo', populate: { path: 'user'}}).sort({date: -1}).limit(limit).skip(skip).exec(function(err, posts) {
        preprocessPosts(posts, function(posts) {
          res.json({
            ok: true,
            data: posts,
          });
        });
    });

  }


}
