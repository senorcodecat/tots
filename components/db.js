var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = mongoose.Schema.Types.ObjectId;

var debug = require('debug')('tots:db');
module.exports = function() {
    mongoose.connect(process.env.mongoURI, { useMongoClient: true });
    mongoose.Promise = global.Promise;

    // mongoose.set('debug', true)


    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function() {
      // we're connected!
      debug('CONNECTED TO DB!!!');
    });


    var userSchema = new Schema({
        user_id: {
            type: String,
            index: true
        },
        username: {
            type: String,
            index: true
        },
        displayName: String,
        bio: String,
        settings: {
          type: Object,
          default: {}
        },
        created: {
            type: Date,
            default: Date.now,
        },
        avatar_url: String,
        lastAuth: {
            type: Date,
            default: null
        }
    });

    var postSchema = new Schema({
        user: {
            type: ObjectId,
            ref: 'user',
            index: true,
        },
        text: String,
        replyTo: {
            type: ObjectId,
            ref: 'post',
            default: null,
        },
        date: {
            type: Date,
            default: Date.now
        }
    });

    postSchema.index({user:1,date:1});

    var followSchema = new Schema({
        user: {
            type: ObjectId,
            ref: 'user',
            index: true,
        },
        following: {
            type: ObjectId,
            ref: 'user',
            index: true,
        },
        date: {
            type: Date,
            default: Date.now
        }
    });

    followSchema.index({user:1,following:1});

    var faveSchema = new Schema({
        user: {
            type: ObjectId,
            ref: 'user',
            index: true,
        },
        post: {
            type: ObjectId,
            ref: 'post',
            index: true,
        },
        date: {
            type: Date,
            default: Date.now
        }
    });
    faveSchema.index({user:1,post:1});

    var notificationSchema = new Schema({
        user: {
            type: ObjectId,
            ref: 'user',
            index: true,
        },
        actor: {
            type: ObjectId,
            ref: 'user',
        },
        post: {
            type: ObjectId,
            ref: 'post',
        },
        type: String,
        text: String,
        date: {
            type: Date,
            default: Date.now
        },
    })


    return {
        users: mongoose.model('user', userSchema),
        posts: mongoose.model('post', postSchema),
        faves: mongoose.model('fave', faveSchema),
        notifications: mongoose.model('notification', notificationSchema),
        follow: mongoose.model('follow', followSchema),
        _db: db,
    }
}
