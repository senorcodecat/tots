require('dotenv').config()

var db = require('./components/db.js')();
var app = require('./components/webserver.js')(db);
var actions = require('./components/actions.js')(app,db);
var debug = require('debug')('tots:main');

// Get the user profile
app.get('/', function(req, res, next) {
    var skip = 0;
    var limit = 25;
    db.posts.find({}).populate('user').sort({date: -1}).limit(limit).skip(skip).exec(function(err, posts) {
        res.render('home', {
          posts: posts,
          next: 2,
          layout: 'layouts/default',
        });
    });

});

app.get('/page/:page', function(req, res, next) {
    var limit = 25;
    var page = parseInt(req.params.page)
    if (page < 1) {
        page = 1;
    }
    var skip = (page - 1) * limit;
    db.posts.find({}).populate('user').sort({date: -1}).limit(limit).skip(skip).exec(function(err, posts) {
        if (err) {
            debug(err);
        }
        res.render('home', {
          posts: posts,
          page: page,
          next: page+1,
          previous: (page > 1) ? page-1 : null,
          layout: 'layouts/default',
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

        db.posts.find({user: user_profile._id}).populate('user').sort({date: -1}).limit(limit).skip(skip).exec(function(err, posts) {
            res.render('user', {
              posts: posts,
              profile: user_profile,
              layout: 'layouts/default',
              page: page,
              next: page+1,
              previous: (page > 1) ? page-1 : null,
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
