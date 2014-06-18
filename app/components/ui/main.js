/* global saveAs */
/* global _F */

(function() {
  'use strict';

  var app = angular.module('lrSpaApp');

  app
    .config(function(snapRemoteProvider) {
      snapRemoteProvider.globalOptions = {
        //disable: 'right',
        maxPosition: 350,
        tapToClose: false,
        touchToDrag: true
      };
    });

  app
    .controller('MainCtrl', function ($scope, $rootScope, $log, $state, localStorageService, ligandReceptorData, graphService) {

      $scope.state = $state.current.name;

      $scope.go = function(name) {
        $scope.state = name;
        $state.go(name);
      };

      /* Manage panel state */
      localStorageService.bind($scope, 'panelState', {
        nodeFilters: true,
        edgeFilters: true,
        options: false,
        help: true,
        download: true
      });

      localStorageService.bind($scope, 'options', {
        showLabels: true,
        maxEdges: 100,
        ligandFilter: 10,
        receptorFilter: 10,
        ligandRankFilter: 0.1,
        receptorRankFilter: 0.1,
        edgeRankFilter: 1,
      });

      var graph = graphService;  // TODO:  don't need this??

      /* network */
      graph.clear();
      $scope.graph = graphService;
      $scope.graphData = graph.data;

      function updateNetwork(newVal, oldVal) {  // This should be handeled by the directive
        if (newVal === oldVal) {return;}
        graph.makeNetwork($scope.selected.pairs, $scope.selected.cells, $scope.data.expr, $scope.options);
        graph.draw($scope.options);
      }

      /* Save */
      $scope.saveJson = function() {  // TODO: a service?
        var txt = graph.getJSON();
        var blob = new Blob([txt], { type: 'data:text/json' });
        saveAs(blob, 'lr-graph.json');
      };

      $scope.saveGml = function() {  // TODO: a service?
        var txt = graph.getGML();
        var blob = new Blob([txt], { type: 'data:text/gml' });
        saveAs(blob, 'lr-graph.gml');
      };

      /* Load Data */
      $scope.selected = {
        pairs: [],
        cells: []
      };

      $scope.selectedIds = {
        pairs: [],
        cells: []
      };

      var _id = _F('id');
      //var _index = _F('$index');

      function saveSelection() {

        $scope.selectedIds.pairs = $scope.selected.pairs.map(_id);
        $scope.selectedIds.cells = $scope.selected.cells.map(_id);

      }

      function loadSelection() {

        function _ticked(arr) {
          return function(d) {
            d.ticked = arr.indexOf(d.id) > -1;
            return d.ticked;
          };
        }

        $log.debug('load from local storage');

        localStorageService.bind($scope, 'selectedIds', {pairs: [374], cells: [72,73] });

        $scope.selected.pairs = $scope.data.pairs.filter(_ticked($scope.selectedIds.pairs));
        $scope.selected.cells = $scope.data.cells.filter(_ticked($scope.selectedIds.cells));

      }

      $scope.max = Math.max;

      ligandReceptorData.load().then(function() {

        $scope.data = ligandReceptorData.data;

        loadSelection();

        updateNetwork(true,false);

        $scope.$watchCollection('options', saveSelection);
        $scope.$watchCollection('selected', saveSelection);

        $scope.$watchCollection('selected', updateNetwork);
        $scope.$watch('options.ligandFilter', updateNetwork);
        $scope.$watch('options.receptorFilter', updateNetwork);
        $scope.$watch('options.ligandRankFilter', updateNetwork);
        $scope.$watch('options.receptorRankFilter', updateNetwork);

        $scope.$watch('options.edgeRankFilter', updateNetwork); // TODO: filter in place
        $scope.$watch('options.showLabels', function() {
          graph.draw($scope.options);
        });

      });

    });

  app
  .filter('percentage', ['$filter', function($filter) {
      return function(input, decimals) {
          return $filter('number')(input*100, decimals)+'%';
        };
    }]);

  app
  .filter('min', function() {
    return function(input) {
      var out;
      if (input) {
        for (var i in input) {
          if (input[i] < out || out === undefined || out === null) {
            out = input[i];
          }
        }
      }
      return out;
    };
  });

  app
  .filter('max', function() {
      return function(input) {
        var out;
        if (input) {
          for (var i in input) {
            if (input[i] > out || out === undefined || out === null) {
              out = input[i];
            }
          }
        }
        return out;
      };
    }
  );

  app
  .directive('graphItem', function() {
    return {
      scope: { item: '=graphItem' },
      templateUrl: 'components/ui/item.html'
    };
  });

  app
  .directive('geneList', function() {
    return {
      scope: {
        genes: '=geneList'//,
        //limit: '&limit'
      },
      template: '<span ng-repeat="gene in genes | limitTo : limit" title="{{gene.value | number:2}}">{{gene.gene}}{{$last ? "" : ","}}</span><a class="button btn-link" ng-if="genes.length > limit" ng-click="expand()">(+ {{genes.length - limit}} more)</a>',
      link: function (scope) {
        scope.limit = 3;

        scope.expand = function() {
          scope.limit = (scope.limit + 10 < scope.genes.length) ? scope.limit + 10 : scope.genes.length;
        };

      }
    };
  });

})();
