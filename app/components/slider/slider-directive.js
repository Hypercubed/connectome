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
        compile: function(tElement, tAttrs, transclude) {
          return this.link
        },
        link: function(scope, element) {
          element.addClass('slider');
          var $range = element.find('input[type=range]');

          scope.max = +scope.max || 1;
          scope.min = +scope.min || 0;
          scope.step = +scope.step || 0.01;
          scope.fractionSize = parseInt(Math.log(scope.step)/Math.log(0.1));
          console.log(scope.fractionSize);
          scope.value = +scope.value || 0;
          scope.rangeValue = +scope.value || 0;
          scope.numberValue = +scope.value || 0;

          var applyValue = debounce(function(value) {
            scope.value = +value;
          }, 100);

          function changeRangeValue(newVal, oldVal) {

            scope.rangeValue = +newVal;
            updateDom();

            applyValue(+newVal);
          }

          function changeNumberValue(newVal, oldVal) {

            scope.numberValue = +newVal;
            updateDom();

            applyValue(+newVal);
          }

          function updateRange() {

            $range.attr('max', scope.max);  // Need to update range before value.
            $range.attr('min', scope.min);
            $range.attr('step', scope.step);

            scope.rangeValue = +scope.value;
            scope.numberValue = +scope.value;
            updateDom();
          }

          function updateDom() {
            scope.percent = (+scope.value-scope.min)/(scope.max-scope.min)*100;
            scope.left = scope.percent > 10;
            scope.right = scope.percent < 90;
          }

          updateRange();
          
          scope.$watch('rangeValue', changeRangeValue);
          scope.$watch('numberValue', changeNumberValue);
          scope.$watchCollection('[value,max,min,step]', updateRange);

        }
      };
    });

})();