(function() {
  'use strict';

  var app = angular.module('lrSpaApp');

  app.config(function($stateProvider, $urlRouterProvider) {

    $urlRouterProvider.otherwise('/hive');

    $stateProvider
      //.state('home', {
        //abastract: true,
        //url: '/',
        //controller: 'MainCtrl'//,
        //templateUrl: 'components/ui/main.html'
      //})
      .state('force-graph', {
        url: '^/force',
        resolve: { graphService: 'forceGraph' },
        controller: 'MainCtrl',
        templateUrl: 'components/ui/main.html'//,
        //views: {
        //  'panel': { templateUrl: 'components/force/panel.html' },
        //  'header': { templateUrl: 'components/force/force-legend.html' }
        //}
      })
      .state('hive-graph', {
        url: '^/hive',
        resolve: { graphService: 'hiveGraph' },
        controller: 'MainCtrl',
        templateUrl: 'components/ui/main.html'//,
        //views: {
        //  'panel': { templateUrl: 'components/force/panel.html' },
        //  'header': { template: '' }
        //}
      });

  });

})();
