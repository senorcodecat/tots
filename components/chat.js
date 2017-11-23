var WebSocket = require('ws');
var cookie = require('cookie');
module.exports = function(webserver, db) {


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

        console.log()

        // var cookies = cookie.parse(req.headers.cookie);
        // console.log('cookies', cookies);
        // var sessionID = cookies['connect.sid'];
        // console.log(sessionID);
        // webserver.store.get(sessionID, function(err, sess) {
        //     console.log('SESSION',err,sess);
        // });


        console.log('GOT A NEW WEBSOCKET CONNECT', req.session.passport);
        ws.on('message', function incoming(message) {

            var message = JSON.parse(message);
            console.log('RECEIVED', message);
            // controller.ingest(bot, message, ws);

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



}
