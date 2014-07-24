

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
      version: '0.0.4'
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

  /* window.watchCount = function () {
    var i, data, scope,
      count = 0,
      all = document.all,
      len = all.length,
      test = {};

    for (i=0; i < len; i++) {
      data = angular.element(all[i]).data();
      if (data.hasOwnProperty('$scope') && data.$scope.$$watchers) {
        scope = data.$scope;
        if ( ! test[ scope.$id ] ) {
          test[ scope.$id ] = true;
          count += scope.$$watchers.length;
        }
      }
    }
    return count;
  }; */

})();
