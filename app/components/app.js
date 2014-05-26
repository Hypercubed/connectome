

(function() {
  'use strict';
  
  var app = angular
    .module('lrSpaApp', [ 'hc.slider', 'debounce', 'panels', 'ngAnimate', 'ui.router','chieffancypants.loadingBar','localytics.directives','snap','LocalStorageModule','ui.bootstrap','hc.downloader','angular-growl']);

  app
    .constant('name','lr')
    .constant('version','0.0.1');  // bump to clear local storage

  app
    .config(function(localStorageServiceProvider, name, version){
      localStorageServiceProvider.setPrefix(name+'-'+version);
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

