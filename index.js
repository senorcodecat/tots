require('dotenv').config()

var db = require('./components/db.js')();
var app = require('./components/webserver.js')(db);
var actions = require('./components/actions.js')(app,db);
var debug = require('debug')('tots:main');

// Get the user profile
app.get('/', function(req, res, next) {

    if (req.user) {
        feedRoute(req, res);
    } else {
        publicRoute(req, res);
    }

});


feedRoute = function(req, res) {
    var limit = 25;
    var page = 1;
    var skip = 0;
    if (req.params.page) {
        page = parseInt(req.params.page)
        if (page < 1) {
            page = 1;
        }
    }
    skip = (page - 1) * limit;

    db.follow.find({user: req.user_profile._id}, function(err, following) {
        var following = following.map(function(f) { return f.following; });
        following.push(req.user_profile._id);
        db.posts.find({user: {$in: following}}).populate('user').sort({date: -1}).limit(limit).skip(skip).exec(function(err, posts) {
            res.render('home', {
              posts: posts,
              page: page,
              next: page+1,
              previous: (page > 1) ? page-1 : null,
              layout: 'layouts/default',
            });
        });
    });
}

publicRoute = function(req, res) {
    var limit = 25;
    var page = 1;
    var skip = 0;
    if (req.params.page) {
        page = parseInt(req.params.page)
        if (page < 1) {
            page = 1;
        }
    }
    skip = (page - 1) * limit;

    db.posts.find({}).populate('user').sort({date: -1}).limit(limit).skip(skip).exec(function(err, posts) {
        res.render('home', {
          posts: posts,
          page: page,
          next: page+1,
          previous: (page > 1) ? page-1 : null,
          layout: 'layouts/default',
        });
    });
}
app.get('/public', function(req, res, next) {
    publicRoute(req, res);
});

app.get('/page/:page', function(req, res, next) {
    publicRoute(req, res);
});

app.get('/notifications/:page?', function(req, res, next) {
    notificationRoute(req, res);
});

notificationRoute = function(req, res) {
    var limit = 25;
    var page = 1;
    var skip = 0;
    if (req.params.page) {
        page = parseInt(req.params.page)
        if (page < 1) {
            page = 1;
        }
    }
    skip = (page - 1) * limit;

    db.notifications.find({user: req.user_profile._id}).populate('actor').populate({path: 'post', populate: { path: 'user'}}).sort({date: -1}).limit(limit).skip(skip).exec(function(err, notifications) {
        res.render('notifications', {
          notifications: notifications,
          page: page,
          next: page+1,
          previous: (page > 1) ? page-1 : null,
          layout: 'layouts/default',
        });
    });
}



app.get('/search/:query?/:page?', function(req, res, next) {
    if (req.query.query) {
        res.redirect('/search/' + encodeURIComponent(req.query.query));
    } else {
        var query = req.params.query;
        searchRoute(req, res, query);
    }
});

searchRoute = function(req, res, query) {
    var limit = 25;
    var page = 1;
    var skip = 0;
    if (req.params.page) {
        page = parseInt(req.params.page)
        if (page < 1) {
            page = 1;
        }
    }
    skip = (page - 1) * limit;
    // escape some chars
    query = query.replace(/(\#)/g,'\\$1');
    var pattern = new RegExp(query,'im');
    db.posts.find({text: {$regex: pattern}}).populate('user').sort({date: -1}).limit(limit).skip(skip).exec(function(err, posts) {
        res.render('home', {
          posts: posts,
          page: page,
          next: page+1,
          previous: (page > 1) ? page-1 : null,
          layout: 'layouts/default',
        });
    });
}

function checkFollowing(current_user, profile_user, cb) {

        if (!current_user) {
            cb(false,false);
        } else {
            db.follow.findOne({user: current_user._id, following: profile_user._id}, function(err, following) {
                db.follow.findOne({user: profile_user._id, following: current_user._id}, function(err, followback) {
                    console.log(following,followback);
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
                    console.log(following,followback);

                    cb(following,followback);
                });
            });
        }
}

app.get('/@:username/following/:page?', function(req, res, next) {
    res.send('coming soon?');
});

app.get('/@:username/followers/:page?', function(req, res, next) {
    res.send('coming soon?');
});

app.get('/@:username/faves/:page?', function(req, res, next) {
    var limit = 25;
    var page = parseInt(req.params.page) || 1;
    if (page < 1) {
        page = 1;
    }
    var skip = (page - 1) * limit;
    db.users.findOne({username: req.params.username}, function(err, user_profile) {
        if (err || !user_profile) {
            return res.send('User not found');
        }

        checkFollowing(req.user_profile, user_profile, function(following, followback) {
            db.faves.find({user: user_profile._id}).populate({path: 'post', populate: { path: 'user'}}).sort({date: -1}).limit(limit).skip(skip).exec(function(err, faves) {
                var posts = [];
                for (var p = 0; p < faves.length; p++) {
                    posts.push(faves[p].post);
                }
                res.render('faves', {
                  posts: posts,
                  profile: user_profile,
                  following: following,
                  followback: followback,
                  layout: 'layouts/default',
                  page: page,
                  next: page+1,
                  previous: (page > 1) ? page-1 : null,
                });
            });
        });
    });

});


app.get('/@:username/:page?', function(req, res, next) {
    var limit = 25;
    var page = parseInt(req.params.page) || 1;
    if (page < 1) {
        page = 1;
    }
    var skip = (page - 1) * limit;
    db.users.findOne({username: req.params.username}, function(err, user_profile) {
        if (err || !user_profile) {
            return res.send('User not found');
        }

        checkFollowing(req.user_profile, user_profile, function(following, followback) {
            db.posts.find({user: user_profile._id}).populate('user').sort({date: -1}).limit(limit).skip(skip).exec(function(err, posts) {
                res.render('user', {
                  posts: posts,
                  profile: user_profile,
                  following: following,
                  followback: followback,
                  layout: 'layouts/default',
                  page: page,
                  next: page+1,
                  previous: (page > 1) ? page-1 : null,
                });
            });
        });
    });

});


// Get the user profile
app.get('/me', function(req, res, next) {
    if (!req.user) {
        return res.redirect('/login');
    }
    var skip = 0;
    var limit = 25;
    db.posts.find({user: req.user_profile._id}).populate('user').sort({date: -1}).limit(limit).skip(skip).exec(function(err, posts) {
        res.render('user', {
          posts: posts,
          profile: req.user_profile,
          layout: 'layouts/default',
        });
    });
});


// Get the user profile
app.get('/editprofile', function(req, res, next) {
    if (!req.user) {
        return res.redirect('/login');
    }
    res.render('editprofile', {
      profile: req.user_profile,
      layout: 'layouts/default',
    });
});
