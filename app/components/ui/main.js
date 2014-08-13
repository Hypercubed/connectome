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
    .controller('MainCtrl', function ($scope, $rootScope, $log, $state, $filter, $templateCache, debounce, site, localStorageService, loadedData, forceGraph, hiveGraph) {

      $rootScope.site = site;

      $rootScope.$on('$routeChangeError', function(event) {
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

      //$scope.selected = {};

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

      $scope.saveJson = function() {  // TODO: a directive/service?
        var txt = graphService.graph.getJSON();
        var blob = new Blob([txt], { type: 'data:text/json' });
        saveAs(blob, 'lr-graph.json');
      };

      $scope.saveGml = function() {  // TODO: a directive/service?
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
      //var _ticked = _F('ticked');
      //var _i = _F('i');
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

        $scope.data.pairs.filter(_ticked($scope.selectedIds.pairs));
        $scope.data.cells.filter(_ticked($scope.selectedIds.cells));
        $scope.data.genes.filter(_ticked($scope.selectedIds.genes));

        //console.log($scope.selectedIds.cells);

      }

      $scope.max = Math.max;  // still used?

      $scope.revoveSelectedItem = function(index) {  // TODO: move
        //item.fixed = false; graphData.selectedItems.slice($index, 1); graph.update();
        graphService.data.selectedItems[index].fixed = false;
        graphService.data.selectedItems.splice(index, 1);
        graphService.update();
      };

      var updateNetwork = debounce(function updateNetwork() {  // This should be handeled by the directive
        $log.debug('update network');
        console.log('update network');

        //console.log($scope.selected.genes);
        //if (newVal === oldVal) {return;}
        //if (angular.equals(newVal, oldVal)) {return;}
        if (graphService) {
          graphService.makeNetwork($scope.data, $scope.options);
          graphService.draw($scope.options);
        }

      });

      $scope.data = loadedData;
      loadSelection();
      updateNetwork();

      ['cells','pairs','genes'].forEach(function setSelectionWatch(key) {
        var arr = $scope.data[key];
        var watchFn = function () {
          return arr.map(_ticked);
        };
        var callBack = function() {
          console.log('dataChanged',key);
          $scope.selectedIds[key] = arr.filter(_ticked).map(_i);
          updateNetwork();
        };
        $scope.$watch(watchFn, callBack,true);
      });

      $scope.$watchCollection('options', updateNetwork);

      $scope.gridOptions = {};

      $scope.itemClicked = function(row) {
        if (row.selected == true) {
          console.log(row);
          row.selectionProvider.selectedItems.forEach(function(d) {
            d.ticked = row.entity.ticked;
          });
        }
      }

      $scope.gridOptions.default = {
        showFooter: true,
        enableSorting: true,
        multiSelect: true,
        showFilter: true,
        showGroupPanel: true,
        enableCellSelection: false,
        selectWithCheckboxOnly: false,
        showSelectionCheckbox: true,
        enableColumnResize: true,
        checkboxCellTemplate: '<div class="ngCellText"></div>',
        beforeSelectionChange: function(row, e) {
          if (!angular.isArray(row) && !e.ctrlKey && !e.shiftKey) {
            row.selectionProvider.toggleSelectAll(false,true);
            //console.log(row, this);
            //row.selectionProvider.selectedItems.forEach(function(d) {
              //d.ticked = row.entity.ticked;
              //console.log(row.selectionProvider.getSelectionIndex(d));
            //});
            //row.selectionProvider.selectedItems = [];
          }
          return true;
        },
        //afterSelectionChange: function(rowItem) {
        //  console.log(rowItem.entity);
        //},
        columnDefs: [
          {
            field:'ticked',
            displayName:'Visible',
            width: 60,
            cellTemplate: '<div class="ngCellText"><input tabindex="-1" type="checkbox" ng-change="itemClicked(row)" ng-model="row.entity.ticked" /></div>'
          },
          {field:'name', displayName:'Name'}
        ]
      };

      $scope.gridOptions.cells = angular.extend({}, $scope.gridOptions.default,{
        data: 'data.cells',
        columnDefs: $scope.gridOptions.default.columnDefs.concat([
          {field:'meta.Ontology', displayName:'Ontology'}
        ])
        //columnDefs: [
        //  {field:'ticked', displayName:'Selected',cellTemplate: '<div class="ngSelectionCell"><input tabindex="-1" class="ngSelectionCheckbox" type="checkbox" ng-model="row.entity.ticked" /></div>'},
        //  {field:'name', displayName:'Name'},
        //  {field:'meta.Ontology', displayName:'Ontology'}
        //]
      });

      $scope.gridOptions.genes = angular.extend({}, $scope.gridOptions.default, {
        data: 'data.genes',
        columnDefs: $scope.gridOptions.default.columnDefs.concat([
          {field:'class', displayName:'Type'},
          {field:'age', displayName:'Age'},
          {field:'taxon', displayName:'Taxon',cellFilter:'number'},
          {field:'consensus', displayName:'Consensus'},
          {field:'description', displayName:'Description'},
          {field:'hgncid', displayName:'HGNC ID'},
          {field:'uniprotid', displayName:'UniProt ID'}
        ])
      });

      var cellLigandTemplate = '<div class="ngCellText">\
        <input type="checkbox" ng-disabled="row.getProperty(\'index.0\') < 0" ng-model="data.genes[row.getProperty(\'index.0\')].ticked"></input> \
        {{row.getProperty(col.field)}} \
      </div>';

      var cellReceptorTemplate = '<div class="ngCellText">\
        <input type="checkbox" ng-disabled="row.getProperty(\'index.1\') < 0" ng-model="data.genes[row.getProperty(\'index.1\')].ticked"></input> \
        {{row.getProperty(col.field)}} \
      </div>';

      $scope.gridOptions.pairs = angular.extend({}, $scope.gridOptions.default, {
        data: 'data.pairs',
        //selectedItems: $scope.data.pairs.filter(_ticked),
        columnDefs: $scope.gridOptions.default.columnDefs.concat([
          {field:'Ligand', displayName:'Ligand',cellTemplate: cellLigandTemplate},
          {field:'Receptor', displayName:'Receptor',cellTemplate: cellReceptorTemplate},
        ])
      });

      $scope.$watchCollection('gridOptions.cells.selectedItems', function() {
        console.log($scope.gridOptions.cells);
      });

      //console.log($scope.data.pairs);

    });

  app
    .controller('PanelCtrl', function ($scope, localStorageService) {

      this.state = {
        info: false,
        data: false
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
