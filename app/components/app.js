

(function() {
  'use strict';
  
  var app = angular
    .module('lrSpaApp', [ 'multi-select', 'hc.slider', 'hc.dsv', 'debounce', 'panels', 'ngAnimate', 'ui.router','chieffancypants.loadingBar','snap','LocalStorageModule','ui.bootstrap','hc.downloader','angular-growl']);

  app
    .constant('name','ligand-receptor-connectome')  // Change this to one meta object
    .constant('version','0.0.2');  // bump to clear local storage

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

