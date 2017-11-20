var app = angular.module('tots', ['mgcrea.pullToRefresh','angular-file-input','ngRoute']);
//'monospaced.elastic'


app.config(function($interpolateProvider) {
    $interpolateProvider.startSymbol('{%');
    $interpolateProvider.endSymbol('%}');
}).config( [
    '$compileProvider',
    function( $compileProvider )
    {
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

app.filter('renderPostText', ['$sce', function($sce) {
  return function(text) {
    text = text.replace(/(\W)\#(.*?)(\W)/ig,'$1<a href="/search?query=%23$2">#$2</a>$3');
    text = text.replace(/\n/g,'<br/>\n');
    return $sce.trustAsHtml(text);
  };
}])


app.controller('app', ['$scope','$http', function($scope, $http) {

    $scope.ui = {
    }

    if (auth === false) {
      $scope.ui.auth = false;
    } else {
      $scope.ui.auth = true;
      $scope.ui.user = auth.user_profile;
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
            var updated_post = $scope.ui.posts.filter(function(p) {
              return p._id == res.data.post._id;
            });
            if (updated_post.length) {
              updated_post[0].faveCount = res.data.post.faveCount;
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
            var updated_post = $scope.ui.posts.filter(function(p) {
              return p._id == res.data.post._id;
            });
            if (updated_post.length) {
              updated_post[0].faveCount = res.data.post.faveCount;
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


    $scope.reload = function() {
        console.log('RELOAD!');
        alert('RELOAD!');
    }

    console.log('TOTS ONLINE');
}]);

app.controller('feed', ['$scope','$routeParams', function($scope, $routeParams) {

  $scope.ui.nav = 'home';
  $scope.ui.page = 0;
  $scope.params = $routeParams;
  if ($scope.params.page) {
    $scope.ui.page = $scope.params.page;
  }


  $scope.ui.posts = [];

  $scope.getPosts('/posts/feed',[],$scope.ui.page).then(function(posts) {
    $scope.ui.posts = posts;
    $scope.$apply();
  })

}])

app.controller('public', ['$scope','$routeParams', function($scope, $routeParams) {

  $scope.ui.page = 0;
  $scope.ui.nav = 'public';

  $scope.params = $routeParams;
  if ($scope.params.page) {
    $scope.ui.page = $scope.params.page;
  }

  $scope.ui.posts = [];


  $scope.getPosts('/posts/public',[],$scope.ui.page).then(function(posts) {
    $scope.ui.posts = posts;
    $scope.$apply();

  })


}])

app.controller('search', ['$scope','$routeParams', function($scope, $routeParams) {

  $scope.ui.page = 0;
  $scope.ui.nav = 'search';

  $scope.params = $routeParams;
  if ($scope.params.page) {
    $scope.ui.page = $scope.params.page;
  }

  var query = $scope.params.query;

  $scope.ui.posts = [];

  $scope.getPosts('/posts/search',['query=' + encodeURIComponent(query)],$scope.ui.page).then(function(posts) {
    $scope.ui.posts = posts;
    $scope.$apply();

  })


}])

app.controller('profile', ['$scope','$routeParams', function($scope, $routeParams) {

  $scope.ui.page = 0;
  $scope.ui.nav = 'profile';

  $scope.params = $routeParams;
  if ($scope.params.page) {
    $scope.ui.page = $scope.params.page;
  }

  var username = $scope.params.username;

  $scope.ui.posts = [];
  $scope.ui.profile = null;

  $scope.getPosts('/posts/user',['username=' + encodeURIComponent(username)],$scope.ui.page).then(function(payload) {
    $scope.ui.posts = payload.posts;
    $scope.ui.profile = payload.profile;
    $scope.ui.following = payload.following;
    $scope.ui.followback = payload.followback;

    $scope.$apply();
  })


}])


app.controller('faves', ['$scope','$routeParams', function($scope, $routeParams) {

  $scope.ui.page = 0;
  $scope.ui.nav = 'profile';

  $scope.params = $routeParams;
  if ($scope.params.page) {
    $scope.ui.page = $scope.params.page;
  }

  var username = $scope.params.username;

  $scope.ui.posts = [];
  $scope.ui.profile = null;

  $scope.getPosts('/posts/user/faves',['username=' + encodeURIComponent(username)],$scope.ui.page).then(function(payload) {
    $scope.ui.posts = payload.posts;
    $scope.ui.profile = payload.profile;
    $scope.ui.following = payload.following;
    $scope.ui.followback = payload.followback;

    $scope.$apply();
  })


}])


app.controller('notifications', ['$scope','$routeParams','$sce', function($scope, $routeParams, $sce) {

  $scope.ui.nav = 'notifications';
  $scope.ui.page = 0;
  $scope.params = $routeParams;
  if ($scope.params.page) {
    $scope.ui.page = $scope.params.page;
  }

  $scope.ui.notifications = [];

  $scope.getPosts('/get/notifications',[],$scope.ui.page).then(function(notifications) {
    $scope.ui.notifications = notifications;
    for (var n = 0; n < $scope.ui.notifications.length; n++) {
      $scope.ui.notifications[n].html = $sce.trustAsHtml($scope.ui.notifications[n].text);
    }
    $scope.$apply();
  });

}])

app.controller('postForm', ['$scope', function($scope) {

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
        reader.onload = (function(aImg) { return function(e) {
            $scope.ui.img_preview = e.target.result;
            $scope.$apply();
        }; })(img);
        var url = reader.readAsDataURL($scope.ui.file);
    }

}]);
