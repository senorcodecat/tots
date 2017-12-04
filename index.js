require('dotenv').config()

var db = require('./components/db.js')();
var app = require('./components/webserver.js')(db);
var botkit = require('./components/smsbot.js')(app,db);
var actions = require('./components/actions.js')(app,db, botkit);
var getPosts = require('./components/getPosts.js')(app,db);
var notifications = require('./components/notifications.js')(app,db);
var signup = require('./components/signup.js')(app,db,botkit);

require('./components/chat.js')(app,db);

var debug = require('debug')('tots:main');

// Get the user profile
app.get('/', function(req, res, next) {
  res.render('home', {
    layout: 'layouts/default',
  });
});
app.get('/feed/:page?', function(req, res, next) {
  res.render('home', {
    layout: 'layouts/default',
  });
});
app.get('/public/:page?', function(req, res, next) {
  res.render('home', {
    layout: 'layouts/default',
  });
});
app.get('/notifications/:page?', function(req, res, next) {
  res.render('home', {
    layout: 'layouts/default',
  });
});

app.get('/search/:query?/:page?', function(req, res, next) {
  res.render('home', {
    layout: 'layouts/default',
  });
});

app.get('/@:username/:page?', function(req, res, next) {
  res.render('home', {
    layout: 'layouts/default',
  });
});
app.get('/@:username/faves/:page?', function(req, res, next) {
  res.render('home', {
    layout: 'layouts/default',
  });
});
app.get('/@:username/tots/:post?', function(req, res, next) {
    db.posts.findOne({_id: req.params.post}).populate('user').populate({path: 'replyTo', populate: { path: 'user'}}).exec(function(err, post) {
      res.render('home', {
        post: post,
        layout: 'layouts/default',
      });
  });
});
app.get('/@:username/tots/:post/edit', function(req, res, next) {
  res.render('home', {
    layout: 'layouts/default',
  });
});
app.get('/@:username/tots/:post/live', function(req, res, next) {
  res.render('home', {
    layout: 'layouts/default',
  });
});

app.get('/@:username/tots/:post/revisions', function(req, res, next) {
  res.render('home', {
    layout: 'layouts/default',
  });
});


// Get the user profile
app.get('/me', function(req, res, next) {
    if (!req.user) {
        return res.redirect('/login');
    } else {
      return res.redirect('/@' + req.user_profile.username);
    }
});


// Get the user profile
app.get('/editprofile', function(req, res, next) {
    if (!req.user) {
        return res.redirect('/login');
    } else {
      res.render('home', {
        layout: 'layouts/default',
      });
    }
});
