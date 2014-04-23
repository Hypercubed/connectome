(function() {
  'use strict';
  
  var app = angular.module('lrSpaApp');

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
        url: '^/hive',
        views: {
          'panel': { templateUrl: 'components/jordan_network/panel.html', controller: 'TreeGraphCtrl' },
          'header': { templateUrl: 'components/tree/legend.html' }
        }
      });

  });

})();
