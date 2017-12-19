var unfurl = require('unfurled');
var async = require('async');

function firstOf(obj, options) {

    for (var x = 0; x < options.length; x++) {
        if (obj[options[x][0]] && obj[options[x][0]][options[x][1]]) {
            return obj[options[x][0]][options[x][1]]
        }
    }

    return "";
}

function getUnfurl(url) {
    return new Promise(function(resolve, reject) {
        unfurl(url).then(function(unfurl) {

            // console.log(unfurl);

            var title = firstOf(unfurl, [
                ['oembed', 'title'],
                ['twitter', 'twitterTitle'],
                ['ogp', 'ogTitle'],
                ['other', 'title']
            ]);
            var description = firstOf(unfurl, [
                ['twitter', 'twitterDescription'],
                ['ogp', 'ogDescription'],
                ['other', 'description']
            ]);
            var thumbnail = firstOf(unfurl, [
                ['oembed', 'thumbnailUrl'],
                ['twitter', 'twitterImage'],
                ['ogp', 'ogImage'],
            ]);

            if (Array.isArray(thumbnail)) {
                thumbnail = thumbnail[0];

                if (thumbnail.url) {
                    thumbnail = thumbnail.url;
                }
            }
            if (title && url && (description || thumbnail)) {
                resolve({
                    title: title,
                    description: description,
                    thumbnail: thumbnail,
                    url: url,
                })
            } else {
                reject();
            }
        }).catch(reject);

    });

}

function generateAttachments(text) {
    var attachments = [];
    if (text) {
        var urls = text.match(/((http|https)\:\/\/(.*?))(\s|$)/img);
        console.log('EXTRACTED URLS', urls);
        return new Promise(function(resolve, reject) {
            async.each(urls, function(url, next) {
                getUnfurl(url).then(function(furl) {
                    console.log('GOT FURL', furl);
                    attachments.push(furl);
                    next();
                }).catch(function(err) {
                    console.error('Experienced error', err);
                    next();
                });
            }, function() {
                resolve(attachments)
            });
        });
    } else {
        return new Promise(function(resolve, reject) {
            resolve([]);
        });
    }
}

module.exports = generateAttachments;


//generateAttachments('this is a super cool link https://www.nytimes.com/2017/12/05/world/middleeast/american-embassy-israel-trump-move.html?hp&action=click&pgtype=Homepage&clickSource=story-heading&module=first-column-region&region=top-news&WT.nav=top-news&_r=0 and here is a cool video https://www.youtube.com/watch?v=_q7kCBqothA');
