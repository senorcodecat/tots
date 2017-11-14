var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = mongoose.Schema.Types.ObjectId;

var debug = require('debug')('tots:db');
module.exports = function() {
    mongoose.connect(process.env.mongoURI, { useMongoClient: true });
    mongoose.Promise = global.Promise;

    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function() {
      // we're connected!
      debug('CONNECTED TO DB!!!');
    });


    var userSchema = new Schema({
        user_id: String,
        username: String,
        displayName: String,
        bio: String,
        created: {
            type: Date,
            default: Date.now,
        },
        lastAuth: {
            type: Date,
            default: null
        }
    });

    var postSchema = new Schema({
        user: {
            type: ObjectId,
            ref: 'user'
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



    return {
        users: mongoose.model('user', userSchema),
        posts: mongoose.model('post', postSchema),
        _db: db,
    }
}
