oembed = require('oembed');

url = 'https://www.nytimes.com/2017/11/17/us/politics/trump-sexual-harassment-debate.html';
url = 'https://www.instagram.com/p/BbcCWzhFOEh/?taken-by=benbrown';
oembed.fetch(url, { maxwidth: 1920 }, function(error, result) {
    if (error)
        console.error(error);
    else
        console.log("oEmbed result", result);
});
