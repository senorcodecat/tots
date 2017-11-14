var debug = require('debug')('tots:actions');
module.exports = function(webserver, db) {


    webserver.post('/actions/post', function(req, res) {

        if (req.user && req.body.text && req.body.text != '') {
            var post = new db.posts();
            post.text = req.body.text;
            post.user = req.user_profile._id;
            post.save();
            debug('NEW POST',post);
            res.redirect('/user');
        } else {
            res.redirect('/login');
        }

    });

}
