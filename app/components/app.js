

(function() {
  'use strict';
  
  var app = angular
    .module('lrSpaApp', [ 'hc.slider', 'debounce', 'panels', 'ngAnimate', 'ui.router','chieffancypants.loadingBar','localytics.directives','snap','LocalStorageModule','ui.bootstrap','hc.downloader','angular-growl']);

  app
  .config(function(localStorageServiceProvider){
    localStorageServiceProvider.setPrefix('lr');
  });

  app
    .config(function($logProvider) {
      $logProvider.debugEnabled(false);
    });

  app
    .config(['growlProvider', function(growlProvider) {
      growlProvider.globalTimeToLive(5000);
    }]);

})();

