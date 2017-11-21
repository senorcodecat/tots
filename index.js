require('dotenv').config()

var db = require('./components/db.js')();
var app = require('./components/webserver.js')(db);
var actions = require('./components/actions.js')(app,db);
var getPosts = require('./components/getPosts.js')(app,db);
var notifications = require('./components/notifications.js')(app,db);

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
