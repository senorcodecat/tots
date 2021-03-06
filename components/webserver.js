var hbs = require('hbs');
var request = require('request');
var http = require('http');
var express = require('express');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

var basicAuth = require('express-basic-auth')
var bodyParser = require('body-parser')
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var cookieParser = require('cookie-parser');
var passport = require('passport');
var Auth0Strategy = require('passport-auth0');
var debug = require('debug')('tots:webserver');
var fileUpload = require('express-fileupload');

module.exports = function(db) {

    hbs.registerHelper('dateFormat', require('handlebars-dateformat'));

    hbs.registerHelper('renderEntities', function(text) {
        text = text.replace(/(\W)\#(.*?)(\W)/ig,'$1<a href="/search?query=%23$2">#$2</a>$3');
        text = text.replace(/\n/g,'<br/>\n');
        return text;
    })

    hbs.registerAsyncHelper('renderUsers', function(text, options, cb) {
        var users = text.match('<@(.*?)>','gm');
        if (users) {
            var uid = users[1];
            db.users.findOne({_id: uid}, function(err, user) {
                var profile_link = '<a href="/@' + user.username + '">' + user.displayName + '</a>';
                var pattern = new RegExp('<@' + uid + '>','g');
                text = text.replace(pattern, profile_link);
                cb(text);
            });
        } else {
            cb(text);
        }
    });


    hbs.registerPartials(__dirname + '/../views/partials');
    // Configure Passport to use Auth0
    const strategy = new Auth0Strategy(
       process.env,
      (accessToken, refreshToken, extraParams, profile, done) => {
        return done(null, profile);
      }
    );

    passport.use(strategy);

    // This can be used to keep a smaller payload
    passport.serializeUser(function(user, done) {
      done(null, user);
    });

    passport.deserializeUser(function(user, done) {
      done(null, user);
    });

    var app = express()
    hbs.localsAsTemplateData(app);
    app.use(express.static('public'))

    app.use(fileUpload());

    if (process.env.username && process.env.password) {
        var users = {};
        users[process.env.username] = process.env.password;
        app.use(basicAuth({
            users: users,
            challenge: true,
        }))
    }

    var store = new MongoStore({ mongooseConnection: db._db });
    var sess = session({
        secret: 'ilovetots',
        "cookie": {
          "maxAge": 2592000000,
        },
        store: store,
    })
    app.use(sess);

    app.use(passport.initialize());
    app.use(passport.session());


    hbs.localsAsTemplateData(app);

    // use handlebars
    app.set('view engine', 'hbs');

    // parse application/x-www-form-urlencoded
    app.use(bodyParser.urlencoded({ extended: false }))
    app.use(cookieParser());

    // parse application/json
    app.use(bodyParser.json())

    // Check logged in
    app.use(function(req, res, next) {

      // console.log('MIDDLEWARE', req.originalUrl);

      res.locals.loggedin = false;
      res.locals.thisurl = req.protocol + '://' + req.get('host') + req.originalUrl;

      if (req.session.passport && typeof req.session.passport.user != 'undefined') {
        res.locals.loggedin = true;
        res.locals.user = req.user;
      }

      if (req.user) {
          db.users.findOne({user_id: req.user._json.sub}, function(err, user) {
              if (err) {
                  debug(err);
              } else if (!user) {
                  // user = new db.users();
                  // user.username = req.user.displayName;
                  // user.displayName = req.user.displayName;
                  // user.user_id = req.user._json.sub;
                  // user.avatar_url = req.user.picture || null;
                  //
                  // // remove any spaces or non word chars from username
                  // user.username = user.username.replace(/\W/g,'');

                  // console.log('HEY LETS MAKE SURE THIS IS OK', req.url);

                  if (!req.url.match(/signup/) && !req.url.match(/logout/)) {
                      return res.redirect('/signup');
                  } else {
                      return next();
                  }
              }


              user.lastAuth = new Date();
              user.save(function(err) {
                  req.user_profile = user;
                  res.locals.user_profile = user;

                  res.locals.payload = JSON.stringify({
                    user_profile: res.locals.user_profile,
                  });

                  next();
              });
          });
      } else {
          next();
      }
    });

    app.get(
      '/login',
      passport.authenticate('auth0', {
        clientID: process.env.clientID,
        domain: process.env.domain,
        redirectUri: process.env.callbackURL,
        audience: 'https://' + process.env.domain + '/userinfo',
        responseType: 'code',
        scope: 'openid profile'
      }),
      function(req, res) {
      }
    );

    // Perform session logout and redirect to homepage
    app.get('/logout', (req, res) => {
      req.logout();
      res.redirect('/');
    });

    // Perform the final stage of authentication and redirect to '/user'
    app.get(
      '/auth0/callback',
      passport.authenticate('auth0', {
        failureRedirect: '/'
      }),
      function(req, res) {
        res.redirect(req.session.returnTo || '/feed');
      }
    );


    var server = http.createServer(app);

    server.listen(process.env.PORT || 3000, null, function() {

        debug('Express webserver configured and listening at http://localhost:' + process.env.PORT || 3000);

    });

    app.server = server;
    app.store = store;
    app._session = sess;


    function keepalive() {

      request({
        url: 'http://' + process.env.PROJECT_DOMAIN + '.glitch.me',
      }, function(err) {

        setTimeout(function() {
          keepalive();
        }, 55000);

      });

    }

    // if this is running on Glitch
    if (process.env.PROJECT_DOMAIN) {

      // make a web call to self every 55 seconds
      // in order to avoid the process being put to sleep.
      keepalive();

    }

    return app;

}
