(function() {
  'use strict';

  // Todo: min, customize labels, scale function

  var baseUrl = 'components/slider/';

  var app = angular.module('sliders',[]);

  app
    .directive('slider', function($timeout, debounce) {
      return {
        scope: {
          value: '=ngModel',
          max: '=',
          min: '=',
          step: '=?'
        },
        templateUrl: baseUrl+'slider.html',
        link: function(scope, element) {
          element.addClass('slider');

          scope.max = +scope.max || 10000;
          scope.min = +scope.min || 0;
          scope.step = +scope.step || 1;
          scope.value = +scope.value || 0;    

          var applyValue = debounce(function() {
            var val = scope.rangeValue*(scope.max-scope.min);
            scope.value = Math.round(val)/100+scope.min;
          }, 100);

          function changeRangeValue(newVal, oldVal) {
            if (newVal == oldVal) {return;}

            scope.rangeValue = +newVal;
            updateDom();

            applyValue();
          }

          function updateRange() {
            scope.rangeValue = (scope.value-scope.min)/(scope.max-scope.min)*100;
            updateDom();
          }

          function updateDom() {
            scope.left = scope.rangeValue > 10;
            scope.right = scope.rangeValue < 90;
          }

          updateRange();
          
          scope.$watch('rangeValue', changeRangeValue);
          scope.$watchCollection('[value,max,min,step]', updateRange);

        }
      };
    });

})();