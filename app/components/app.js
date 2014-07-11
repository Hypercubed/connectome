

(function() {
  'use strict';

  var app = angular
    .module('lrSpaApp', [
      'ngSanitize',
      'multi-select',
      'hc.slider',
      'hc.dsv',
      'debounce',
      'panels',
      'ngAnimate',
      'ui.router',
      'chieffancypants.loadingBar',
      'snap',
      'LocalStorageModule',
      'ui.bootstrap',
      'hc.downloader',
      'angular-growl',
      'pasvaz.bindonce',
      'ng-context-menu'
    ]);

  app
    .constant('site', {
      name: 'ligand-receptor-connectome',
      version: '0.0.3'
    });

  app
    .config(function(localStorageServiceProvider, site){
      localStorageServiceProvider.setPrefix(site.name+'-'+site.version);
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
