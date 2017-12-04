var debug = require('debug')('tots:signup');
module.exports = function(webserver, db, botkit) {

    webserver.get('/signup', function(req, res) {
        if (!req.user) {
            // isn't authed with auth0
            res.redirect('/login');
        } else if (req.user_profile) {
            // is already fully logged in
            res.redirect('/me');
        } else {
            res.render('signup', {
              layout: 'layouts/anon',
              user: req.user,
              payload: JSON.stringify(req.user),
            });
        }
    });

}
