(function() {
  'use strict';

  angular.module('lrSpaApp')

  .config(function($stateProvider, $urlRouterProvider) {

    $urlRouterProvider.otherwise('/hive');

    $stateProvider
      .state('home', {
        //abastract: true,
        resolve: { loadedData: ['ligandReceptorData', function(ligandReceptorData) {  // note: this injection gets ignored by ng-min
          return ligandReceptorData.load();
        }]},
        url: '/',
        controller: 'MainCtrl',
        templateUrl: 'components/ui/main.html'
      })
      .state('home.force-graph', {
        url: '^/force'
      })
      .state('home.hive-graph', {
        url: '^/hive'
      })
      .state('reset', {
        url: '^/reset',
        controller: 'ResetCtrl'
      });

  });

})();
