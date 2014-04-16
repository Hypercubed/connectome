(function() {
  'use strict';

  // Todo: min, customize labels, scale function

  var baseUrl = 'components/slider/';

  angular.module('lrSpaApp')
    .directive('slider', function($timeout) {
      return {
        scope: {
          value: '=ngModel',
          max: '=',
          min: '='
        },
        templateUrl: baseUrl+'slider.html',
        link: function(scope, element, attrs) {
          element.addClass('slider');

          scope.rangeValue = scope.value;
          update();

          //scope.a = 10;
          
          scope.$watch('value', changeInputValue);
          scope.$watch('rangeValue', changeRangeValue);
          scope.$watch('max', update);
          scope.$watch('min', update);
          
          function changeInputValue(newVal, oldVal) {
            scope.rangeValue = newVal;
            update();
          }

          var stop;
          function changeRangeValue(newVal, oldVal) {
            if (newVal == oldVal) return;

            scope.rangeValue = +newVal;
            update();

            $timeout.cancel(stop);
            stop = $timeout(function() {
              scope.value = +scope.rangeValue;
            }, 10);
            
          }

          function update() {
            scope.percent = (scope.rangeValue-scope.min)/(scope.max-scope.min)*100;
            scope.max = +scope.max || 100;
            scope.min = +scope.min || 0;

            scope.left = scope.percent > 10;
            scope.right = scope.percent < 90;    
            scope.bubbleStyle = {left: scope.percent+'%'};

          }

        }
      };
    });

})();