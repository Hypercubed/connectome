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
        views: {
          'panel': { templateUrl: 'components/force/panel.html', controller: 'ForceGraphCtrl' },
          'header': { templateUrl: 'components/force/force-legend.html' }
        }
      })
      .state('home.hive-graph', {
        url: '^/hive',
        views: {
          'panel': { templateUrl: 'components/force/panel.html', controller: 'HiveGraphCtrl' },
          'header': { templateUrl: 'components/hive/hive-legend.html' }
        }
      });

  });

})();
