var debug = require('debug')('tots:signup');

var invite_only = true;


module.exports = function(webserver, db, botkit) {

  webserver.get('/signup', function(req, res) {
    if (!req.user) {
      // isn't authed with auth0
      res.redirect('/login');
    } else if (req.user_profile) {
      // is already fully logged in
      res.redirect('/feed');
    } else {


      if (invite_only) {

        if (!req.cookies.accept_invite) {

          res.render('invite_only', {
            layout: 'layouts/anon',
            user: req.user,
            payload: JSON.stringify(req.user),
          });

        } else {
          db.invites.find({
            _id: req.cookies.accept_invite,
            valid: true
          }).populate('user').exec(function(err, invite) {

            if (invite.length) {
              res.render('invite_signup', {
                layout: 'layouts/anon',
                invite: invite[0],
                user: req.user,
                payload: JSON.stringify(req.user),
              });
            } else {
              // TODO: logout cookies
              res.render('invite_expired_signup', {
                layout: 'layouts/anon',
                user: req.user,
                payload: JSON.stringify(req.user),
              });
            }

          });

        }


      } else {

        res.render('signup', {
          layout: 'layouts/anon',
          user: req.user,
          payload: JSON.stringify(req.user),
        });

      }
    }
  });

  webserver.post('/signup', function(req, res) {
    if (req.user && !req.user_profile) {

      if (invite_only) {

        if (!req.cookies.accept_invite) {
          res.render('invite_only', {
            layout: 'layouts/anon',
            user: req.user,
            payload: JSON.stringify(req.user),
          });
        } else {

          db.invites.find({
            _id: req.cookies.accept_invite
          }).exec(function(err, invite) {

            if (!invite.length) {
              res.render('invite_only', {
                layout: 'layouts/anon',
                user: req.user,
                payload: JSON.stringify(req.user),
              });
            } else {

              invite = invite[0];

              db.users.findOne({
                user_id: req.user._json.sub
              }, function(err, user) {
                if (user) {
                  console.error('User already exists');
                  res.redirect('/login');
                } else {

                  db.users.count({
                    username: req.body.username,
                  }, function(err, existing) {

                    if (existing == 0) {

                      var user = new db.users();
                      user.username = req.body.username.replace(/\W/g, '');
                      user.displayName = req.body.displayName;
                      user.user_id = req.user._json.sub;
                      if (req.body.use_existing_avatar) {
                        user.avatar_url = req.user.picture || null;
                      }

                      user.invitedBy = invite.user;
                      user.save();

                      db.markInviteUsed(invite);

                      if (req.files && req.files.image) {
                        debug('Got a file upload', req.files.image);
                        db.acceptUpload(req.files.image, req.files.image.name, user._id, true, function(err, s3_file) {
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

            } // if invite exists
          });

        }
      }

    } else {
      res.redirect('/login');
    }
  });

}
