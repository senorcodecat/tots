var WebSocket = require('ws');
var cookie = require('cookie');
var EventEmitter = require('events');


module.exports = function(webserver, db) {

    var broadcast = new EventEmitter();

    broadcast.channels = {};

    broadcast.on('message', function(message, ws) {
        console.log('RCVD:', message,'user',ws.user.displayName);
        // broadcast this back out to all the other people in this channel
        var clients = broadcast.channels[ws.channel];
        for (var c = 0; c < clients.length; c++) {
            if (ws.guid != clients[c].guid) {
                message.user = ws.user;
                try {
                    clients[c].send(JSON.stringify(message));
                } catch(err) {
                    console.log('Should remove client!',c);
                }
            }
        }
    });

    broadcast.on('hello', function(message, ws) {
        console.log('hello:', message);
        if (!broadcast.channels[message.channel]) {
            broadcast.channels[message.channel] = [];
        }

        ws.channel = message.channel;

        broadcast.channels[message.channel].push(ws);

    });

    broadcast.on('welcome_back', function(message, ws) {
        console.log('welcome_back:', message);

        if (!broadcast.channels[message.channel]) {
            broadcast.channels[message.channel] = [];
        }

        ws.channel = message.channel;

        broadcast.channels[message.channel].push(ws);

    });


    var server = webserver.server;
    // create the socket server along side the existing webserver.
    var wss = new WebSocket.Server({
        server,
        verifyClient: (info, done) => {
          // console.log('Parsing session from request...');
          webserver._session(info.req, {}, () => {
            // console.log('Session is parsed!');

            // console.log(info.req.session);
            //
            // We can reject the connection by returning false to done(). For example,
            // reject here if user is unknown.
            //
            done(info.req.session.passport.user);
          });
},
    });

    function heartbeat() {
        // this.isAlive = true;
    }

    wss.on('connection', function connection(ws, req) {
        ws.isAlive = true;

        ws.on('pong', heartbeat);
        // search through all the convos, if a bot matches, update its ws

        // var cookies = cookie.parse(req.headers.cookie);
        // console.log('cookies', cookies);
        // var sessionID = cookies['connect.sid'];
        // console.log(sessionID);
        // webserver.store.get(sessionID, function(err, sess) {
        //     console.log('SESSION',err,sess);
        // });

        ws.user = req.session.passport.user;
        ws.guid = guid();

        // console.log('GOT A NEW WEBSOCKET CONNECT', req.session.passport);
        ws.on('message', function incoming(message) {

            var message = JSON.parse(message);
            console.log('RECEIVED', message);
            // controller.ingest(bot, message, ws);
            broadcast.emit(message.type, message, ws);

        });

        ws.on('close', function(err) {
            console.log('CLOSED', err);
            // bot.connected = false;
        });

    });

    var interval = setInterval(function ping() {
        wss.clients.forEach(function each(ws) {
            if (ws.isAlive === false) {
                return ws.terminate();
            }
            //  if (ws.isAlive === false) return ws.terminate()
            ws.isAlive = false;
            ws.ping('', false, true);
        });
    }, 30000);

    function guid() {
      function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
          .toString(16)
          .substring(1);
      }
      return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
    }

}
