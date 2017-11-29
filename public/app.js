var app = angular.module('tots', ['mgcrea.pullToRefresh', 'angular-file-input', 'ngRoute', 'mentio','monospaced.elastic']);
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
        .otherwise('/feed');

    // configure html5 to get links working on jsfiddle
    $locationProvider.html5Mode(true);
});

app.filter('striptags', ['$sce', function($sce) {
    return function(text) {
        if (text) {
            text = text.replace(/<.*?>/g,'');
            return text;
        }
    }
}]);

app.filter('renderPostText', ['$sce', function($sce) {
    return function(text) {
        if (text) {


            text = text.replace(/(^|\W)\#(\w+)(\W|$)/ig, '$1<a href="/search?query=%23$2">#$2</a>$3');

            // ban some words from appearing
            text = text.replace(/(fuck|bitch|nigger)/ig, '████');

            text = text.replace(/\n/g, '<br/>\n');
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

app.controller('app', ['$scope', '$http', function($scope, $http) {

    $scope.ui = {}

    if (auth === false) {
        $scope.ui.auth = false;
    } else {
        $scope.ui.auth = true;
        $scope.ui.user = auth.user_profile;
    }


        $scope.ui.people = [{
        }];

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
            $http.get(source + "?" + options.join("&")).then(function(res) {
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

    $scope.fave = function(post_id) {

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
                        }
                    }
                }
            } else {
                alert('FAILED TO FAVE');
            }
        })
    }

    $scope.unfave = function(post_id) {

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

        $http.get('/actions/follow/' + user_id).then(function(res) {
            if (res.data.ok) {
                $scope.ui.following = true;
            } else {
                alert('FAILED TO FAVE');
            }
        })
    }

    $scope.unfollow = function(user_id) {

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

    console.log('TOTS ONLINE');
}]);

app.controller('feed', ['$scope', '$routeParams', function($scope, $routeParams) {

    $scope.ui.nav = 'home';
    $scope.ui.page = 0;
    $scope.ui.loaded = false;
    $scope.params = $routeParams;
    if ($scope.params.page) {
        $scope.ui.page = $scope.params.page;
    }


    $scope.ui.posts = [];

    $scope.getPosts('/posts/feed', [], $scope.ui.page).then(function(posts) {
        $scope.ui.posts = posts;
        $scope.ui.loaded = true;

        $scope.getLiked($scope.ui.posts);

        $scope.$apply();
    })

}])

app.controller('public', ['$scope', '$routeParams', function($scope, $routeParams) {

    $scope.ui.page = 0;
    $scope.ui.nav = 'public';

    $scope.params = $routeParams;
    if ($scope.params.page) {
        $scope.ui.page = $scope.params.page;
    }

    $scope.ui.posts = [];


    $scope.getPosts('/posts/public', [], $scope.ui.page).then(function(posts) {
        $scope.ui.posts = posts;

        $scope.getLiked($scope.ui.posts);

        $scope.$apply();

    })


}])

app.controller('search', ['$scope', '$routeParams', function($scope, $routeParams) {

    $scope.ui.page = 0;
    $scope.ui.nav = 'search';

    $scope.params = $routeParams;
    if ($scope.params.page) {
        $scope.ui.page = $scope.params.page;
    }

    $scope.ui.query = $scope.params.query;

    $scope.ui.posts = [];

    $scope.search = function() {
        $scope.getPosts('/posts/search', ['query=' + encodeURIComponent($scope.ui.query)], $scope.ui.page).then(function(posts) {
            $scope.ui.posts = posts;

            $scope.getLiked($scope.ui.posts);

            $scope.$apply();

        })
    }

    $scope.search();

}])

app.controller('profile', ['$scope', '$routeParams', function($scope, $routeParams) {

    $scope.ui.page = 0;
    $scope.ui.nav = 'profile';

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

        $scope.getLiked($scope.ui.posts);

        $scope.$apply();
    })


}])


app.controller('faves', ['$scope', '$routeParams', function($scope, $routeParams) {

    $scope.ui.page = 0;
    $scope.ui.nav = 'profile';

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

        $scope.getLiked($scope.ui.posts);


        $scope.$apply();
    })


}])


app.controller('notifications', ['$scope', '$routeParams', '$sce', function($scope, $routeParams, $sce) {

    $scope.ui.nav = 'notifications';
    $scope.ui.page = 0;
    $scope.ui.loaded = false;

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


app.controller('detail', ['$scope', '$routeParams', '$http', function($scope, $routeParams, $http) {

    $scope.params = $routeParams;
    var pid = $scope.params.post_id;

    $scope.ui.nav = 'detail';
    $scope.ui.roster = [];
    $scope.ui.comment = {
        post: pid,
        text: '',
    }

    delete($scope.ui.post);

    $scope.sendLive = function() {
        messenger.send($scope.ui.comment.text);
        $scope.ui.comment.text = '';
    }

    $scope.chatKeypress = function(evt) {
        console.log(evt);
        var keyCode = (evt.keyCode ? evt.keyCode :evt.which);

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
        $scope.getLiked([$scope.ui.post]);
        $scope.getComments();

        messenger.boot($scope.params.post_id, $scope);

        $scope.$apply();
    });

    $scope.$on('roster', function(evt,roster) {

        console.log('GOT UPDATED ROSTER', roster);
        $scope.ui.roster = roster;
        $scope.$apply();
    })

    $scope.$on('message', function(evt,message) {
        if (!message.user) {
            message.user = $scope.ui.user;
        }
        $scope.ui.comments.push(message);
        $scope.$apply();
    })


    $scope.$on('roster_add', function(evt,user) {

        console.log('GOT ROSTER ADDITION', user);
        for (var r = 0; r < $scope.ui.roster.length; r++) {
            console.log('compare',$scope.ui.roster[r]._id , user._id);
            if ($scope.ui.roster[r].id == user._id) {
                console.log('ALREADY IN ROSTER');
                return;
            }
        }
        $scope.ui.roster.push(user);
        $scope.$apply();

    })
    $scope.$on('roster_remove', function(evt,user) {

        console.log('GOT ROSTER REMOVAL', user);
        for (var r = 0; r < $scope.ui.roster.length; r++) {
            if ($scope.ui.roster[r]._id == user._id) {
                $scope.ui.roster.splice(r,1);
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

    $scope.postComment = function() {
        $http.post('/actions/comment/' + $scope.ui.comment.post, $scope.ui.comment).then(function(res) {
            $scope.ui.comment.text = '';
            $scope.ui.comment.post_to_feed = false;
            document.getElementById('comment_composer').focus();
            $scope.getComments();
        });
    }

}])



app.controller('revisions', ['$scope', '$routeParams', '$http', function($scope, $routeParams, $http) {

    $scope.params = $routeParams;
    var pid = $scope.params.post_id;

    $scope.ui.nav = 'revisions';

    delete($scope.ui.post);
    $scope.getPosts('/posts/post', ['post=' + $scope.params.post_id, 'username=' + encodeURIComponent($scope.params.username)], 1).then(function(payload) {
        $scope.ui.post = payload;
        if ($scope.ui.user && ($scope.ui.post.user._id == $scope.ui.user._id)) {
            $scope.ui.post.mine = true;
        }
        $scope.getRevisions();

        $scope.$apply();
    });

    $scope.getRevisions = function() {
        $scope.getPosts('/posts/revisions', ['post=' + $scope.params.post_id], 1).then(function(payload) {
            $scope.ui.revisions = payload;
            console.log('SET REVISIONS TO', payload);
            $scope.$apply();
        });
    }

}])



app.controller('editpost', ['$scope', '$routeParams', '$http', function($scope, $routeParams, $http) {

    $scope.params = $routeParams;
    var pid = $scope.params.post_id;

    delete($scope.ui.post);
    $scope.getPosts('/posts/post', ['post=' + $scope.params.post_id, 'username=' + encodeURIComponent($scope.params.username)], 1).then(function(post) {
        if (post.user._id == $scope.ui.user._id) {
            $scope.ui.post = post;
            if (post.images.length) {
                $scope.ui.img_preview = post.images[0].url;
            }
            $scope.$apply();
        } else {
            window.location = '/';
        }
    });

    $scope.removeFile = function() {
        if (confirm('Remove the file from this post?')) {
            $scope.ui.file = null;
            $scope.ui.img_preview = null;
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

}])

app.controller('postForm', ['$scope','$http', function($scope, $http) {

    $scope.tot = {
        text: '',
    }
    $scope.submit = function() {

        if (!$scope.tot.text) {
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
            $scope.ui.file = null;
            $scope.ui.img_preview = null;
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

}]);
