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


          scope.internalValue = scope.value;
          scope.percent = (scope.value-scope.min)/(scope.max-scope.min)*100;
          
          scope.$watch('value', changeInputValue);
          scope.$watch('max', change);
          scope.$watch('min', change);
          scope.$watch('percent', changeInternalValue);

          function changeInputValue(newVal, oldVal) {
            if (newVal == oldVal) return;

            //scope.value = +scope.value || 0;
            scope.internalValue = newVal;
            scope.percent = (newVal-scope.min)/(scope.max-scope.min)*100;
            change();
          }

          var stop;
          function changeInternalValue(newVal, oldVal) {
            if (newVal == oldVal) return;

            //scope.percent = +scope.percent || 0;
            scope.internalValue = scope.percent/100*(scope.max-scope.min)+scope.min;
            change();

            $timeout.cancel(stop);
            stop = $timeout(function() {
              scope.value = scope.internalValue;
            }, 10);
            
          }

          function change() {
            
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