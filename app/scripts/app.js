

(function() {
  'use strict';
  
  var app = angular
    .module('lrSpaApp', ['chieffancypants.loadingBar','localytics.directives']);

  app.constant('$d3', window.d3);

})();

