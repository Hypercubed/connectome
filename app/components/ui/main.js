/* global saveAs */
/* global _F */

(function() {
  'use strict';

  var app = angular.module('lrSpaApp');

  app
    .config(function(snapRemoteProvider) {
      snapRemoteProvider.globalOptions = {
        disable: 'right',
        maxPosition: 350,
        tapToClose: false,
        touchToDrag: false
      };
    });

  app
    .controller('MainCtrl', function ($scope, $rootScope, $log, $state, debounce, localStorageService, ligandReceptorData, graphService, snapRemote) {

      //$scope.$watch(function() { return $scope.snapper.state().state; }, function(state) {
      //  console.log(state);
      //})

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
        download: true,
        info: true,
        snapper: true
      });

      //console.log('local storage state', $scope.panelState.snapperState);

      snapRemote.getSnapper().then(function(snapper) {

        if ($scope.panelState.snapperState) {
          snapper.open();
        } else {
          snapper.close();
        }

        snapper.on('open', function() {
          //console.log('Drawer opened!');
          $scope.panelState.snapperState = true;
        });

        snapper.on('close', function() {
          //console.log('Drawer closed!');
          $scope.panelState.snapperState = false;
        });
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
      //$scope.selected = {
      //  pairs: [],
      //  cells: []
      //};

      $scope.selectedIds = {
        pairs: [],
        cells: []
      };

      //var _id = _F('_id');
      var _ticked = _F('ticked');
      var _i = _F('i');
      //var _index = _F('$index');
      //var _type = _F('type');

      function loadSelection() {

        function _ticked(arr) {
          return function(d) {
            d.ticked = arr.indexOf(d.i) > -1;
            return d.ticked;
          };
        }

        $log.debug('load from local storage');

        localStorageService.bind($scope, 'selectedIds', {
          pairs: [374],
          cells: [72,73],
          genes: []
        });

        //console.log($scope.selectedIds.pairs.length);

        $scope.data.pairs.forEach(_ticked($scope.selectedIds.pairs));
        $scope.data.cells.forEach(_ticked($scope.selectedIds.cells));
        $scope.data.genes.forEach(_ticked($scope.selectedIds.genes));

        //$scope.selected.pairs = $scope.data.pairs.filter(_ticked($scope.selectedIds.pairs));
        //$scope.selected.cells = $scope.data.cells.filter(_ticked($scope.selectedIds.cells));
        //$scope.selected.genes = $scope.data.genes.filter(_ticked($scope.selectedIds.genes));

      }

      $scope.max = Math.max;

      $scope.revoveSelectedItem = function(index) {  // TODO: move
        //item.fixed = false; graphData.selectedItems.slice($index, 1); graph.update();
        $scope.graphData.selectedItems[index].fixed = false;
        $scope.graphData.selectedItems.splice(index, 1);
        $scope.graph.update();
      };

      var updateNetwork = function updateNetwork() {  // This should be handeled by the directive
        $log.debug('update network');

        //console.log($scope.selected.genes);
        //if (newVal === oldVal) {return;}
        //if (angular.equals(newVal, oldVal)) {return;}
        graph.makeNetwork($scope.data, $scope.options);
        graph.draw($scope.options);
      };

      function saveSelectionIds(key) {
        return function(newVal) {
          //return;

          if ($scope.graphData.hoverEvent) {
            graph.update();
            $scope.graphData.hoverEvent = false;
          }

          var newIds = newVal.filter(_ticked).map(_i);

          if (!angular.equals(newIds, $scope.selectedIds[key])) {
            //console.log('new ids', key);
            $scope.selectedIds[key] = newIds;
            //if (key === 'cells') {updateSampleExpression();}
            updateNetwork(newIds,$scope.selectedIds);
          } else {
            //graph.update();
          }

        };
      }

      ligandReceptorData.load().then(function() {

        $scope.data = ligandReceptorData.data;

        loadSelection();

        updateNetwork(true,false);

        $scope.$watch('data.cells', saveSelectionIds('cells'),true);
        $scope.$watch('data.pairs', saveSelectionIds('pairs'),true);
        $scope.$watch('data.genes', saveSelectionIds('genes'),true);

        //$scope.$watch('selected.pairs', saveSelectionIds('pairs'));
        //$scope.$watch('selected.cells', saveSelectionIds('cells'));
        //$scope.$watch('selected.genes', saveSelectionIds('genes'));

        $scope.$watchCollection('selectedIds', updateNetwork);
        //$scope.$watchCollection('selectedIds.pairs', updateNetwork);
        //$scope.$watchCollection('selectedIds.cells', updateNetwork);
        //$scope.$watchCollection('selectedIds.genes', updateNetwork);

        $scope.$watchCollection('options', updateNetwork);
        //$scope.$watch('options.receptorFilter', updateNetwork);
        //$scope.$watch('options.ligandRankFilter', updateNetwork);
        //$scope.$watch('options.receptorRankFilter', updateNetwork);
        //$scope.$watch('options.edgeRankFilter', updateNetwork); // TODO: filter in place

        $scope.$watch('options.showLabels', function() {
          graph.draw($scope.options);
        });

      });

      //$scope.test = function() {
      //  console.log($scope.data.genes[417]);
      //}

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
      scope: {
        item: '=graphItem',
        data: '=',
        graphData: '='
      },
      templateUrl: 'components/ui/item.html'
    };
  });

  app
  .directive('neighborsList', function() {
    return {
      scope: {
        list: '=neighborsList',
        array: '=',
        title: '&',
        key: '&'
      },
      templateUrl: 'components/ui/neighbors-list-template.html',
      link: function (scope, element, attrs) {
        scope.limit = 3;
        scope.key = attrs.key;

        scope.hover = function(item, __) {
          if (item.ticked) {
            item.hover = __;
          }
        };

        scope.click = function(item) {
          item.ticked = !item.ticked;
        };

        scope.expand = function() {
          scope.limit = (scope.limit + 10 < scope.list.length) ? scope.limit + 10 : scope.list.length;
        };

      }
    };
  });

  app
  .directive('expressionList', function() {
    return {
      scope: {
        list: '=expressionList',
        array: '=',
        key: '&'
      },
      templateUrl: 'components/ui/gene-list-template.html',
      link: function (scope, element, attrs) {
        scope.limit = 3;

        attrs.key = attrs.key || 'gene';  // todo: change
        scope.key = attrs.key;

        scope.get = function(_) {
          var __ = _[attrs.key];

          if (typeof __ === 'number' && attrs.array) {  // this is an id
            return scope.array[__];
          } else {
            return __;
          }
        };

        scope.hover = function(item, __) {
          if (item.ticked) {
            item.hover = __;
          }
        };

        scope.click = function(item) {
          item.ticked = !item.ticked;
        };

        scope.expand = function() {
          scope.limit = (scope.limit + 10 < scope.list.length) ? scope.limit + 10 : scope.list.length;
        };

      }
    };
  });

})();
