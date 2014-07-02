(function() {
  'use strict';

  var baseUrl = 'components/ui/';

  var app = angular.module('panels',[]);

  app
    .directive('panel', function($timeout) {
      return {
        scope: {
          heading: '@',
          label: '@',
          isOpen: '=?'
        },
        restrict: 'EA',
        transclude: true,   // Grab the contents to be used as the heading
        templateUrl: baseUrl+'panel.html',
        //controller: function() {
//
        //  this.setLabel = function(element) {
        //    this.label = element;
        //  };

        //},
        link: function(scope) {

          scope.ngIf = scope.isOpen;

          scope.toggleOpen = function() {

            if (scope.isOpen) {
              scope.isOpen = false;
              $timeout(function() {
                scope.ngIf = false;
              });
            } else {
              scope.ngIf = true;
              $timeout(function() {
                scope.isOpen = true;
              });
            }

          };

        }
      };
    });

  /* app
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
  }); */

})();
