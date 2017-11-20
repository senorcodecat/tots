var app = angular.module('tots', ['mgcrea.pullToRefresh','angular-file-input']);
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
