/* global saveAs */
/* global _F */
/* global Base64 */
/* global ngGridFlexibleHeightPlugin */

(function() {
  'use strict';

  var _value = _F('value');
  var _specificity = _F('specificity');
  var _ticked = _F('ticked');
  var _i = _F('i');

  var app = angular.module('lrSpaApp');

  app
    .controller('ResetCtrl', function ($state,localStorageService) {
      localStorageService.clearAll();
      $state.go('home.hive-graph');
    });

  app
    .controller('MainCtrl', function ($scope, $rootScope, $log, $state, $filter, $templateCache, $timeout, $window, $location, growl, filterFilter, cfpLoadingBar, debounce, site, localStorageService, loadedData, ligandReceptorData, forceGraph, hiveGraph) {

      $rootScope.$on('$routeChangeError', function(event) {
        $log.warn(event);
      });

      $rootScope.site = site;
      $scope.data = loadedData;

      $scope.max = Math.max;  // TODO: check if still needed

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
        pairs: [1189],
        cells:[10,13,15,16,17,30,33,51,56,62,69,72,73,80,86,101,105,139],
        genes:[145,768]
      };

      // Options
      localStorageService.bind($scope, 'options', angular.extend({}, defaultOptions));
      localStorageService.bind($scope, 'selectedIds', angular.extend({}, defaultIds));

      //$scope.selected = {};
      $scope.resetOptions = function() {
        $scope.options = angular.extend({}, defaultOptions);
        clearlocks();
      };

      function clearlocks() {
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
        $scope.selectedIds = angular.extend({}, {pairs:[],cells:[],genes:[]});
        loadSelection();
      };

      $scope.updateSelection = function() {
        graphService.data.selectedItems = graphService.data.nodes.filter(_F('fixed'));
      };

      $scope.rightClick = function(e) {  // TODO: check if still needed
        if (e.target.__data__ && e.target.__data__.type) {
          $scope.clickedItem = e.target.__data__;
        } else {
          $scope.clickedItem = null;
        }
      };

      // Graph service
      var graphService; // This should controlled by the directive

      $scope.state = $state.current;

      $scope.$watch('state.name', function(name) {
        $state.go(name);
        if (graphService) {graphService.clear();}
        graphService = (name === 'home.hive-graph') ? hiveGraph : forceGraph;
        $scope.graph = graphService;
        $scope.graphData = graphService.data;
        updateNetwork();
      });

      // TODO: move to saveModel controller
      $scope.saveJson = function() {  // TODO: a directive/service?
        var txt = graphService.graph.getJSON();
        var blob = new Blob([txt], { type: 'text/json' });
        saveAs(blob, 'lr-graph.json');
      };

      $scope.saveGml = function() {  // TODO: a directive/service?
        var txt = graphService.graph.getGML();
        var blob = new Blob([txt], { type: 'text/gml' });
        saveAs(blob, 'lr-graph.gml');
      };

      function loadSelection() {

        function _ticked(arr) {
          return function(d) {
            if (d.locked) { return false; }
            d.fixed = false;
            d.ticked = arr.indexOf(d.i) > -1;
            return d.ticked;
          };
        }

        $log.debug('load from local storage');

        $scope.data.pairs.filter(_ticked($scope.selectedIds.pairs));
        $scope.data.cells.filter(_ticked($scope.selectedIds.cells));
        $scope.data.genes.filter(_ticked($scope.selectedIds.genes));

      }

      $scope.revoveSelectedItem = function(index) {  // TODO: check if still needed
        graphService.data.selectedItems[index].fixed = false;
        graphService.data.selectedItems.splice(index, 1);
        graphService.update();
      };

      var updateNetwork = debounce(function updateNetwork() {  // This should be handeled by the directive
        $log.debug('update network');

        if (graphService) {
          graphService.makeNetwork($scope.data, $scope.options);
          graphService.draw($scope.options);
          saveUndo();
        }

      });


      // TODO: move these to findModelCtrl
      $scope.showExpressionEdges = function _showExpressionEdges(_filter, max) {
        var filter = angular.copy(_filter);
        var acc = (filter.rank === 'specificity') ? _specificity : _value;

        if (filter.gene.class !== '') {
          delete filter.gene.id;
        }

        filter.gene = angular.extend({}, filter.gene, {locked: false});
        filter.cell = angular.extend({}, filter.cell, {locked: false});

        //console.log(filter);

        filter.ligandMin = $scope.options.ligandFilter;
        filter.receptorMin = $scope.options.receptorFilter;

        var start = new Date().getTime();

        var edges;

        if (filter.gene.class === 'each') {
          var f = angular.copy(filter);
          f.gene.class = 'ligand';
          var edges1 = ligandReceptorData.getExpressionValues(f, max, acc);

          f.gene.class = 'receptor';
          var edges2 = ligandReceptorData.getExpressionValues(f, max, acc);

          edges = edges1.concat(edges2);
        } else {
          edges = ligandReceptorData.getExpressionValues(filter, max, acc);
        }

        $log.debug('found',edges.length,'expression edges');

        if (edges.length < 1) {
          growl.addWarnMessage('No expression edges match search criteria and expression thresholds.');
        } else {
          //growl.addSuccessMessage('Found '+edges.length+' expression edges');

          edges.forEach(function(d) {
            d.gene.ticked = true;
            d.cell.ticked = true;
          });

          loadedData.pairs.forEach(function(pair) {
            pair.ticked = !pair.locked && pair.ligand.ticked && pair.receptor.ticked;
          });
        }

        var time = (new Date().getTime()) - start;
        $log.debug('Execution time:', time/1000, 's');

      };

      $scope.showPaths = function _showPaths(_filter, max) {
        var filter = angular.copy(_filter);

        var acc = (filter.rank === 'specificity') ? _specificity : _value;

        filter.pair = angular.extend({}, filter.pair, {locked: false});
        filter.pair.ligand = angular.extend({}, filter.pair.ligand, {locked: false});
        filter.pair.receptor = angular.extend({}, filter.pair.receptor, {locked: false});
        filter.source =  angular.extend({}, filter.source, {locked: false});
        filter.target = angular.extend({}, filter.target, {locked: false});

        cfpLoadingBar.start();
        var start = new Date().getTime();

        $timeout(function() {

          filter.ligandMin = $scope.options.ligandFilter;
          filter.receptorMin = $scope.options.receptorFilter;

          var paths;

          if (filter.direction === 'each' && !angular.equals(filter.target, filter.source)) {
            $log.debug('Bi-directional search');

            var f = angular.copy(filter);  // do I need this, already a copy?
            f.direction = 'AB';

            var paths1 = ligandReceptorData.getPathways(f, max, acc);

            f = angular.copy(filter);
            f.direction = 'BA';
            f.source = filter.target;
            f.target = filter.source;

            var paths2 = ligandReceptorData.getPathways(f, max, acc);

            paths = paths1.concat(paths2);
          } else {
            paths = ligandReceptorData.getPathways(filter, max, acc);
          }

          $log.debug('found',paths.length,'expression edges');

          if (paths.length < 1) {
            growl.addWarnMessage('No pathways match search criteria and expression thresholds.');
          } else {
            paths.forEach(function(d) {
              d.pair.ticked = true;
              d.source.ticked = true;
              d.ligand.ticked = true;
              d.receptor.ticked = true;
              d.target.ticked = true;
            });
          }

          var time = (new Date().getTime()) - start;
          $log.debug('Execution time:', time/1000, 's');

          cfpLoadingBar.complete();
        });

      };

      $scope.hide = function(arr) {  // TODO: check if still needed
        if (!angular.isArray(arr)) { arr = [arr]; }
        arr.forEach(function(d) {
          if (d.type === 'gene' || d.type === 'sample') {
            d.ticked = false;
          }
        });
      };

      $scope.pathFilter = {  // TODO: check if still needed
        source: {},
        target: {}
      };

      // TODO: create a state service
      $scope.undoStack = [];
      $scope.undoIndex = -1;

      function saveUndo() {
        var b = save();
        if ($scope.undoStack[$scope.undoIndex] !== b) {
          $scope.undoStack.push(b);
          $scope.undoIndex = $scope.undoStack.length-1;
        }
      }

      $scope.undo = function() {
        $scope.undoIndex--;
        var b = $scope.undoStack[$scope.undoIndex];
        load(b);
      };

      $scope.redo = function() {
        $scope.undoIndex++;
        var b = $scope.undoStack[$scope.undoIndex];
        load(b);
      };

      function save() {
        var obj = {
          i: $scope.selectedIds,
          o: $scope.options,
          v: site.apiVersion
        };
        var json = JSON.stringify(obj);
        return Base64.encode(json);
      }

      function load(bin) {
        var json = Base64.decode(bin);
        var obj = JSON.parse(json);

        if (obj.v !== site.apiVersion) {
          $log.warn('Possible version issue');
        }

        $log.debug('load',obj);

        $scope.selectedIds = obj.i;
        $scope.options = obj.o;

        loadSelection();
        updateNetwork();
      }

      //$scope.loadSave = function() {// TODO: check if still needed
      //  var ret = $window.prompt('Copy this url to your clipboard to save the current state.', $scope.getSaveUrl());
      //};

      $scope.getSaveUrl = function() {
        return $location.absUrl()+'?save='+save();
      };

      // Start here
      clearlocks();

      if ($location.search().save) {
        var b = $location.search().save;
        load(b);
        $location.search('save',null);
      } else {
        loadSelection();
        updateNetwork();
      }

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

      /*jshint -W055 */
      $scope.ngGridPlugins = [new ngGridFlexibleHeightPlugin()];
      /*jshint +W055 */

    });

})();
