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

    webserver.post('/signup', function(req, res) {
      if (req.user && !req.user__profile) {


        db.users.findOne({user_id: req.user._json.sub}, function(err, user) {
          if (user) {
            console.error('User already exists');
            res.redirect('/login');
          } else {

            db.users.count({
                    username: req.body.username,
                }, function(err, existing) {

                  if (existing == 0) {

                    var user = new db.users();
                    user.username = req.body.username.replace(/\W/g,'');
                    user.displayName = req.body.displayName;
                    user.user_id = req.user._json.sub;
                    if (req.body.use_existing_avatar) {
                      user.avatar_url = req.user.picture || null;
                    }
                    user.save();

                    if (req.files && req.files.image) {
                        debug('Got a file upload', req.files.image);
                        db.acceptUpload(req.files.image, req.files.image.name, user._id, function(err, s3_file) {
                            if (err) {
                                console.error('Could not upload file to s3', err);
                                res.redirect('/feed');
                                // res.json({ok: false, error: err});
                            } else {
                                user.avatar_url = s3_file.url;
                                user.save();

                                res.redirect('/feed');
                            }
                        });
                    } else {
                        res.redirect('/feed');
                    }


                  } else {
                    console.error('Username already exists');
                    res.redirect('/signup?error=username+exists');
                  }
                });
            }
          });

      } else {
        res.redirect('/login');
      }
    });

}
