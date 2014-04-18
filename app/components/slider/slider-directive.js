(function() {
  'use strict';

  // Todo: min, customize labels, scale function

  var baseUrl = 'components/slider/';

  var app = angular.module('lrSpaApp');

  app
    .directive('panel', function() {
      return {
        scope: {
          heading: '@',
          label: '@',
          isOpen: '=?'
        },
        restrict: 'EA',
        transclude: true,   // Grab the contents to be used as the heading
        templateUrl: baseUrl+'panel.html',
        controller: function() {
          this.setLabel = function(element) {
            this.label = element;
          };
        },
        link: function(scope) {
          scope.toggleOpen = function() {
            scope.isOpen = !scope.isOpen;
          };
        }
      };
    });

  app
    .directive('panelLabel', function() {
    return {
      restrict: 'EA',
      transclude: true,   // Grab the contents to be used as the heading
      template: '',       // In effect remove this element!
      replace: true,
      require: '^panel',
      link: function(scope, element, attr, ctrl, transclude) {
        ctrl.setLabel(transclude(scope, function() {}));
      }
    };
  });

  app
    .directive('panelTransclude', function() {
    return {
      require: '^panel',
      link: function(scope, element, attr, controller) {
        scope.$watch(function() { return controller[attr.panelTransclude]; }, function(heading) {
          if ( heading ) {
            element.html('');
            element.append(heading);
          }
        });
      }
    };
  });

  app
    .directive('slider', function($timeout) {
      return {
        scope: {
          value: '=ngModel',
          max: '=',
          min: '=',
        },
        templateUrl: baseUrl+'slider.html',
        link: function(scope, element, attrs) {
          element.addClass('slider');

          if (angular.isUndefined(attrs.expanded)) {
            scope.expanded = true;
          }

          function changeInputValue(newVal) {
            scope.rangeValue = newVal;
            update();
          }

          var stop;
          function changeRangeValue(newVal, oldVal) {
            if (newVal === oldVal) {return;}

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

          scope.rangeValue = scope.value;
          update();
          
          scope.$watch('value', changeInputValue);
          scope.$watch('rangeValue', changeRangeValue);
          scope.$watch('max', update);
          scope.$watch('min', update);

        }
      };
    });

})();