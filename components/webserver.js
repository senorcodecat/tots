var hbs = require('hbs');


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

module.exports = function(db) {

    hbs.registerHelper('dateFormat', require('handlebars-dateformat'));
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

    if (process.env.username && process.env.password) {
        var users = {};
        users[process.env.username] = process.env.password;
        app.use(basicAuth({
            users: users,
            challenge: true,
        }))
    }

    app.use(session({
        secret: 'ilovetots',
        store: new MongoStore({ mongooseConnection: db._db })
    }));

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
      res.locals.loggedin = false;
      if (req.session.passport && typeof req.session.passport.user != 'undefined') {
        res.locals.loggedin = true;
        res.locals.user = req.user;
      }

      if (req.user) {
          db.users.findOne({user_id: req.user._json.sub}, function(err, user) {
              if (err) {
                  debug(err);
              } else if (!user) {
                  user = new db.users();
                  user.username = req.user.displayName;
                  user.displayName = req.user.displayName;
                  user.user_id = req.user._json.sub;
              }

              user.lastAuth = new Date();
              user.save(function(err) {
                  req.user_profile = user;
                  res.locals.user_profile = user;
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
        res.redirect(req.session.returnTo || '/me');
      }
    );


    app.listen(3000, () => debug('Example app listening on port 3000!'))

    return app;

}
