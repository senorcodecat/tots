var Botkit = require('botkit');

module.exports = function(webserver, db) {

    if (!process.env.TWILIO_ACCOUNT_SID) {
        console.log('***** SMS FUNCTIONALITY DISABLED *******');
        return {}
    }

    var bot_options = {
        account_sid: process.env.TWILIO_ACCOUNT_SID,
        auth_token: process.env.TWILIO_AUTH_TOKEN,
        twilio_number: process.env.TWILIO_NUMBER,
        studio_token: process.env.studio_token,
    };

    var controller = Botkit.twiliosmsbot(bot_options);
    controller.startTicking();

    webserver.post('/sms/receive', function(req, res) {

        console.log('GOT A POST TO SMS RECEIVE', req.body);

        res.status(200);
	       res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
        // Now, pass the webhook into be processed
        controller.handleWebhookPayload(req, res, controller.spawn({}));

    });


    controller.middleware.receive.use(function(bot, message, next) {
      console.log('RECEIVED', message);
      next();
    })

    controller.middleware.categorize.use(function(bot, message, next) {
      if (message.NumMedia && parseInt(message.NumMedia) > 0) {
        message.type = 'picture';
      }
      next();
    })

    controller.middleware.format.use(function(bot, message, platform_message, next) {
      console.log('SENDING', platform_message);
      next();
    })

    controller.on('picture', function(bot, message) {
      // TODO: Handle multiple uploads?
      // for now, just one

      var number = message.user;
      number = number.replace(/^\+\d/,'');

      db.users.findOne({
        phonenumber: number,
        phonenumber_verified: true,
      }, function(err, user) {

        if (user) {
          // bot.reply(message,'GOT IT.');
          controller.studio.get(bot, 'post', message.user, message.channel, message).then(function(convo) {

            convo.setVar('tots_user', user);
            convo.setVar('post_text', message.text);
            convo.setVar('post_url', message.MediaUrl0);
            convo.setVar('post_content_type', message.MediaContentType0);

            if (message.text) {
              // straight to confirmation
              convo.gotoThread('post_picture_confirm');
            } else {
              // ask if text should be added
              convo.gotoThread('post_picture');
            }
            convo.activate();

          });
        } else {
            controller.studio.run(bot, 'login', message.user, message.channel, message).then(function(convo) {
            });
        }

      })


    });


    controller.hears(['.*'],'message_received', function(bot, message) {

      var number = message.user;
      number = number.replace(/^\+\d/,'');

      db.users.findOne({
        phonenumber: number,
        phonenumber_verified: true,
      }, function(err, user) {

        if (user) {
          // bot.reply(message,'GOT IT.');
          controller.studio.get(bot, 'post', message.user, message.channel, message).then(function(convo) {

            convo.setVar('tots_user', user);
            convo.setVar('post_text', message.text);
            convo.activate();

          });
        } else {
            controller.studio.run(bot, 'login', message.user, message.channel, message).then(function(convo) {
            });
        }

      })
    })


    controller.studio.beforeThread('post','posted', function(convo, next) {
        var makepost;
        if (convo.vars.post_text) {
           makepost = db.createPost(convo.vars.post_text, convo.vars.tots_user._id);
        } else {
            var text = '';
           if (convo.vars.post_text) {
             text = convo.vars.post_text;
           } else {
             text = convo.extractResponse('text');
           }
           makepost = db.createPicturePost(convo.vars.post_url, convo.vars.post_content_type, text, convo.vars.tots_user._id);
        }
        makepost.then(function(post) {
            var url = 'http://tots.cool/@' + convo.vars.tots_user.username + '/tots/' + post._id;
            convo.setVar('post_url', url);
            next();

        }).catch(function(err) {
            convo.setVar('error',err);
            convo.gotoThread('error');
            next();
        })

    })

    return controller;
}
