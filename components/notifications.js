var async = require('async');
module.exports = function(webserver, db) {

  function renderMentions(text, cb) {
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
          next();
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
