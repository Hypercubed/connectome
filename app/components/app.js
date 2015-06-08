

(function() {
  'use strict';

  angular
    .module('lrSpaApp', [
      'ngSanitize',
      'hc.slider',
      'hc.dsv',
      'debounce',
      'panels',
      'ngAnimate',
      'ui.router',
      'localytics.directives',
      'chieffancypants.loadingBar',
      'LocalStorageModule',
      'ui.bootstrap',
      'hc.downloader',
      'angular-growl',
      'pasvaz.bindonce',
      'ng-context-menu',
      'ngGrid',
      'hc.marked',
      'ngClipboard'
    ])

    .constant('site', {
      name: 'ligand-receptor-connectome',
      version: '0.1.0',
      apiVersion: 'lr-1',
      debug: false
    })

    .run(function($rootScope, site) {
      $rootScope.site = site;
    })

    .run(function($window, site) {
      if (site.debug) {
        $window.watchCount = function () {
          var i, data, scope,
          count = 0,
          all = document.all,
          len = all.length,
          test = {};

          for (i=0; i < len; i++) {
            data = angular.element(all[i]).data();
            if (data && data.hasOwnProperty('$scope') && data.$scope.$$watchers) {
              scope = data.$scope;
              if ( ! test[ scope.$id ] ) {
                test[ scope.$id ] = true;
                count += scope.$$watchers.length;
              }
            }
          }
          return count;
        };
      }
    })

    .config(function(localStorageServiceProvider, site){
      localStorageServiceProvider.setPrefix(site.apiVersion);
    })

    .config(function($logProvider, site) {
      $logProvider.debugEnabled(site.debug);
    })

    .config(['growlProvider', function(growlProvider) {
      growlProvider.globalTimeToLive(5000);
    }]);



})();
