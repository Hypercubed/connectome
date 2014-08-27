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
    .controller('MainCtrl', function ($scope, $rootScope, $log, $state, $filter, $templateCache, $timeout, filterFilter, cfpLoadingBar, debounce, site, localStorageService, loadedData, forceGraph, hiveGraph) {

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
        cells:[10,13,15,16,17,30,33,51,56,62,69,72,73,80,86,101,105,139],
        genes:[145,768]
      };

      // Options
      localStorageService.bind($scope, 'options', angular.extend({}, defaultOptions));
      localStorageService.bind($scope, 'selectedIds', angular.extend({}, defaultIds));

      //$scope.selected = {};
      $scope.resetOptions = function() {
        $scope.options = angular.extend({}, defaultOptions);
        loadedData.pairs.forEach(function(d) {
          d.locked = false;
        });
        loadedData.genes.forEach(function(d) {
          d.locked = false;
        });
        loadedData.cells.forEach(function(d) {
          d.locked = false;
        });
      }

      $scope.resetVis = function() {
        $scope.options = angular.extend({}, defaultOptions);
        $scope.selectedIds = angular.extend({}, defaultIds);
        loadSelection();
      };

      $scope.clearVis = function() {
        //$scope.resetOptions();
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

      // Graph service
      var graphService; // = ($state.current.name === 'home.hive-graph') ? hiveGraph : forceGraph;

      //$scope.showNeighbors = graphService.showNeighbors;

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
            if (d.locked) { return false; };
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
        //console.log('update network');

        //console.log($scope.selected.genes);
        //if (newVal === oldVal) {return;}
        //if (angular.equals(newVal, oldVal)) {return;}
        if (graphService) {
          graphService.makeNetwork($scope.data, $scope.options);
          graphService.draw($scope.options);
        }

      });

      $scope.data = loadedData;

      function PathData() {
        //var expresionValues = null;
        //var pathways = null;

        /* function _getExpressionValue(gene, cell) {
          if (gene.type !== 'gene' || cell.type !== 'sample') {
            $log.warn('Possible error in _getExpression');
          }
          return (gene.i > -1 && cell.i > -1) ? +loadedData.expr[gene.i + 1][cell.i + 1] : 0;
        }

        function _calcExpressionValues() {
          var edges = [];

          loadedData.genes.forEach(function(gene) {
            loadedData.cells.forEach(function(cell) {
              var v = _getExpressionValue(gene, cell);
              var min = Math.max($scope.options[gene.class+'Filter'],0);
              if (v > min) {
                edges.push(
                {
                  gene: gene,
                  cell: cell,
                  value: v
                });
              };
            });
          });

          expresionValues = edges.sort(function(a,b) { return b.value - a.value; });
          $log.debug('found',expresionValues.length, 'expression values');
        }

        function _calcPathways() {
          var paths = [];

          $log.debug('Calculating pathways');

          var ligandMin = $scope.options['ligandFilter'];
          var receptorMin = $scope.options['receptorFilter'];

          var len = loadedData.expr[0].length-1;

          loadedData.pairs.forEach(function (pair,a) {

            var ii = pair.ligand.i;
            var jj = pair.receptor.i;

            console.log(ii,jj);

            if (ii < 0 || jj < 0) { return; }

            for (var i = 0; i < len; i++) {
              var l = +loadedData.expr[ii+1][i+1];
              if (l <= ligandMin) { continue; }

              for (var j = 0; j < len; j++) {
                var r = +loadedData.expr[jj+1][j+1];
                if (r <= receptorMin) { continue; }

                var v = l*r;

                if (v > 0) {

                  paths.push({
                    pair: pair,
                    source: loadedData.cells[i],
                    ligand: pair.ligand,
                    receptor: pair.receptor,
                    target: loadedData.cells[j],
                    ligandExpression: l,
                    receptorExpression: r,
                    product: v
                  });

                }

              };
            };

          });

          $log.debug('sorting',paths.length,'paths');
          pathways = paths.sort(function(a,b) { return b.product - a.product; });
          $log.debug('found',pathways.length,'paths');
        } */

        function _match(obj, text) {
          if (text === '') { return true; }

          // if both are objects check each key
          if (obj && text && typeof obj === 'object' && typeof text === 'object' ) {
            if (angular.equals(obj, text)) { return true; }
            for (var key in text) {
              if (!hasOwnProperty.call(obj, key) || !_match(obj[key], text[key])) {
                return false;
              }
            }
            return true;          
          }
          
          // if array, check ao leats one match
          if (angular.isArray(text)) {
            if (text.length === 0) { return true; }
            for (var key in text) {
              if (_match(obj, text[key])) {
                return true;
              }
            }
            return false;
          }

          if (typeof text === 'boolean') {
            return obj === text;
          }

          return ''+obj === ''+text;
        }

        /* function getExpressionValuesCached(filter) {  // todo: non-caching version
          filter = filter || {};

          if (expresionValues == null) {
            _calcExpressionValues();
          }

          return expresionValues.filter(function(expr) {
            console.log(expr);
            if (filter.gene && !_match(expr.gene,filter.gene)) { return false; }
            if (filter.cell && !_match(expr.cell,filter.cell)) { return false; }
            return true;
          });

        } */

        function getExpressionValues(filter, max, acc) {  // todo: non-caching version
          filter = filter || {};
          acc = acc || _F('value');

          var edges = [];

          loadedData.genes.forEach(function(gene) {
            if (gene.i < 0) { return; }
            if (gene.locked) { return false; }
            if (filter.gene && !_match(gene,filter.gene)) { return false; }
            

            var min = Math.max($scope.options[gene.class+'Filter'],0);

            loadedData.cells.forEach(function(cell) {
              if (cell.i < 0) { return; }
              if (cell.locked) { return false; }
              if (filter.cell && !_match(cell,filter.cell)) { return false; }

              var v = +loadedData.expr[gene.i+1][cell.i+1];

              if (v > min) {  // todo: insertion sort
                edges.push(
                {
                  gene: gene,
                  cell: cell,
                  value: v,
                  specificity: (v+1)/(gene.median+1)
                });
              };

            });
          });

          return edges.sort(function(a,b){ return acc(b) - acc(a); }).slice(0,max);
          $log.debug('found',expresionValues.length, 'expression values');

        }

        /* function getPathwaysCached(filter, max) {  // this version uses caching
          max = max || 10;

          if (pathways == null) {
            _calcPathways();
          }

          if (filter == undefined) {
            return pathways;
          }

          var _paths = [];

          var count = 0;

          for (var k in pathways) {
            path = path[k];

            if (filter.pair && filter.pair.id && filter.pair.id !== path.pair.id) { return false; }
            if (filter.pair && filter.pair.ticked !== undefined && filter.pair.ticked !== path.pair.ticked) { return false; }

            if (filter.ligand && filter.ligand.id !== path.pair.ligand.id) { return false; }
            if (filter.receptor && filter.receptor.id !== path.pair.receptor.id) { return false; }

            if (filter.source && !_match(path.source,filter.source)) { return false; }
            if (filter.target && !_match(path.target,filter.target)) { return false; }

            count++;

            _paths.push(path);

          }
 
          $log.debug('found',max,'paths out of',count);
          return _paths.slice(0,max);

        } */

        function getPathways(filter, max, acc) {  // this version does not use caching
          max = max || 10;
          acc = acc || _F('value');

          var paths = [];

          $log.debug('Calculating pathways');
          
          console.log(filter);

          var ligandMin = $scope.options['ligandFilter'];
          var receptorMin = $scope.options['receptorFilter'];

          var len = loadedData.expr[0].length-1;

          var count = 0;

          loadedData.pairs.forEach(function (pair) {

            if (pair.locked) { return false; }

            if (pair.ligand.i < 0 || pair.receptor.i < 0) { return; }

            if (filter.pair && !_match(pair,filter.pair)) { return; }

            if (pair.ligand.locked) { return false; }
            if (pair.receptor.locked) { return false; }

            if (filter.ligand && !_match(pair.ligand,filter.ligand)) { return; }
            if (filter.receptor && !_match(pair.receptor,filter.receptor)) { return; }

            loadedData.cells.forEach(function(source)  {

              if (source.locked) { return false; }

              var l = +loadedData.expr[pair.ligand.i+1][source.i+1];
              var ls = (l+1)/(pair.ligand.median+1);

              if (l <= ligandMin) { return; }

              if (filter.source && !_match(source,filter.source)) { return; }
              if (filter.cell && !_match(source,filter.cell)) { return; }

              loadedData.cells.forEach(function(target) {

                if (target.locked) { return false; }

                var r = +loadedData.expr[pair.receptor.i+1][target.i+1];
                var rs = (r+1)/(pair.receptor.median+1);

                if (r <= receptorMin) { return; }

                if (filter.target && !_match(target,filter.target)) { return; }
                if (filter.cell   && !_match(target,filter.cell)) { return; }

                //var v = l*r;

                //if (v > 0) {

                  // todo: use insertion sort (fin position, if pos > max, don't push)
                  paths.push({
                    pair: pair,
                    source: source,
                    ligand: pair.ligand,
                    receptor: pair.receptor,
                    target: target,
                    ligandExpression: l,
                    receptorExpression: r,
                    value: l*r,
                    specificity: ls*rs
                  });

                  if (paths.length > max) {  
                    paths = paths.sort(function(a,b) { return acc(b) - acc(a); }).slice(0,max);
                  }

                  count++;
                  
                //}

              });
            });

          });

          //$log.debug('sorting',paths.length,'paths');
          //pathways = paths; //.sort(function(a,b) { return b.product - a.product; }).slice(0,max);
          $log.debug('found',paths.length,'paths out of',count);

          //console.log(paths);

          return paths;
        }

        return {
          getExpressionValues: getExpressionValues,
          getPathways: getPathways
        }

      }

      var pathData = PathData();

      //var start = new Date().getTime();

      //var expresionValues = pathData.getExpressionValues();
      //var pathways = pathData.getPathways();

      //var time = (new Date().getTime()) - start;



      //$log.debug('found',expresionValues.length, 'expression values');
      //$log.debug('found',pathways.length,'paths');
      //$log.debug('Execution time:', time/1000, 's');

      //return;

      // TODO: move and use for constructing network
      /* function _getExpression(gene, cell) {
        if (gene.type !== 'gene' || cell.type !== 'sample') {
          $log.warn('Possible error in _getExpression');
        }
        return (gene.i > -1 && cell.i > -1) ? +loadedData.expr[gene.i + 1][cell.i + 1] : 0;
      } */

      /* function _getExpressionEdges(filter) {
        filter = filter || {};
        var edges = [];

        loadedData.genes.forEach(function(gene) {
          //console.log(filter.gene && !_match(gene,filter.gene), filter.gene && filter.gene !== gene);
          if (filter.gene && !_match(gene,filter.gene)) { return; }
          //if (filter.gene && filter.gene !== gene) { return; }

          //if (gene.class === 'ligand' && filter.target && filter.target !== gene)  { return; }
          //if (gene.class === 'receptor' && filter.source && filter.source !== gene)  { return; }

          loadedData.cells.forEach(function(cell) {
            if (filter.sample && !_match(cell,filter.sample)) { return; }

            //if (gene.class === 'ligand' && filter.source && filter.source !== cell)  { return; }
           // if (gene.class === 'receptor' && filter.target && filter.target !== cell)  { return; }

            var v = _getExpression(gene, cell);
            var min = Math.max($scope.options[gene.class+'Filter'],0);
            if (v > min) {
              edges.push(
              {
                gene: gene,
                cell: cell,
                value: v
              });
            };
          });
        });

        return edges;
      } */

      var _value = _F('value');
      var _specificity = _F('specificity');

      $scope.showExpressionEdges = function _showExpressionEdges(filter, max) {
        var acc = (filter.rank == 'specificity') ? _specificity : _value;

        if (filter.gene.class !== '') {
          delete filter.gene.id;
        }

        if (filter.gene.class == 'each') {
          var f = angular.copy(filter);
          f.gene.class = 'ligand';
          $scope.showExpressionEdges(f,max);
          f.gene.class = 'receptor';
          $scope.showExpressionEdges(f,max);
          return;
        }

        console.log(filter);

        var edges = pathData.getExpressionValues(filter, max, acc);

        max = max || edges.length;
        $log.debug('showing',max,'edges out of',edges.length,'matching edges');

        edges.forEach(function(d) {
          d.gene.ticked = true;
          d.cell.ticked = true;
        });
      }

      /* function _getPathways(filter) {
        filter = filter || {};
        var paths = [];

        loadedData.pairs.forEach(function (pair,i) {
          
          if (filter.pair && filter.pair.id && filter.pair.id !== pair.id) { return; }
          if (filter.pair && filter.pair.ticked !== undefined && filter.pair.ticked !== pair.ticked) { return; }

          if (filter.ligand && filter.ligand.id !== pair.ligand.id) { return; }
          if (filter.receptor && filter.receptor.id !== pair.receptor.id) { return; }

          var ligandExpressionEdges = _getExpressionEdges({ sample: filter.source, gene: pair.ligand });
          if (ligandExpressionEdges.length < 1) { return; }

          var receptorExpressionEdges = _getExpressionEdges({ sample: filter.target, gene: pair.receptor });
          if (receptorExpressionEdges.length < 1) { return; }

          //$log.debug('found',ligandExpressionEdges.length, 'ligand expression values');
          //$log.debug('found',receptorExpressionEdges.length, 'receptor expression values');

          ligandExpressionEdges.forEach(function(ledge) {

            receptorExpressionEdges.forEach(function(redge) {
 
              var v = ledge.value*redge.value;
              
              if (v > 0) {

                paths.push({
                  pair: pair,
                  source: ledge.cell,
                  ligand: pair.ligand,
                  receptor: pair.receptor,
                  target: redge.cell,
                  ligandExpression: ledge.value,
                  receptorExpression: redge.value,
                  product: v
                });

              }

            });
          });
        });

        

        return paths;
      } */

      $scope.showPaths = function _showPaths(filter, max, acc) {

        var acc = (filter.rank == 'specificity') ? _specificity : _value;

        if (filter.direction == 'each') {
          var f = angular.copy(filter);
          f.direction = 'AB';
          $scope.showPaths(f,max);
          f.source = filter.target;
          f.target = filter.source;
          $scope.showPaths(f,max);
          return;
        }

        cfpLoadingBar.start();

        var start = new Date().getTime();

        $timeout(function() {
          var paths = pathData.getPathways(filter, max, acc);

          paths.forEach(function(d) {
            d.pair.ticked = true;
            d.source.ticked = true;
            d.ligand.ticked = true;
            d.receptor.ticked = true;
            d.target.ticked = true;
          });

          var time = (new Date().getTime()) - start;
          $log.debug('Execution time:', time/1000, 's');

          cfpLoadingBar.complete();
        });

      }

      /* $scope.showAllPaths = function(max) {
        var _cells = loadedData.cells.filter(_ticked);

        var paths = [];

        _cells.forEach(function(c1) {
          _cells.forEach(function(c2) {
            paths = paths.concat(_getPathways({source: c1, target: c2}));
          });
        });

        max = max || paths.length;

        $log.debug('showing',max,'paths out of',paths.length,'matching paths');

        paths.sort(function(a,b) { return b.product - a.product; }).slice(0, max).forEach(function(d) {
          d.pair.ticked = true;
          d.source.ticked = true;
          d.ligand.ticked = true;
          d.receptor.ticked = true;
          d.target.ticked = true;
        });

      } */

      $scope.hide = function(arr) {
        if (!angular.isArray(arr)) { arr = [arr]; };
        arr.forEach(function(d) {
          if (d.type == 'gene' || d.type == 'sample') {
            d.ticked = false;
          }
        });
      }

      $scope.pathFilter = {
        source: {},
        target: {}
      };

      $scope._showPaths = function(filter, max) {
        console.log(filter);
      }

      /* function byId(arr) {
        var r = {};
        arr.forEach(function(d) {
          r[d.id] = d;
        });
        return r;
      } */

      //$scope.map = {};
      //$scope.map.genes = byId($scope.data.genes);
      //$scope.map.cells = byId($scope.data.cells);
      //$scope.map.pairs = byId($scope.data.pairs);

      /* console.log($scope.data);  //expr[gene.i + 1][cell.i + 1]

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
      console.log(i); */

      loadSelection();
      updateNetwork();

      ['cells','pairs','genes'].forEach(function setSelectionWatch(key) {
        var arr = $scope.data[key];
        var watchFn = function () {
          return arr.map(_ticked);
        };
        var callBack = function() {
          //console.log('dataChanged',key);
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
        console.log(row.selectionProvider.selectedItems);

        if (row.entity.locked) {
          row.entity.ticked = false;
        }

        if(row.entity.receptor && row.entity.ligand) {
          row.entity.receptor.ticked = row.entity.ticked;
          row.entity.ligand.ticked = row.entity.ticked;
        }

        if (row.selected == true) {
          row.selectionProvider.selectedItems.forEach(function(d) {
            d.ticked = row.entity.ticked;
            d.locked = row.entity.locked;

            if(d.receptor && d.ligand) {
              d.receptor.ticked = row.entity.ticked;
              d.ligand.ticked = row.entity.ticked;
            }

          });
        }
      }

      var defaults = {
        showFooter: true,
        enableSorting: true,
        multiSelect: true,
        showFilter: true,
        showColumnMenu: false,
        showGroupPanel: false,
        enableCellSelection: false,
        selectWithCheckboxOnly: false,
        showSelectionCheckbox: true,
        enableColumnResize: true,
        //rowTemplate: 'rowTemplate',
        //menuTemplate: 'menuTemplate',
        //checkboxCellTemplate: '<div class="ngCellText"></div>',
        //checkboxHeaderTemplate: '<icon class="ngCellText glyphicon glyphicon-ok" ng-click="toggleSelectAll(allSelected = !allSelected, true)" title="Select All">&nbsp;</icon>',
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
            cellTemplate: 'cellTemplate',
            headerCellTemplate: 'visibleHeaderCellTemplate'
          },

        ]
      };      

      $scope.gridOptions = {};

      $scope.gridOptions.cells = angular.extend({}, defaults, {
        data: 'data.cells',
        columnDefs: [
          defaults.columnDefs[0],
          {field:'name', displayName:'Cell Type'},
          {field:'meta.Ontology', displayName:'Ontology'}
        ]
      });

      $scope.gridOptions.genes = angular.extend({}, defaults, {
        data: 'data.genes',
        columnDefs: [
          defaults.columnDefs[0],
          {field:'name', displayName:'Gene Symbol'},
          {field:'description', width: '25%', displayName:'Gene Name'},
          {field:'class', displayName:'Class'},
          //{field:'age', displayName:'Age',cellFilter:'number'},
          //{field:'consensus', displayName:'Subcellular Localization'},
          {field:'hgncid', displayName:'HGNC ID',cellTemplate:'cellHGNCTemplate'},
          {field:'uniprotid', displayName:'UniProt ID', cellTemplate:'cellUniProtTemplate'},
          {field:'taxon', displayName:'Taxon'}
        ]
      });

      $scope.gridOptions.pairs = angular.extend({}, defaults, {
        data: 'data.pairs',
        columnDefs: [
          defaults.columnDefs[0],
          //{field:'ticked', displayName:'Visible', width: 60, cellTemplate: 'cellPairTemplate'},
          {field:'name', displayName:'Pair Name'},
          {field:'Ligand', displayName:'Ligand',cellTemplate: 'cellLigandTemplate'},
          {field:'Receptor', displayName:'Receptor',cellTemplate: 'cellReceptorTemplate'},
          {field:'source', displayName:'Source',cellTemplate: 'cellPubMedTemplate'}
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
