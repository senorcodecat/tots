var WebSocket = require('ws');
var cookie = require('cookie');
var EventEmitter = require('events');


module.exports = function(webserver, db) {

    var broadcast = new EventEmitter();

    broadcast.channels = {};

    broadcast.on('closed', function(ws) {
        var clients = broadcast.channels[ws.channel];
        if (clients && clients.length) {
            for (var c = 0; c < clients.length; c++) {
                if (clients[c].guid == ws.guid) {
                    // console.log('Client disconnected');
                    // remove this one
                    broadcast.channels[ws.channel].splice(c,1);

                    broadcast.emit('broadcast',{
                        text: ws.user.displayName + ' left',
                        channel: ws.channel,
                        user: ws.user,
                        type: 'channel_leave',
                    }, ws)

                }
            }
        }
    });

    broadcast.on('broadcast', function(message, ws) {
        // console.log('time to broadcast', message);
        // broadcast this back out to all the other people in this channel
        var clients = broadcast.channels[ws.channel];
        if (!clients || !clients.length) {
            console.error('message to empty room');
        }

        message.user = ws.user;

        db.renderMentions(message, function(message) {
            for (var c = 0; c < clients.length; c++) {
                if (ws.guid != clients[c].guid) {
                    var success = true;
                    try {
                        // console.log('SEND', JSON.stringify(message));
                        clients[c].send(JSON.stringify(message));
                    } catch(err) {
    //                    console.log('Should remove client!',c);
                        // return;
                        clients[c].dead = true;
                        success = false;
                    }
                }
            }
        });
    })

    broadcast.on('message', function(message, ws) {
        // console.log('RCVD:', message,'user',ws.user.displayName);
        if (ws.user) {
            saveComment(message, ws, function(comment) {
                // update with new mention stuff
                message.text = comment.text;
                message.date = comment.date;
                broadcast.emit('broadcast', message, ws);
            });
        }

    });

    broadcast.on('hello', function(message, ws) {
        // console.log('hello:', message);
        if (!broadcast.channels[message.channel]) {
            broadcast.channels[message.channel] = [];
        }

        ws.channel = message.channel;

        broadcast.channels[message.channel].push(ws);

        broadcast.emit('broadcast',{
            text: ws.user.displayName + ' joined the chat',
            channel: message.channel,
            user: message.user,
            type: 'channel_join',
        }, ws)

        var fullroster = broadcast.channels[message.channel].map(function(client) {
            if (!client.dead) {
                return {
                    displayName: client.user.displayName,
                    username: client.user.username,
                    id: client.user._id,
                    _id: client.user._id,
                    avatar_url: client.user.avatar_url,
                }
            }
        });


        // this seems gross!
        var temp = {};
        var roster = [];
        for (var f = 0; f < fullroster.length; f++) {
            temp[fullroster[f].id] = fullroster[f];
        }

        for (var r in temp) {
            roster.push(temp[r]);
        }

        try {
            ws.send(JSON.stringify({
                type: 'roster',
                roster: roster,
            }))
        } catch(err) {
            console.error('Error sending roster', err);
        }


    });

    broadcast.on('welcome_back', function(message, ws) {
        // console.log('welcome_back:', message);

        if (!broadcast.channels[message.channel]) {
            broadcast.channels[message.channel] = [];
        }

        ws.channel = message.channel;

        broadcast.channels[message.channel].push(ws);

        broadcast.emit('broadcast',{
            text: ws.user.displayName + ' joined the chat',
            channel: message.channel,
            user: message.user,
            type: 'channel_join',
        }, ws)

        var fullroster = broadcast.channels[message.channel].map(function(client) {
            if (!client.dead) {
                return {
                    displayName: client.user.displayName,
                    username: client.user.username,
                    id: client.user._id,
                    _id: client.user._id,
                    avatar_url: client.user.avatar_url,
                }
            }
        });

        // this seems gross!
        var temp = {};
        var roster = [];
        for (var f = 0; f < fullroster.length; f++) {
            temp[fullroster[f].id] = fullroster[f];
        }

        for (var r in temp) {
            roster.push(temp[r]);
        }

        try {
            ws.send(JSON.stringify({
                type: 'roster',
                roster: roster,
            }));
        } catch(err) {
            console.error('Error sending roster', err);
        }
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

            if (info.req.session && info.req.session.passport && info.req.session.passport.user) {
              db.users.findOne({user_id: info.req.session.passport.user._json.sub}, function(err, user) {
                  console.log('SET USER');
                  info.req.user_profile = user;
                  done(info.req.user_profile);
              });
            } else {
              done();
            }
          });
},
    });

    function heartbeat() {
        // this.isAlive = true;
    }

    function saveComment(message, ws, cb) {

      var comment = new db.comments();
      comment.text = message.text;
      comment.user = ws.user._id;
      comment.replyTo = message.channel;
      db.handleMentions(comment, function(err, comment) {

          comment.save(function() {
              db.updateCommentCount({
                  _id: message.channel
              });
          });

          if (message.post_to_feed == true) {
              var repost = new db.posts();
              repost.text = comment.text;
              repost.user = ws.user._id;
              repost.replyTo = message.channel;
              repost.save(function(saved_post) {
                  comment.post = repost._id;
                  comment.save();
              });
          }

          cb(comment);


      }, true);

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

        ws.user = req.user_profile;
        ws.guid = guid();

        if (!ws.user) {
            try {
              ws.send(JSON.stringify({
                error: 'auth_required',
              }))
              ws.close();
          } catch (err) {
              console.error('Error closing unauthed connect', err);
          }
        }
        // console.log('GOT A NEW WEBSOCKET CONNECT', req.session.passport);


        ws.on('message', function incoming(message) {

            var message = JSON.parse(message);
            // console.log('RECEIVED', message);
            // controller.ingest(bot, message, ws);

            broadcast.emit(message.type, message, ws);

        });

        ws.on('close', function(err) {
            console.log('CLOSED', err);
            broadcast.emit('closed', ws);
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
