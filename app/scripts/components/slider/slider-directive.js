(function() {
  'use strict';

  // Todo: min, customize labels, scale function

  var scripts = document.getElementsByTagName("script")
  var currentScriptPath = scripts[scripts.length-1].src;
  var baseUrl = currentScriptPath.substring(0, currentScriptPath.lastIndexOf('/') + 1);

  angular.module('lrSpaApp')
    .directive('slider', function($timeout) {
      return {
        scope: {
          value: '=ngModel',
          max: '='
        },
        templateUrl: baseUrl+'slider.html',
        link: function(scope, element, attrs) {
          element.addClass('slider');

          scope.$watchCollection('[slider,max,value]', function() {
            scope.value = scope.value || 0;
            scope.max = scope.max || 100;

            scope.percent = scope.value/scope.max*100;
            scope.left = scope.percent > 10;
            scope.right = scope.percent < 90;
          });

        }
      };
    });

})();