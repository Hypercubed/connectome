(function() {
  'use strict';
  
  var app = angular.module('lrSpaApp');

  app.config(function($stateProvider, $urlRouterProvider) {

    $urlRouterProvider.otherwise('/force');

    $stateProvider
      .state('home', {
        abastract: true,
        url: '/',
        templateUrl: 'components/ui/main.html',
        controller: 'MainCtrl'
      })
      .state('home.force-graph', {
        url: '^/force',
        resolve: { graphService: 'forceGraph' },
        views: {
          'panel': { templateUrl: 'components/force/panel.html', controller: 'PanelCtrl' },
          'header': { templateUrl: 'components/force/force-legend.html' }
        }
      })
      .state('home.hive-graph', {
        url: '^/hive',
        resolve: { graphService: 'hiveGraph' },
        views: {
          'panel': { templateUrl: 'components/force/panel.html', controller: 'PanelCtrl' },
          'header': { template: '' }
        }
      });

  });

})();
