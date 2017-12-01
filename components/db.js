var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = mongoose.Schema.Types.ObjectId;

var debug = require('debug')('tots:db');
module.exports = function() {
    mongoose.connect(process.env.mongoURI, { useMongoClient: true });
    mongoose.Promise = global.Promise;

    mongoose.set('debug', true);


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
        },
        phonenumber: {
          type: String,
          default: null,
          index: true,
        },
        phonenumber_verification: {
          type: String
        },
        phonenumber_verified: {
          type: Boolean,
          default: false,
        },
        notifications: {
          type: Object,
          default: {}
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
        faveCount: {
            type: Number,
            default: 0,
        },
        replyCount: {
            type: Number,
            default: 0,
        },
        images: [{}],
        live: {
            type: Boolean,
            default: false,
        },
        liveCount: {
            type: Number,
            default: 0,
        },
        lastReply: {
            type: Date,
            default: null
        },
        date: {
            type: Date,
            default: Date.now
        },
        updated: {
          type: Date,
          default: null,
      },
    });

    postSchema.index({user:1,date:1});


    var revisionSchema = new Schema({
        post: {
          type: ObjectId,
          ref: 'post',
          index: true,
        },
        text: String,
        images: [{}],
        date: {
            type: Date,
            default: Date.now
        }
    });


    var commentSchema = new Schema({
        user: {
            type: ObjectId,
            ref: 'user',
            index: true,
        },
        post: {
            type: ObjectId,
            ref: 'post',
        },
        text: String,
        replyTo: {
            type: ObjectId,
            ref: 'post',
            default: null,
            index: true,
        },
        faveCount: {
            type: Number,
            default: 0,
        },
        images: [{}],
        date: {
            type: Date,
            default: Date.now
        }
    });

    commentSchema.index({user:1,date:1});



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
        comment: {
            type: ObjectId,
            ref: 'comment',
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
        revisions: mongoose.model('revision', revisionSchema),
        comments: mongoose.model('comment', commentSchema),
        faves: mongoose.model('fave', faveSchema),
        notifications: mongoose.model('notification', notificationSchema),
        follow: mongoose.model('follow', followSchema),
        _db: db,
    }
}
