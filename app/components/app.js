

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
      $logProvider.debugEnabled(false);
    });

  app.config(function($stateProvider, $urlRouterProvider) {

    $urlRouterProvider.otherwise('/directed-graph');

    $stateProvider
      .state('home', {
        abastract: true,
        url: '/',
        templateUrl: 'components/ui/main.html',
        controller: 'MainCtrl'
      })
      .state('home.directed-graph', {
        url: '^/directed-graph',
        views: {
          'panel': { templateUrl: 'components/jordan_network/panel.html', controller: 'PanelCtrl' },
          'header': { templateUrl: 'components/jordan_network/header.html' }
        }
      })
      .state('home.tree-graph', {
        url: '^/tree',
        views: {
          'panel': { templateUrl: 'components/jordan_network/panel.html', controller: 'TreeGraphCtrl' },
          'header': { template: '' }
        }
      });

  });

})();

