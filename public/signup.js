var app = angular.module('signup', ['ngFileUpload', 'monospaced.elastic']);
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
]);

app.controller('app', ['$scope', '$http','$location', function($scope, $http, $location) {

    $scope.ui = {}

    console.log('signup app booted');

    $scope.ui.user_profile = {
        username: payload.displayName.replace(/\W/g,''),
        displayName: payload.displayName,
        picture: payload.picture,
    }
}]);
