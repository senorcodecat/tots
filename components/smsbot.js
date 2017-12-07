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
        // NOTE: we should enforce the token check here

        // respond to Slack that the webhook has been received.
        res.status(200);

        // Now, pass the webhook into be processed
        controller.handleWebhookPayload(req, res, controller.spawn({}));

    });


    controller.middleware.receive.use(function(bot, message, next) {
      console.log('RECEIVED', message);
      next();
    })


    controller.middleware.format.use(function(bot, message, platform_message, next) {
      console.log('SENDING', platform_message);
      next();
    })


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

        db.createPost(convo.vars.post_text, convo.vars.tots_user._id).then(function(post) {
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
