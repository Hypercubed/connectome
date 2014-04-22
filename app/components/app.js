

(function() {
  'use strict';
  
  var app = angular
    .module('lrSpaApp', [ 'sliders', 'debounce', 'panels', 'ui.router','chieffancypants.loadingBar','localytics.directives','snap','LocalStorageModule','ui.bootstrap']);

  app
  .config(function(localStorageServiceProvider){
    localStorageServiceProvider.setPrefix('lr');
  });

  app
    .config(function($logProvider) {
      $logProvider.debugEnabled(true);
    });

})();

