var async = require('async');
module.exports = function(webserver, db) {



        function renderMentions(text, cb) {
          var matches = text.match(/\<\@(\w+)\>/igm);
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
                          text = text.replace(pattern, profile_link);
                          // console.log('RENDERED MENTION', text);
                      }
                      next();
                  });
              }, function() {

                  cb(text);
              })
          } else {
              cb(text);
          }
        }

  function notificationRoute(req, res) {
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

    db.notifications.find({user: req.user_profile._id}).populate('actor').populate({path: 'post', populate: { path: 'user'}}).populate({path: 'comment', populate: { path: 'user'}}).sort({date: -1}).limit(limit).skip(skip).exec(function(err, notifications) {
      async.each(notifications, function(n, next) {
        renderMentions(n.text, function(text) {
          n.text = text;
          if (n.post && n.post.text) {
              renderMentions(n.post.text, function(text) {
                  n.post.text = text;
                  if (n.comment && n.comment.text) {
                      renderMentions(n.comment.text, function(text) {
                          n.comment.text = text;
                          next();
                      });
                  } else {
                      next();
                  }
              })
          } else if (n.comment && n.comment.text) {
              renderMentions(n.comment.text, function(text) {
                  n.comment.text = text;
                  next();
              });
          } else {
              next();
          }
        })
      }, function() {
        res.json({
          ok: true,
          data: notifications,
        })
      });
    });
  }

  webserver.get('/get/notifications', function(req,res) {
    notificationRoute(req,res);
  })




}
