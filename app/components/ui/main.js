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
      $scope.resetOptions = function() {
        $scope.options = angular.extend({}, defaultOptions);
      }

      $scope.resetVis = function() {
        $scope.resetOptions();
        $scope.selectedIds = angular.extend({}, defaultIds);
        loadSelection();
      };

      $scope.clearVis = function() {
        $scope.resetOptions();
        $scope.selectedIds = angular.extend({}, {pairs:[],cells:[],genes:[]});
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

      function byId(arr) {
        var r = {};
        arr.forEach(function(d) {
          r[d.id] = d;
        });
        return r;
      }

      $scope.map = {};
      $scope.map.genes = byId($scope.data.genes);
      $scope.map.cells = byId($scope.data.cells);
      $scope.map.pairs = byId($scope.data.pairs);

      console.log($scope.data);  //expr[gene.i + 1][cell.i + 1]

      var i = 0;  var a = [];
      $scope.data.cells.forEach(function(lcell) {
        var lc = lcell.i;
        $scope.data.pairs.forEach(function(pair) {
          var lg = pair.index[0];
          var rg = pair.index[1];

          var le = (lg > -1) ? $scope.data.expr[lg+1][lc+1] : 0;
          if (le == 0) { return;}

          $scope.data.cells.forEach(function(rcell) {
            var rc = rcell.i;
            var re = (rg > -1) ? $scope.data.expr[rg+1][rc+1] : 0;
            var p = le*re;
            if (re == 0 || p == 0) { return;}

            var aa = {
              lc: lc,
              lg: lg,
              rg: rg,
              rc: rc,
              le: le,
              re: re,
              p: p
            };

            //a.push(aa);
            
            if (i % 1000000 == 0) { 
              console.log(i, aa);
            }

            i++;
          });
        });
      });
      console.log(i);

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

      $scope.gridOptions = {};

      $scope.itemClicked = function(row) {
        if (row.selected == true) {
          row.selectionProvider.selectedItems.forEach(function(d) {
            d.ticked = row.entity.ticked;
          });
        }
      }

      var GridOptions = function(options) {

        var defaults = {
          showFooter: true,
          enableSorting: true,
          multiSelect: true,
          showFilter: true,
          showGroupPanel: false,
          enableCellSelection: false,
          selectWithCheckboxOnly: false,
          showSelectionCheckbox: true,
          enableColumnResize: true,
          //checkboxCellTemplate: '<div class="ngCellText">{{row.rowIndex}}</div>',
          beforeSelectionChange: function(row, e) {  // Without shift or ctrl deselect previous
            if (!angular.isArray(row) && !e.ctrlKey && !e.shiftKey) {
              row.selectionProvider.toggleSelectAll(false,true);
            }
            return true;
          },
          columnDefs: [
            {
              field:'ticked',
              displayName:'Visible',
              width: 60,
              cellTemplate: 'cellTemplate'
            },
            {field:'name', displayName:'Name'}
          ]
        };

        options.columnDefs = defaults.columnDefs.concat(options.columnDefs);
        angular.extend(this, defaults, options);
      };

      $scope.gridOptions = {};

      $scope.gridOptions.cells = new GridOptions({
        data: 'data.cells',
        columnDefs: [
          {field:'meta.Ontology', displayName:'Ontology'}
        ]
      });

      $scope.gridOptions.genes = new GridOptions({
        data: 'data.genes',
        columnDefs: [
          {field:'class', displayName:'Type'},
          {field:'age', displayName:'Age'},
          {field:'taxon', displayName:'Taxon',cellFilter:'number'},
          {field:'consensus', displayName:'Consensus'},
          {field:'description', displayName:'Description'},
          {field:'hgncid', displayName:'HGNC ID'},
          {field:'uniprotid', displayName:'UniProt ID'}
        ]
      });

      $scope.gridOptions.pairs = new GridOptions({
        data: 'data.pairs',
        columnDefs: [
          {field:'Ligand', displayName:'Ligand',cellTemplate: 'cellLigandTemplate'},
          {field:'Receptor', displayName:'Receptor',cellTemplate: 'cellReceptorTemplate'},
        ]
      });

      //$scope.gridOptions.cells = angular.extend({}, defaultGridOptions,{
      //  data: 'data.cells',
      //  columnDefs: defaultGridOptions.columnDefs.concat([
      //    {field:'meta.Ontology', displayName:'Ontology'}
      //  ])
      //});

      /* $scope.gridOptions.genes = angular.extend({}, defaultGridOptions, {
        data: 'data.genes',
        columnDefs: defaultGridOptions.columnDefs.concat([
          {field:'class', displayName:'Type'},
          {field:'age', displayName:'Age'},
          {field:'taxon', displayName:'Taxon',cellFilter:'number'},
          {field:'consensus', displayName:'Consensus'},
          {field:'description', displayName:'Description'},
          {field:'hgncid', displayName:'HGNC ID'},
          {field:'uniprotid', displayName:'UniProt ID'}
        ])
      }); */

      /* $scope.gridOptions.pairs = angular.extend({}, defaultGridOptions, {
        data: 'data.pairs',
        columnDefs: defaultGridOptions.columnDefs.concat([
          {field:'Ligand', displayName:'Ligand',cellTemplate: 'cellLigandTemplate'},
          {field:'Receptor', displayName:'Receptor',cellTemplate: 'cellReceptorTemplate'},
        ])
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
