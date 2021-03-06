var app = angular.module('tots', ['ngFileUpload', 'ngRoute', 'mentio', 'monospaced.elastic']);
//'monospaced.elastic'


app.config(function($interpolateProvider) {
    $interpolateProvider.startSymbol('{%');
    $interpolateProvider.endSymbol('%}');
}).config([
    '$compileProvider',
    function($compileProvider) {
        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|mailto|data):/);
        // Angular before v1.2 uses $compileProvider.urlSanitizationWhitelist(...)
    }
]).config(function($routeProvider, $locationProvider) {
    $routeProvider
        .when('/feed', {
            templateUrl: 'partials/feed.html',
        })
        .when('/feed/:page', {
            templateUrl: 'partials/feed.html',
        })
        .when('/@:username', {
            templateUrl: 'partials/profile.html',
        })
        .when('/@:username/tots/:post_id', {
            templateUrl: 'partials/detail.html',
        })
        .when('/@:username/tots/:post_id/live', {
            templateUrl: 'partials/live.html',
        })
        .when('/@:username/tots/:post_id/edit', {
            templateUrl: 'partials/edit.html',
        })
        .when('/@:username/tots/:post_id/revisions', {
            templateUrl: 'partials/revisions.html',
        })
        .when('/@:username/invite/:code', {
            templateUrl: 'partials/invite.html',
        })
        .when('/@:username/followers', {
            templateUrl: 'partials/followers.html',
        })
        .when('/@:username/following', {
            templateUrl: 'partials/following.html',
        })
        .when('/@:username/faves', {
            templateUrl: 'partials/faves.html',
        })
        .when('/@:username/faves/:page', {
            templateUrl: 'partials/faves.html',
        })
        .when('/@:username/:page', {
            templateUrl: 'partials/profile.html',
        })
        .when('/notifications', {
            templateUrl: 'partials/notifications.html',
        })
        .when('/notifications/:page', {
            templateUrl: 'partials/notifications.html',
        })
        .when('/search', {
            templateUrl: 'partials/search.html',
        })
        .when('/search/:query', {
            templateUrl: 'partials/search.html',
        })
        .when('/search/:query/page/:page', {
            templateUrl: 'partials/search.html',
        })
        .when('/public', {
            templateUrl: 'partials/public.html',
        })
        .when('/public/:page', {
            templateUrl: 'partials/public.html',
        })
        .when('/editprofile', {
            templateUrl: 'partials/editprofile.html',
        })
        .when('/invite', {
            templateUrl: 'partials/invites.html',
        })
        .otherwise('/feed');

    // configure html5 to get links working on jsfiddle
    $locationProvider.html5Mode(true);
});

app.filter('striptags', ['$sce', function($sce) {
    return function(text) {
        if (text) {
            text = text.replace(/<.*?>/g, '');
            return text;
        }
    }
}]);



app.filter('renderPostText', ['$sce', function($sce) {

    function shortUrl(url, l) {
        var l = typeof(l) != "undefined" ? l : 50;
        var chunk_l = (l / 2);
        var url = url.replace("http://", "").replace("https://", "");

        if (url.length <= l) {
            return url;
        }

        var start_chunk = shortString(url, chunk_l, false);
        var end_chunk = shortString(url, chunk_l, true);
        return start_chunk + ".." + end_chunk;
    }

    function shortString(s, l, reverse) {
        var stop_chars = [' ', '/', '&'];
        var acceptable_shortness = l * 0.80; // When to start looking for stop characters
        var reverse = typeof(reverse) != "undefined" ? reverse : false;
        var s = reverse ? s.split("").reverse().join("") : s;
        var short_s = "";

        for (var i = 0; i < l - 1; i++) {
            short_s += s[i];
            if (i >= acceptable_shortness && stop_chars.indexOf(s[i]) >= 0) {
                break;
            }
        }
        if (reverse) {
            return short_s.split("").reverse().join("");
        }
        return short_s;
    }

    return function(text) {
        if (text) {


            //            text = text.replace(/(^|\W)\#(\w+)(\W|$)/img, '$1<a href="/search?query=%23$2">#$2</a>$3');

            // text = text.replace(/((http|https)\:\/\/(.*?))(\s|$)/img, '<a href="$1" target="_blank">' + shortUrl($1) + '</a>$4');
            text = text.replace(/((http|https)\:\/\/(.*?))(\s|$)/img, function(match, contents, offset, input_string) {
                console.log('match',match, 'contents',contents);
                return '<a href="' + match + '" target="_blank" title="' + match + '" class="url">' + shortUrl(match) + '</a>';
            //'<a href="$1" target="_blank">' + shortUrl($1) + '</a>$4'
            });

            text = text.replace(/#(\w+)/img, '<a href="/search?query=%23$1">#$1</a>');

            text = text.replace(/\:tot\:/img, '<img src="/mojis/tot.png" class="totmoji" alt="tot">');

            // ban some words from appearing
            text = text.replace(/(fuck|bitch|nigger)/ig, '████');

            text = converter.makeHtml(text);

            return $sce.trustAsHtml(text);
        }
    };
}])


app.filter('curseFilter', ['$sce', function($sce) {
    return function(text) {
        if (text) {


            // ban some words from appearing
            text = text.replace(/(fuck|bitch|nigger)/ig, '████');
            return $sce.trustAsHtml(text);
        }
    };
}])

app.controller('app', ['$scope', '$http', '$location', function($scope, $http, $location) {

    $scope.ui = {}

    if (auth === false) {
        $scope.ui.auth = false;
    } else {
        $scope.ui.auth = true;
        $scope.ui.user = auth.user_profile;
        mixpanel.identify($scope.ui.user._id);
        mixpanel.people.set({
            "User name": $scope.ui.user.username,
            "$name": $scope.ui.user.displayName,
            "$phone": $scope.ui.user.phonenumber,
        });

    }

    $scope.$on('$routeChangeSuccess', function($event, current, previous) {
        console.log('ROUTE CHANGED', location.href);

        // reset some stuff
        $scope.ui.post = null;
    });

    $scope.linkToPost = function(post) {
        var url = '/@' + post.user.username + '/tots/' + post._id;
        if (post.live) {
            url = url + '/live';
        }
        return url;
    }

    $scope.clipboard = function(element) {
        var copyText = document.getElementById(element);
        copyText.select();
        document.execCommand("Copy");
    }

    $scope.lightbox = function(url) {
        console.log('OPEN LIGHTBOX', url);
        $scope.ui.lightbox_img = url;
        $scope.ui.overlay = true;
        // $scope.$apply();
    }

    $scope.activateMenu = function() {
        $scope.ui.menu_overlay = true;
        setTimeout(function() {
            $scope.ui.menu = true;
            $scope.$apply();
        }, 10);
    }

    $scope.deactivateMenu = function() {
        $scope.ui.menu = false;
        setTimeout(function() {
            $scope.ui.menu_overlay = false;
            $scope.$apply();
        }, 300);
    }

    $scope.randomGif = function() {
        var gifs = [
            '/img/doggy.gif',
            '/img/mouse.gif',
            '/img/panda.gif',
            '/img/pug.gif',
        ]

        // if ($scope.ui.user && $scope.ui.user.settings.darknightmode) {
        //     gifs = ['/img/batman_logo.png']
        // }

        var gif = gifs[Math.floor(Math.random() * gifs.length)];
        return gif;

    }
    $scope.ui.gif = $scope.randomGif();

    $scope.ui.people = [{}];

    $scope.searchPeople = function(term) {
        // console.log('SEARCHING PEOPLE!!',term);
        var peopleList = [];
        return $http.get('/get/people?q=' + encodeURIComponent(term)).then(function(response) {
            var peopleList = response.data.map(function(p) {
                return {
                    label: p.username,
                    displayName: p.displayName
                }
            })
            $scope.ui.people = peopleList;
            // return $q.when(peopleList);
        });
    }


    $scope.getPosts = function(source, options, page) {

        return new Promise(function(resolve, reject) {
            var limit = 25;
            options.push('page=' + page);
            options.push('limit=' + limit)

            var url = source + "?" + options.join("&");
            console.log('FETCH DATA', url);
            $http.get(url).then(function(res) {
                if (res.data.ok) {
                    var posts = res.data.data;
                    var tot = posts.length;
                    if (posts.posts) {
                        tot = posts.posts.length;
                    }
                    $scope.ui.page = page || 1;
                    if (tot == limit) {
                        $scope.ui.next = parseInt($scope.ui.page) + 1;
                    } else {
                        delete($scope.ui.next)
                    }
                    if ($scope.ui.page > 1) {
                        $scope.ui.previous = parseInt($scope.ui.page) - 1;
                    } else {
                        delete($scope.ui.previous)
                    }
                    resolve(posts);
                } else {
                    reject('bad response');
                }
            });
        });

    }


    $scope.callAPI = function(url, method, options) {

        return new Promise(function(resolve, reject) {
            if (method == 'GET') {
                url = url + "?" + options.join("&");
            }
            console.log('FETCH DATA', url);
            $http({
                method: method,
                url: url
            }).then(function(res) {
                if (res.data.ok) {
                    resolve(res.data.data);
                } else {
                    reject('bad response');
                }
            });
        });

    }
    $scope.fave = function(post_id) {

        mixpanel.track("Add Fave");
        $http.get('/actions/fave/' + post_id).then(function(res) {
            if (res.data.ok) {
                if (res.data.post) {
                    var updated_post;
                    if ($scope.ui.post) {
                        updated_post = $scope.ui.post;
                    } else {
                        updated_post = $scope.ui.posts.filter(function(p) {
                            return p._id == res.data.post._id;
                        });
                        if (updated_post.length) {
                            updated_post = updated_post[0];
                        }
                    }
                    if (updated_post) {
                        updated_post.faved = true;
                        if (typeof(res.data.post.faveCount) != 'undefined') {
                            updated_post.faveCount = res.data.post.faveCount;
                            console.log('updating face count! to ', res.data.post.faveCount);

                            // $scope.$apply();
                        }
                    }
                }
            } else {
                alert('FAILED TO FAVE');
            }
        })
    }

    $scope.unfave = function(post_id) {

        mixpanel.track("Remove Fave");

        $http.get('/actions/unfave/' + post_id).then(function(res) {
            if (res.data.ok) {
                if (res.data.post) {
                    if ($scope.ui.post) {
                        updated_post = $scope.ui.post;
                    } else {
                        updated_post = $scope.ui.posts.filter(function(p) {
                            return p._id == res.data.post._id;
                        });
                        if (updated_post.length) {
                            updated_post = updated_post[0];
                        }
                    }
                    if (updated_post) {
                        updated_post.faved = false;
                        if (typeof(res.data.post.faveCount) != 'undefined') {
                            updated_post.faveCount = res.data.post.faveCount;
                        }

                    }
                }
            } else {
                alert('FAILED TO FAVE');
            }
        })
    }

    $scope.follow = function(user_id) {

        mixpanel.track("Follow");

        $http.get('/actions/follow/' + user_id).then(function(res) {
            if (res.data.ok) {
                $scope.ui.following = true;
            } else {
                alert('FAILED TO FAVE');
            }
        })
    }

    $scope.unfollow = function(user_id) {

        mixpanel.track("Unfollow");

        $http.get('/actions/unfollow/' + user_id).then(function(res) {
            if (res.data.ok) {
                $scope.ui.following = false;
            } else {
                alert('FAILED TO FAVE');
            }
        })
    }

    $scope.getLiked = function(posts) {

        var ids = posts.map(function(p) {
            return p._id;
        });
        $http.post('/get/liked', {
            posts: ids
        }).then(function(res) {
            if (res.data.ok) {
                for (var f = 0; f < res.data.data.length; f++) {
                    fave = res.data.data[f];
                    if ($scope.ui.posts) {
                        for (var p = 0; p < $scope.ui.posts.length; p++) {
                            if ($scope.ui.posts[p]._id == fave.post) {
                                $scope.ui.posts[p].faved = true;
                            }
                        }
                    }
                    if ($scope.ui.post && $scope.ui.post._id == fave.post) {
                        $scope.ui.post.faved = true;
                    }
                }
            }
        });

    }

    $scope.reload = function() {
        console.log('RELOAD!');
        alert('RELOAD!');
    }

    $scope.resetHistory = function(url, title) {
        $scope.ui.history = [];
        if (url && title) {
            $scope.ui.history.push({
                url: url,
                title: title,
            });
        }
    }

    $scope.pushHistory = function(url, title) {
        if (!$scope.ui.history) {
            $scope.resetHistory();
        }
        if (!$scope.ui.history.length || $scope.ui.history[$scope.ui.history.length - 1].url != url) {
            $scope.ui.history.push({
                url: url,
                title: title
            });
        }

        console.log('HISTORY', $scope.ui.history);
    }

    $scope.backTitle = function() {
        return $scope.ui.history[$scope.ui.history.length - 2].title;
    }
    $scope.popHistory = function() {
        // get rid of most recent
        $scope.ui.history.pop();
        // this leaves previous
        var back = $scope.ui.history[$scope.ui.history.length - 1];
        console.log('POP TO ', back);
        // return false;
        $location.url(back.url);
        // window.location = back.url;
        // $scope.$apply();
    }


    console.log('TOTS ONLINE');
}]);

app.controller('feed', ['$scope', '$routeParams', function($scope, $routeParams) {

    $scope.resetHistory('/feed', 'Feed');
    mixpanel.track("View Feed");

    if (!$scope.ui.auth) {
        window.location = '/public';
    }
    $scope.ui.nav = 'home';
    $scope.ui.page = 0;
    $scope.ui.loaded = false;
    $scope.params = $routeParams;
    if ($scope.params.page) {
        $scope.ui.page = $scope.params.page;
    }

    $scope.ui.next = null;
    $scope.ui.previous = null;


    $scope.ui.posts = [];

    $scope.getPosts('/posts/feed', [], $scope.ui.page).then(function(posts) {
        $scope.ui.posts = posts;
        $scope.ui.loaded = true;

        $scope.getLiked($scope.ui.posts);

        $scope.$apply();
    })

    $scope.getPosts('/posts/feed/live', [], 0).then(function(posts) {
        $scope.ui.live = posts;
        console.log('GOT LIVE POSTS', posts);
        $scope.$apply();
    })

}])

app.controller('public', ['$scope', '$routeParams', function($scope, $routeParams) {

    $scope.resetHistory('/public', 'Public Feed');
    mixpanel.track("View Public");

    $scope.ui.page = 0;
    $scope.ui.nav = 'public';
    $scope.ui.loaded = false;

    $scope.params = $routeParams;
    if ($scope.params.page) {
        $scope.ui.page = $scope.params.page;
    }

    $scope.ui.next = null;
    $scope.ui.previous = null;


    $scope.ui.posts = [];


    $scope.getPosts('/posts/public', [], $scope.ui.page).then(function(posts) {
        $scope.ui.posts = posts;
        $scope.ui.loaded = true;

        $scope.getLiked($scope.ui.posts);

        $scope.$apply();

    })


}])

app.controller('search', ['$scope', '$routeParams', function($scope, $routeParams) {

    $scope.resetHistory('/search', 'Search Tots');
    mixpanel.track("View Search");

    $scope.ui.page = 0;
    $scope.ui.nav = 'search';

    $scope.params = $routeParams;
    if ($scope.params.page) {
        $scope.ui.page = $scope.params.page;
    }

    $scope.ui.next = null;
    $scope.ui.previous = null;

    $scope.ui.query = $scope.params.query;

    $scope.ui.posts = [];

    $scope.search = function() {
        $scope.ui.loaded = false;

        mixpanel.track("Search for something");

        $scope.getPosts('/posts/search', ['query=' + encodeURIComponent($scope.ui.query)], $scope.ui.page).then(function(posts) {
            $scope.ui.posts = posts;
            $scope.ui.loaded = true;
            $scope.getLiked($scope.ui.posts);

            $scope.$apply();

        })
    }

    if ($scope.ui.query) {
        $scope.search();
    } else {
        $scope.ui.loaded = true;
    }

}])

app.controller('profile', ['$scope', '$routeParams', function($scope, $routeParams) {

    $scope.ui.page = 0;
    $scope.ui.nav = 'profile';
    mixpanel.track("View a user profile");

    $scope.ui.loaded = false;

    $scope.ui.next = null;
    $scope.ui.previous = null;

    $scope.params = $routeParams;
    if ($scope.params.page) {
        $scope.ui.page = $scope.params.page;
    }

    var username = $scope.params.username;

    $scope.ui.posts = [];
    $scope.ui.profile = null;

    $scope.getPosts('/posts/user', ['username=' + encodeURIComponent(username)], $scope.ui.page).then(function(payload) {
        $scope.ui.posts = payload.posts;
        $scope.ui.profile = payload.profile;
        $scope.ui.following = payload.following;
        $scope.ui.followback = payload.followback;
        $scope.ui.loaded = true;

        $scope.pushHistory(window.location.pathname, $scope.ui.profile.displayName + '\'s Profile');

        $scope.getLiked($scope.ui.posts);

        $scope.$apply();
    })


}])

app.controller('following', ['$scope', '$routeParams', function($scope, $routeParams) {

    mixpanel.track("View someone's following");
    $scope.ui.page = 0;
    $scope.ui.nav = 'profile';
    $scope.ui.loaded = false;
    $scope.ui.next = null;
    $scope.ui.previous = null;

    $scope.params = $routeParams;
    if ($scope.params.page) {
        $scope.ui.page = $scope.params.page;
    }

    var username = $scope.params.username;

    $scope.ui.posts = [];
    $scope.ui.profile = null;

    $scope.getPosts('/user/following', ['username=' + encodeURIComponent(username)], $scope.ui.page).then(function(payload) {
        console.log('GOT PAYLOAD', payload);
        $scope.ui.people = payload.posts;
        $scope.ui.profile = payload.user_profile;

        $scope.$apply();
    });
}]);

app.controller('followers', ['$scope', '$routeParams', function($scope, $routeParams) {

    mixpanel.track("View someone's following");
    $scope.ui.page = 0;
    $scope.ui.nav = 'profile';
    $scope.ui.loaded = false;
    $scope.ui.next = null;
    $scope.ui.previous = null;

    $scope.params = $routeParams;
    if ($scope.params.page) {
        $scope.ui.page = $scope.params.page;
    }

    var username = $scope.params.username;

    $scope.ui.posts = [];
    $scope.ui.profile = null;

    $scope.getPosts('/user/followers', ['username=' + encodeURIComponent(username)], $scope.ui.page).then(function(payload) {
        console.log('GOT PAYLOAD', payload);
        $scope.ui.people = payload.posts;
        $scope.ui.profile = payload.user_profile;

        $scope.$apply();
    });
}]);

app.controller('faves', ['$scope', '$routeParams', function($scope, $routeParams) {

    mixpanel.track("View someone's faves");

    $scope.ui.page = 0;
    $scope.ui.nav = 'profile';
    $scope.ui.loaded = false;
    $scope.ui.next = null;
    $scope.ui.previous = null;

    $scope.params = $routeParams;
    if ($scope.params.page) {
        $scope.ui.page = $scope.params.page;
    }

    var username = $scope.params.username;

    $scope.ui.posts = [];
    $scope.ui.profile = null;

    $scope.getPosts('/posts/user/faves', ['username=' + encodeURIComponent(username)], $scope.ui.page).then(function(payload) {
        $scope.ui.posts = payload.posts;
        $scope.ui.profile = payload.profile;
        $scope.ui.following = payload.following;
        $scope.ui.followback = payload.followback;
        $scope.ui.loaded = true;

        $scope.pushHistory(window.location.pathname, $scope.ui.profile.displayName + '\'s Faves');

        $scope.getLiked($scope.ui.posts);


        $scope.$apply();
    })


}])


app.controller('notifications', ['$scope', '$routeParams', '$sce', function($scope, $routeParams, $sce) {

    $scope.resetHistory('/notifications', 'Notifications');

    mixpanel.track("View notifications");

    $scope.ui.nav = 'notifications';
    $scope.ui.page = 0;
    $scope.ui.loaded = false;
    $scope.ui.next = null;
    $scope.ui.previous = null;

    $scope.params = $routeParams;
    if ($scope.params.page) {
        $scope.ui.page = $scope.params.page;
    }

    $scope.ui.notifications = [];

    $scope.getPosts('/get/notifications', [], $scope.ui.page).then(function(notifications) {
        $scope.ui.notifications = notifications;
        $scope.ui.loaded = true;

        for (var n = 0; n < $scope.ui.notifications.length; n++) {
            $scope.ui.notifications[n].html = $sce.trustAsHtml($scope.ui.notifications[n].text);
        }
        $scope.$apply();
    });

}])


app.controller('detail', ['$scope', '$routeParams', '$http', 'Upload', function($scope, $routeParams, $http, Upload) {

    $scope.params = $routeParams;
    var pid = $scope.params.post_id;

    mixpanel.track("View post permalink");

    $scope.ui.nav = '';
    $scope.ui.roster = [];
    $scope.ui.comment = {
        post: pid,
        text: '',
        file: null,
    }

    $scope.ui.working = false;

    delete($scope.ui.post);
    delete($scope.ui.comments);

    $scope.removeFile = function() {
        if (confirm('Remove the file from this post?')) {
            $scope.ui.comment.file = null;
            // $scope.ui.img_preview = null;
        }
    }


    $scope.getPosts('/posts/post', ['post=' + $scope.params.post_id, 'username=' + encodeURIComponent($scope.params.username)], 1).then(function(payload) {
        $scope.ui.post = payload;
        $scope.pushHistory(window.location.pathname, $scope.ui.post.user.displayName + '\'s tot');

        if ($scope.ui.user && ($scope.ui.post.user._id == $scope.ui.user._id)) {
            $scope.ui.post.mine = true;
        }
        if ($scope.ui.post.live) {
            window.location = '/@' + $scope.ui.post.user.username + '/tots/' + $scope.ui.post._id + '/live';
        } else {
            $scope.getLiked([$scope.ui.post]);
            $scope.getComments();

            $scope.$apply();
        }
    });

    $scope.getComments = function() {
        $scope.getPosts('/posts/comments', ['post=' + $scope.params.post_id], 1).then(function(payload) {
            $scope.ui.comments = payload;
            console.log('comments payload', payload);
            $scope.$apply();
        });
    }

    $scope.postComment = function() {
        if (!$scope.ui.working) {
            mixpanel.track("Post reply");

            $scope.ui.working = true;

            if ($scope.ui.comment.file) {



                $scope.ui.comment.file.upload = Upload.upload({
                    url: '/actions/comment/' + $scope.ui.comment.post,
                    data: {
                        text: $scope.ui.comment.text,
                        image: $scope.ui.comment.file,
                        post_to_feed: $scope.ui.comment.post_to_feed,
                    },
                });

                $scope.ui.comment.file.upload.then(function(response) {
                    console.log('SUCCESSFULLY UPLOADED', response);
                    if (response.data.ok) {
                        // reset form
                        $scope.ui.comment.text = null;
                        $scope.ui.comment.file = null;

                        document.getElementById('comment_composer').focus();
                        $scope.getComments();
                    } else {
                        alert('Failed to post');
                    }
                    $scope.ui.working = false;
                }, function(response) {
                    if (response.status > 0)
                        $scope.ui.errorMsg = response.status + ': ' + response.data;
                }, function(evt) {
                    // Math.min is to fix IE which reports 200% sometimes
                    $scope.ui.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
                    console.log('UPLOADING!!', $scope.ui.progress)

                });
            } else {
                $http.post('/actions/comment/' + $scope.ui.comment.post, $scope.ui.comment).then(function(res) {
                    $scope.ui.comment.text = '';
                    $scope.ui.comment.post_to_feed = false;
                    document.getElementById('comment_composer').focus();
                    $scope.getComments();
                    $scope.ui.working = false;
                });
            }
        }
    }

    $scope.deletePost = function(post) {
        if (confirm('Are you sure? This post will no longer be available, and any comments or files will also be GONE!!!')) {
            $http.post('/actions/delete', {
                post: post._id
            }).then(function(res) {
                if (res.data.ok) {
                    window.location = '/@' + $scope.ui.post.user.username;
                } else {
                    alert('SOFTWARE FAIL!')
                }
            })
        }
    }

}])


app.controller('live', ['$scope', '$routeParams', '$http', function($scope, $routeParams, $http) {

    $scope.params = $routeParams;
    var pid = $scope.params.post_id;

    mixpanel.track("View live chat");

    $scope.ui.nav = '';
    $scope.ui.roster = [];
    $scope.ui.comment = {
        post: pid,
        text: '',
    }

    $scope.ui.connected = false;
    $scope.ui.offline = false;

    delete($scope.ui.post);
    delete($scope.ui.comments);

    $scope.$on('$destroy', function() {
        messenger.disconnect();
    })

    $scope.$on('connected', function() {
        $scope.ui.connected = true;
        $scope.ui.offline = false;
        $scope.$apply();
    })

    $scope.$on('disconnected', function() {
        $scope.ui.connected = false;
        $scope.$apply();

    });

    $scope.$on('offline', function() {
        $scope.ui.connected = false;
        $scope.ui.offline = true;
        $scope.$apply();

    });

    $scope.reconnect = function() {
        console.log('ATTEMPT RECONNECT');
        messenger.reconnect();
    }

    $scope.sendLive = function() {
        mixpanel.track("Post live chat");

        messenger.send($scope.ui.comment.text);
        $scope.ui.comment.text = '';
    }

    $scope.chatKeypress = function(evt) {
        console.log(evt);
        var keyCode = (evt.keyCode ? evt.keyCode : evt.which);

        if (keyCode == 13) {
            if (evt.ctrlKey) {
                $scope.ui.comment.text = $scope.ui.comment.text + '\n';
                evt.preventDefault();
            } else {
                $scope.sendLive();
                evt.preventDefault();
            }
        }
    }

    $scope.getPosts('/posts/post', ['post=' + $scope.params.post_id, 'username=' + encodeURIComponent($scope.params.username)], 1).then(function(payload) {
        $scope.ui.post = payload;
        if ($scope.ui.user && ($scope.ui.post.user._id == $scope.ui.user._id)) {
            $scope.ui.post.mine = true;
        }


        if (!$scope.ui.post.live) {
            window.location = '/@' + $scope.ui.post.user.username + '/tots/' + $scope.ui.post._id;
        } else {

            $scope.pushHistory(window.location.pathname, $scope.ui.post.user.displayName + '\'s tot');

            $scope.getLiked([$scope.ui.post]);
            $scope.getComments();

            messenger.boot($scope.params.post_id, $scope);

            $scope.$apply();
        }
    });

    $scope.$on('roster', function(evt, roster) {

        console.log('GOT UPDATED ROSTER', roster);
        $scope.ui.roster = roster;
        $scope.$apply();
    })

    $scope.$on('message', function(evt, message) {
        if (!message.user) {
            message.user = $scope.ui.user;
        }
        $scope.ui.comments.push(message);
        $scope.$apply();
    })


    $scope.$on('roster_add', function(evt, user) {

        console.log('GOT ROSTER ADDITION', user);
        for (var r = 0; r < $scope.ui.roster.length; r++) {
            console.log('compare', $scope.ui.roster[r]._id, user._id);
            if ($scope.ui.roster[r].id == user._id) {
                console.log('ALREADY IN ROSTER');
                return;
            }
        }
        $scope.ui.roster.push(user);
        $scope.$apply();

    })
    $scope.$on('roster_remove', function(evt, user) {

        console.log('GOT ROSTER REMOVAL', user);
        for (var r = 0; r < $scope.ui.roster.length; r++) {
            if ($scope.ui.roster[r]._id == user._id) {
                $scope.ui.roster.splice(r, 1);
                $scope.$apply();
                return;
            }
        }
    })

    $scope.getComments = function() {
        $scope.getPosts('/posts/comments', ['post=' + $scope.params.post_id], 1).then(function(payload) {
            $scope.ui.comments = payload;
            console.log('comments payload', payload);
            $scope.$apply();
        });
    }

}])



app.controller('revisions', ['$scope', '$routeParams', '$http', function($scope, $routeParams, $http) {

    $scope.params = $routeParams;
    var pid = $scope.params.post_id;

    $scope.ui.nav = 'revisions';
    mixpanel.track("View revisions");

    delete($scope.ui.post);
    $scope.getPosts('/posts/post', ['post=' + $scope.params.post_id, 'username=' + encodeURIComponent($scope.params.username)], 1).then(function(payload) {
        $scope.ui.post = payload;
        if ($scope.ui.user && ($scope.ui.post.user._id == $scope.ui.user._id)) {
            $scope.ui.post.mine = true;
        }
        $scope.getRevisions();

        $scope.pushHistory(window.location.pathname, 'Revisions');

        $scope.$apply();
    });

    $scope.getRevisions = function() {
        $scope.getPosts('/posts/revisions', ['post=' + $scope.params.post_id], 0).then(function(payload) {
            $scope.ui.revisions = payload;
            console.log('SET REVISIONS TO', payload);
            $scope.$apply();
        });
    }

}])


app.controller('editprofile', ['$scope', '$routeParams', '$http', function($scope, $routeParams, $http) {

    mixpanel.track("Edit profile");

    $scope.updateNotification = function(name, value) {
        console.log('SET NOTIFICATION', name, value);
        $http.post('/actions/togglenotification', {
            notification: name,
            value: value
        }).then(function(res) {
            if (!res.data.ok) {
                alert('Error updating notication preferences!');
            }
        }).catch(function(err) {
            // alert('Error updating notication preferences!');
        })
    }

    $scope.updatePhone = function() {
        mixpanel.track("Add Phone");

        $http.post('/actions/addphone', {
            phonenumber: $scope.ui.user.phonenumber,
            verification: $scope.ui.verification_test,
        }).then(function(res) {
            if (res.data.ok) {
                if (res.data.data.verification_sent) {
                    $scope.ui.verification_sent = true;
                } else if (res.data.data.phonenumber_verified) {
                    $scope.ui.user.phonenumber_verified = true;
                }
            } else {
                alert('ERROR ADDING PHONE!', res.data.error);
            }
        });

    }

}]);

app.controller('invite', ['$scope', '$routeParams', '$http', function($scope, $routeParams, $http) {

    mixpanel.track("View Invite");
    $scope.params = $routeParams;

    $scope.callAPI('/get/invite', 'GET', ['code=' + $scope.params.code, 'username=' + $scope.params.username]).then(function(data) {
        $scope.ui.profile = data.profile;
        $scope.ui.invite_id = data.invite_id;
        $scope.$apply();
    }).catch(function(err) {
        $scope.ui.error = err;
        $scope.$apply();
    });


    $scope.acceptInvite = function() {

        setCookie('accept_invite', $scope.ui.invite_id, 1);
        window.location = '/login';

    }


}]);


app.controller('invites', ['$scope', '$routeParams', '$http', function($scope, $routeParams, $http) {

    mixpanel.track("Get Invite");

    $scope.callAPI('/me/invitees', 'GET', []).then(function(people) {
        console.log('GOT INVITEES', people);
        $scope.ui.people = people;
        $scope.$apply();
    });

    $scope.callAPI('/me/invite', 'GET', []).then(function(invites) {
        console.log('VALID INVITES', invites);
        if (invites.length) {
            $scope.ui.invite = invites[0];
            $scope.ui.invite.usesLeft = $scope.ui.invite.validFor - $scope.ui.invite.timesUsed;
            $scope.$apply();
        }
    });

    $scope.generateInvite = function() {
        $scope.callAPI('/me/invite', 'POST', []).then(function(invite) {
            console.log('INVITE', invite);
            $scope.ui.invite = invite;
            $scope.ui.invite.usesLeft = $scope.ui.invite.validFor - $scope.ui.invite.timesUsed;
            $scope.$apply();
        });
    }


}]);

app.controller('editpost', ['$scope', '$routeParams', '$http', function($scope, $routeParams, $http) {

    mixpanel.track("View edit post page");


    $scope.params = $routeParams;
    var pid = $scope.params.post_id;

    delete($scope.ui.post);
    $scope.getPosts('/posts/post', ['post=' + $scope.params.post_id, 'username=' + encodeURIComponent($scope.params.username)], 1).then(function(post) {
        if (post.user._id == $scope.ui.user._id) {
            $scope.ui.post = post;
            if (post.images.length) {
                $scope.ui.img_preview = post.images[0].url;
            }
            $scope.pushHistory(window.location.pathname, 'Edit Post');

            $scope.$apply();
        } else {
            window.location = '/';
        }
    });

    $scope.removeFile = function() {
        if (confirm('Remove the file from this post?')) {
            $scope.ui.post.file = null;
            // $scope.ui.img_preview = null;
        }
    }

    $scope.fileChange = function() {
        var img = document.createElement("img");
        img.classList.add("obj");

        var reader = new FileReader();
        reader.onload = (function(aImg) {
            return function(e) {
                $scope.ui.img_preview = e.target.result;
                $scope.$apply();
            };
        })(img);
        var url = reader.readAsDataURL($scope.ui.file);
    }



    $scope.saveEdit = function() {
        mixpanel.track("Edit Post");

        if ($scope.ui.post.user._id == $scope.ui.user._id) {
            // move this value to the right location for saving...
            $scope.ui.post.text = $scope.ui.post.editable_text;
            $http.post('/actions/edit', $scope.ui.post).then(function(res) {
                if (res.data.ok) {
                    window.location = '/@' + $scope.ui.post.user.username + '/tots/' + $scope.ui.post._id;
                } else {
                    alert('SOFTWARE FAIL!');
                }
            })

        }
        return false;
    }

    $scope.deletePost = function(post) {
        if (confirm('Are you sure? This post will no longer be available, and any comments or files will also be GONE!!!')) {
            $http.post('/actions/delete', {
                post: post._id
            }).then(function(res) {
                if (res.data.ok) {
                    window.location = '/@' + $scope.ui.post.user.username;
                } else {
                    alert('SOFTWARE FAIL!')
                }
            })
        }
    }

}])

app.controller('postForm', ['$scope', '$http', 'Upload', function($scope, $http, Upload) {

    $scope.tot = {
        text: '',
    }


    $scope.upload = function(opts) {
        return new Promise(function(resolve, reject) {

                Upload.resize(opts.data.image, {width:1000}).then(function(file) {
                        console.log('SUCCESSFULLY RESIZED!');

                        opts.data.image = file;
                        Upload.upload(opts).then(resolve).catch(reject);
                }).catch(reject);

        });
    }

    $scope.submit = function(file) {

        if (!$scope.tot.text) {
            return false;
        } else {
            // mixpanel.track("Author a post");
            // console.log($scope.tot.file);

            $scope.ui.working = true;

            if ($scope.tot.file) {
                $scope.tot.file.upload = Upload.upload({
                    url: '/actions/post',
                    data: {
                        text: $scope.tot.text,
                        image: $scope.tot.file
                    },
                });

                $scope.tot.file.upload.then(function(response) {
                    console.log('SUCCESSFULLY UPLOADED', response);
                    if (response.data.ok) {
                        // reset form
                        $scope.tot.text = '';
                        $scope.tot.file = null;

                        var post = response.data.data;
                        window.location = '/@' + $scope.ui.user.username + '/tots/' + post._id;
                    } else {
                        alert('Failed to post');
                    }
                    $scope.ui.working = false;
                }, function(response) {
                    if (response.status > 0)
                        $scope.ui.errorMsg = response.status + ': ' + response.data;
                }, function(evt) {
                    // Math.min is to fix IE which reports 200% sometimes
                    $scope.ui.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
                    console.log('UPLOADING!!', $scope.ui.progress)

                });
            } else {

                $http.post('/actions/post', $scope.tot).then(function(response) {
                    console.log('SUCCESSFULLY UPLOADED', response);
                    if (response.data.ok) {
                        // reset form
                        $scope.tot.text = '';
                        $scope.tot.file = null;

                        var post = response.data.data;
                        window.location = '/@' + $scope.ui.user.username + '/tots/' + post._id;
                    } else {
                        alert('Failed to post');
                    }
                    $scope.ui.working = false;
                });

            }

            return false;
        }
    }

    $scope.focus = function() {
        $scope.ui.focused = true;
    }
    $scope.blur = function() {
        $scope.ui.focused = false;
    }

    $scope.removeFile = function() {
        if (confirm('Remove the file from this post?')) {
            $scope.tot.file = null;
            // $scope.ui.img_preview = null;
        }
    }

    // $scope.fileChange = function() {
    //     var img = document.createElement("img");
    //     img.classList.add("obj");
    //
    //     var reader = new FileReader();
    //     reader.onload = (function(aImg) {
    //         return function(e) {
    //             $scope.ui.img_preview = e.target.result;
    //             $scope.$apply();
    //         };
    //     })(img);
    //     var url = reader.readAsDataURL($scope.ui.file);
    // }

}]);


function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}
