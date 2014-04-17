

(function() {
  'use strict';
  
  var app = angular
    .module('lrSpaApp', ['chieffancypants.loadingBar','localytics.directives','snap','LocalStorageModule','ui.bootstrap']);

  app
  .config(function(localStorageServiceProvider){
    localStorageServiceProvider.setPrefix('lr');
  });

  app
    .config(function($logProvider) {
      $logProvider.debugEnabled(false);
    });

})();

