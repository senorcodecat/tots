var Botkit = require('botkit');

module.exports = function(webserver, db) {


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
        phone_verified: true,
      }, function(err, user) {

        if (user) {
          bot.reply(message,'GOT IT.');
        } else {
          bot.reply(message,'WHO ARE YOU?');
        }

      })
    })

    return controller;
}
