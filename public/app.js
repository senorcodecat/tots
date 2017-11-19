var app = angular.module('tots', ['mgcrea.pullToRefresh']);
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
]);

app.controller('app', ['$scope', function($scope) {

    $scope.ui = {
    }


    
        $scope.reload = function() {
            console.log('RELOAD!');
            alert('RELOAD!');
        }

        console.log('TOTS ONLINE');
}]);

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

}]);
