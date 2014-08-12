/* global saveAs */
/* global _F */

(function() {
  'use strict';

  var app = angular.module('lrSpaApp');

  app
    .controller('ResetCtrl', function ($state,localStorageService) {
      localStorageService.clearAll();
      $state.go('home.hive-graph');
    });

  /* app
    .controller('GraphCtrl', function($scope, $rootScope, $state, forceGraph, hiveGraph) {
      var self = this;

      self.graphService = ($state.current.name === 'home.hive-graph') ? hiveGraph : forceGraph;
      self.graphData = this.graphService.data;

      $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams){
        if (self.graphService) {self.graphService.clear();}
        self.graphService = (toState === 'home.hive-graph') ? hiveGraph : forceGraph;
        self.graphData = self.graphService.data;
      })

      /* function updateNetwork() {  // This should be handeled by the directive
        $log.debug('update network');

        if (self.graphService) {
          self.graphService.makeNetwork($scope.data, $scope.options);
          self.graphService.draw($scope.options);
        }

      };

    });*/

  app
    .controller('MainCtrl', function ($scope, $rootScope, $log, $state, $filter, $templateCache, localStorageService, ngTableParams, loadedData, forceGraph, hiveGraph) {

      $rootScope.$on("$routeChangeError", function(event, current, previous, rejection) {
          console.log(event);
      });

      var _ticked = _F('ticked');
      var _i = _F('i');

      var defaultOptions = {
        showLabels: true,
        maxEdges: 100,
        ligandFilter: 10,
        receptorFilter: 10,
        ligandRankFilter: 1,
        receptorRankFilter: 1,
        edgeRankFilter: 1,
      };

      var defaultIds = {
        pairs: loadedData.pairs.map(_i),
        cells:[0,1,2,10,28,33,51,57,69,72,73,80,86,101,105,130,139,140],
        genes:[282,283]
      };

      // Options
      localStorageService.bind($scope, 'options', angular.extend({}, defaultOptions));
      localStorageService.bind($scope, 'selectedIds', angular.extend({}, defaultIds));

      $scope.selected = {};

      $scope.reset = function() {
        $scope.options = angular.extend({}, defaultOptions);
        $scope.selectedIds = angular.extend({}, defaultIds);

        loadSelection();
      };

      $scope.updateSelection = function() {
        graphService.data.selectedItems = graphService.data.nodes.filter(_F('fixed'));
      };

      $scope.rightClick = function(e) {
        if (e.target.__data__ && e.target.__data__.type) {
          $scope.clickedItem = e.target.__data__;
        } else {
          $scope.clickedItem = null;
        }
      };

      /* $scope.hideChildren = function(clickedItem) {
        var arr = graphService.data.outEdgesIndex[clickedItem.id];
        if (arr) {
          for (var key in arr) {
            arr[key].target.ticked = false;
          }
        }
      };

      $scope.hideParents = function(clickedItem) {
        var arr = graphService.data.inEdgesIndex[clickedItem.id];
        if (arr) {
          for (var key in arr) {
            arr[key].source.ticked = false;
          }
        }
      }; */

      $scope.showOutNeighbors = function(clickedItem, N) {
        var arr = graphService.data.outEdgesIndex[clickedItem.id];
        if (N !== undefined) {
          arr = arr.slice(0,N);
        }
        arr.forEach(function(d) {
          d.target.ticked = true;
        });
      };

      $scope.showInNeighbors = function(clickedItem, N) {
        var arr = graphService.data.inEdgesIndex[clickedItem.id];
        if (N !== undefined) {
          arr = arr.slice(0,N);
        }
        arr.forEach(function(d) {
          d.source.ticked = true;
        });
      };

      // Graph service
      var graphService; // = ($state.current.name === 'home.hive-graph') ? hiveGraph : forceGraph;

      $scope.state = $state.current;

      $scope.$watch('state.name', function(name) {
        $state.go(name);
        if (graphService) {graphService.clear();}
        graphService = (name === 'home.hive-graph') ? hiveGraph : forceGraph;
        $scope.graph = graphService;
        $scope.graphData = graphService.data;
        updateNetwork();
      });

      $scope.saveJson = function() {  // TODO: a service?
        var txt = graphService.graph.getJSON();
        var blob = new Blob([txt], { type: 'data:text/json' });
        saveAs(blob, 'lr-graph.json');
      };

      $scope.saveGml = function() {  // TODO: a service?
        var txt = graphService.graph.getGML();
        var blob = new Blob([txt], { type: 'data:text/gml' });
        saveAs(blob, 'lr-graph.gml');
      };

      // Panel state
      /* localStorageService.bind($scope, 'panelState', {
        nodeFilters: false,
        edgeFilters: false,
        options: false,
        help: true,
        download: false,
        info: true,
        snapper: true
      });

      snapRemote.getSnapper().then(function(snapper) {
        if ($scope.panelState.snapper) {
          snapper.open();
        } else {
          snapper.close();
        }

        snapper.on('open', function() {
          //console.log('Drawer opened!');
          $scope.panelState.snapper = true;
        });

        snapper.on('close', function() {
          //console.log('Drawer closed!');
          $scope.panelState.snapper = false;
        });
      }); */



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

        //localStorageService.bind($scope, 'selectedIds', {
        //  pairs: $scope.data.pairs.map(_i),
        //  cells: [72,73],
        //  genes: [201,202,203,204,205]
        //});

        //console.log($scope.selectedIds.pairs.length);

        $scope.data.pairs.forEach(_ticked($scope.selectedIds.pairs));
        $scope.data.cells.forEach(_ticked($scope.selectedIds.cells));
        $scope.data.genes.forEach(_ticked($scope.selectedIds.genes));

        console.log('loadSelection');

        $scope.selected.pairs = $scope.data.pairs.filter(_F('ticked'));
        $scope.selected.cells = $scope.data.cells.filter(_F('ticked'));
        $scope.selected.genes = $scope.data.genes.filter(_F('ticked'));

      }

      $scope.max = Math.max;  // still used?

      $scope.revoveSelectedItem = function(index) {  // TODO: move
        //item.fixed = false; graphData.selectedItems.slice($index, 1); graph.update();
        graphService.data.selectedItems[index].fixed = false;
        graphService.data.selectedItems.splice(index, 1);
        graphService.update();
      };

      var updateNetwork = function updateNetwork() {  // This should be handeled by the directive
        $log.debug('update network');

        //console.log($scope.selected.genes);
        //if (newVal === oldVal) {return;}
        //if (angular.equals(newVal, oldVal)) {return;}
        if (graphService) {
          graphService.makeNetwork($scope.data, $scope.options);
          graphService.draw($scope.options);
        }

      };

      function dataChanged(key) {
        return function(newVal) {
          console.log('dataChanged',key);
          if (graphService.data.hoverEvent) {
            graphService.update();
            graphService.data.hoverEvent = false;
          }

          $scope.selectedIds[key] = newVal.filter(_ticked).map(_i);

        };
      }

      function selectionIdsChanged(key) {
        return function(newVal, oldVal) {
          if (angular.equals(newVal, oldVal)) { return; }
          console.log('selectionIdsChanged',key);

          updateGridSelection(key);
          updateNetwork();
        }
      }

      function updateGridSelection(key) {
        $scope.data[key].forEach(function(d,i) {
          $scope.gridOptions[key].selectRow(i,d.ticked);
        });
      }

      //ligandReceptorData.load().then(function(loadedData) {

      $scope.data = loadedData;

      loadSelection();

      updateNetwork(true,false);

      $scope.$watch('data.cells', dataChanged('cells'),true);  // checks if ticked is changed, updates selection ids
      $scope.$watch('data.pairs', dataChanged('pairs'),true);
      $scope.$watch('data.genes', dataChanged('genes'),true);

      $scope.$watchCollection('selectedIds.cells', selectionIdsChanged('cells'));
      $scope.$watchCollection('selectedIds.pairs', selectionIdsChanged('pairs'));
      $scope.$watchCollection('selectedIds.genes', selectionIdsChanged('genes'));

      $scope.$watchCollection('options', updateNetwork);

      $scope.gridOptions = {};

      $scope.gridOptions.default = {
        showFooter: true,
        enableSorting: true,
        multiSelect: true,
        showFilter: true,
        showSelectionCheckbox: true,
        enableCellSelection: false,
        selectWithCheckboxOnly: true,
        afterSelectionChange: function(rows,e) {
          if (!angular.isArray(rows)) {
            rows = [rows];
          }
          rows.forEach(function(row) {
            row.entity.ticked = row.selected;
          });
          return true;
        },
        //selectedItems: $scope.mySelections,
        //checkboxCellTemplate: '<div class="ngSelectionCell"><input tabindex="-1" class="ngSelectionCheckbox" type="checkbox" ng-model="row.entity.ticked" /></div>',
        columnDefs: [{field:'name', displayName:'Name'}]
      };

      $scope.gridOptions.cells = angular.extend({}, $scope.gridOptions.default,{
        data: 'data.cells',
        selectedItems: $scope.data.cells.filter(_ticked),
        columnDefs: [
          {field:'name', displayName:'Name'},
          {field:'meta.Ontology', displayName:'Meta'}
        ]
      });

      $scope.gridOptions.genes = angular.extend({}, $scope.gridOptions.default, {
        data: 'data.genes',
        selectedItems: $scope.data.genes.filter(_ticked),
        columnDefs: [
          {field:'name', displayName:'Name'},
          {field:'age', displayName:'Age'},
          {field:'taxon', displayName:'Taxon'},
          {field:'consensus', displayName:'Consensus'},
          {field:'description', displayName:'Description'},
          {field:'hgncid', displayName:'HGNC ID'},
          {field:'uniprotid', displayName:'uniprot ID'}
        ]
      });

      $scope.gridOptions.pairs = angular.extend({}, $scope.gridOptions.default, {
        data: 'data.pairs',
        selectedItems: $scope.data.pairs.filter(_ticked),
      });

    });

  app
    .controller('PanelCtrl', function ($scope, localStorageService) {

      this.state = {
        nodeFilters: false,
        edgeFilters: false,
        options: false,
        help: true,
        download: false,
        info: true,
        snapper: true
      };

      // Panel state
      localStorageService.bind($scope, 'panelState', this.state);

      /* snapRemote.getSnapper().then(function(snapper) {
        if ($scope.panelState.snapper) {
          snapper.open();
        } else {
          snapper.close();
        }

        snapper.on('open', function() {
          //console.log('Drawer opened!');
          $scope.panelState.snapper = true;
        });

        snapper.on('close', function() {
          //console.log('Drawer closed!');
          $scope.panelState.snapper = false;
        });
      }); */

    });

  /* app
    .directive('graph', function() {
      return {
        scope: {
          graphService: '=graphServce',
          data: '=',
          graphData: '='
        },
        template: '<svg></svg>'
      };
    }); */

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
