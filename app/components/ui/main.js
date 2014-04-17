/* global d3 */
/* global networkGraph */

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
    .constant('EXPRESSIONFILE', 'data/LR.expr.txt')
    .constant('PAIRSFILE', 'data/LR.pairs.txt');

  app
    .controller('MainCtrl', function () {

  });

  app
    .controller('UICtrl', function ($scope, $log, $http, $q, cfpLoadingBar, localStorageService, PAIRSFILE, EXPRESSIONFILE) {

      console.log(localStorageService);

      $scope.panelState = {
        filters: true,
        options: false,
        help: true
      }

      var selected = $scope.selected = {};
      $scope.selected.pairs = []; //localStorage.getItem(STORE+'pairs') || [];
      $scope.selected.cells = []; //localStorage.getItem(STORE+'cells') || [];

      var data = $scope.data = {};
      $scope.data.expr = [];
      $scope.data.pairs = [];
      $scope.data.cells = [];

      var graph = $scope.graph = {};
      $scope.graph.nodes = {};
      $scope.graph.edges = {};

      //$scope.exprRange = [0,1];
      $scope.exprValue = 0;
      $scope.exprMax = 0;

      localStorageService.bind($scope, 'panelState', {filters: true,options: false,help: true})
      localStorageService.bind($scope, 'options', {showLabels: true,maxEdges: 100});

      $scope.edgeCount = 0;

      $scope.ligandRange = { min: 0, max: 1000000, val: 10 };
      $scope.receptorRange = { min: 0, max: 10000000, val: 10 };

      var chart = networkGraph();

      var valueFormat = d3.format('.2f');

      var join = function(d) {return d.join(' '); };

      chart.nodeTooltip.html(function(d) {
        var s = (selected.pairs.length > 1) ? 'Sum of' : '';
        var html = [['<b>',d.name,'</b>']];

        if (d.values[0] > 0) {html.push([s, 'Ligand expression:',valueFormat(d.values[0])]);}
        if (d.values[1] > 0) {html.push([s, 'Receptor expression:',valueFormat(d.values[1])]);}

        if (d.ligands.length > 0)   {html.push(['Ligands:',d.ligands]);}
        if (d.receptors.length > 0) {html.push(['Receptors:',d.receptors]);}

        return html.map(join).join('<br>');
      });

      chart.linkTooltip.html(function(d) {
        var s = (selected.pairs.length > 1) ? 'Sum of' : '';
        var html = [
          s,'Ligand expression:',valueFormat(d.values[0]),
          '<br />', s,'Receptor expression:',valueFormat(d.values[1]),
          '<br />', s,'Product:',valueFormat(d.value)
        ];
        return html.join(' ');
      });

      var A = $http.get(PAIRSFILE, {cache: true})
        .success(function(data) {
          data = d3.tsv.parse(data);

          $log.debug('Pairs loaded:',data.length);

          data.forEach(function(d,i) {
            d.id = i;
          });

          $scope.data.pairs = data;

        }).error(function(data, status, headers, config) {
          $log.warn('Error',data, status, headers, config);
        });

      var B = $http.get(EXPRESSIONFILE, {cache: true})
        .success(function(data) {
          data = d3.tsv.parseRows(data);

          $log.debug('Genes loaded:',data.length);

          $scope.data.expr = data;

          $scope.data.cells = data[0].slice(1).map(function(d,i) {
            return { name: d, id: i };
          });

          $log.debug('Samples loaded:',$scope.data.cells.length);

          //makeNetwork();

        }).error(function(data, status, headers, config) {
          $log.warn('Error',data, status, headers, config);
        });

      $q.all([A, B]).then(function() {
        $log.debug('Done loading');

        var _expr = $scope.data.expr;

        $scope.data.pairs.forEach(function(_pair) {  // Get ligand and receptor indecies in expression table

          _pair.index = [-1,-1];

          for (var i = 1; i < _expr.length; i++) {  // start from 1, skipping header
            var gene = _expr[i][0];

            if (gene === _pair.Ligand)   {_pair.index[0] = i;}
            if (gene === _pair.Receptor) {_pair.index[1] = i;}

            if (_pair.index[0] > -1 && _pair.index[1] >-1) {break;}
          }

          if (_pair.index[0] < 0 || _pair.index[1] < 0) {
            $log.warn('Ligand or receptor missing from expression table');
          }

        });

        loadSelection();

        makeNetwork(true,false);

        $scope.$watchCollection('selected', makeNetwork);

        $scope.$watch('ligandRange.val', makeNetwork);
        $scope.$watch('receptorRange.val', makeNetwork);
        $scope.$watch('options.maxEdges', makeNetwork);

        $scope.$watch('options.showLabels', function() {
          d3.select('#vis svg')
            .classed('labels',$scope.options.showLabels);
        });

      });

      function saveSelection() {
        var _id = function(d) { return d.id; };

        var _pairs = selected.pairs.map(_id);
        var _cells = selected.cells.map(_id);

        localStorageService.set('pairs', _pairs);
        localStorageService.set('cells', _cells);
        localStorageService.set('ligandRange', $scope.ligandRange);
        localStorageService.set('receptorRange', $scope.receptorRange);
      }

      function loadSelection() {

        function _idin(arr) {
          return function(d) {
            return arr.indexOf(d.id) > -1;
          };
        }

        //console.log(localStorage.getItem(STORE+'pairs'));

        var _pairs = localStorageService.get('pairs') || [317];
        var _cells = localStorageService.get('cells') || [12,13,14,15,16,17,18,19,20,21,22,23,24,25,26];

        $log.debug('load from local stoarge',_pairs,_cells);

        if (_pairs.length < 1) { _pairs = [317]; }
        if (_cells.length < 1) { _cells = [12,13,14,15,16,17,18,19,20,21,22,23,24,25,26]; }

        selected.pairs = data.pairs.filter(_idin(_pairs));
        selected.cells = data.cells.filter(_idin(_cells));

        $scope.ligandRange = localStorageService.get('ligandRange') || $scope.ligandRange;
        $scope.receptorRange = localStorageService.get('receptorRange') || $scope.receptorRange;
        
      }

      function makeNetwork(newVal, oldVal) {
        if (newVal === oldVal) {return;}

        saveSelection();

        $log.debug('Constructing network');
        if ($scope.selected.cells.length < 1 && $scope.selected.pairs.length < 1) { return;}

        cfpLoadingBar.start();

        graph.nodes = selected.cells;

        graph.nodes.forEach(function(n) {
          n.ligands = [];
          n.receptors = [];
          n.lout = [];
          n.lin = [];
          n.values = [0,0];
        });

        cfpLoadingBar.inc();

        $log.debug('Nodes: ',graph.nodes.length);
        $log.debug('Pairs: ',selected.pairs.length);

        graph.edges = [];
        //$scope.exprRange[1] = 1;

        $scope.ligandRange.max = 100;
        $scope.receptorRange.max = 100;

        $scope.selected.pairs.forEach(addLinks);

        $scope.ligandRange.max = Math.ceil($scope.ligandRange.max);
        $scope.receptorRange.max = Math.ceil($scope.receptorRange.max);

        $scope.ligandRange.val = Math.min($scope.ligandRange.val,$scope.ligandRange.max);
        $scope.receptorRange.val = Math.min($scope.receptorRange.val,$scope.receptorRange.max);

        $scope.edgeCount = graph.edges.length;

        cfpLoadingBar.inc();

        if (graph.edges.length > $scope.options.maxEdges) {

          $log.warn('Too many edges', graph.edges.length);

          graph.edges = graph.edges
            .sort(function(a,b) { return b.value - a.value; })
            .slice(0,$scope.options.maxEdges);

        }

        $log.debug('Edges: ',$scope.graph.edges.length);

        cfpLoadingBar.inc();

        graph.edges.forEach(function(d, i) {  // Set in/out links
          d.index = i;

          d.source.lout.push(i);
          d.target.lin.push(i);

          d.count = d.source.lout.filter(function(_i) {
            var _target = graph.edges[_i].target;
            return (_target === d.target);
          }).length;

          //d.source.values[0] += +d.values[0] || 0;  // Ligand
          //d.target.values[1] += +d.values[1] || 0;  // Receptor

        });

        //graph.nodes.forEach(function(d) {
        //  console.log(d);
        //});

        graph.nodes = graph.nodes.filter(function(d) {   // Filtered nodes
          return (d.lout.length + d.lin.length) > 0;
        });

        cfpLoadingBar.inc();

        draw();

        //$scope.exprRange = d3.extent(graph.edges, function(d) { return d.value; });

        cfpLoadingBar.complete();

      }

      function addLinks(_pair,i) {

        var _expr = $scope.data.expr;

        var lindex = _pair.index[0];
        var rindex = _pair.index[1];
       
        if (lindex > -1 && rindex > -1) {

          graph.nodes.forEach(function(src) {  // all selected cell-cell pairs
            //console.log(src.ligands, src.receptors);

            var lexpr = +_expr[lindex][src.id+1];
            if (lexpr === 0) {return;}

            if (src.ligands.indexOf(_pair.Ligand) < 0) {
              src.ligands.push(_pair.Ligand);
              src.values[0] += +lexpr;
            }

            graph.nodes.forEach(function(tgt) {
              var rexpr = +_expr[rindex][tgt.id+1];
              if (rexpr === 0) {return;}

              if (tgt.receptors.indexOf(_pair.Receptor) < 0) {
                tgt.receptors.push(_pair.Receptor);
                tgt.values[1] += +rexpr;
              }

              $scope.ligandRange.max = Math.max(lexpr, $scope.ligandRange.max);
              $scope.receptorRange.max = Math.max(rexpr, $scope.receptorRange.max);

              var value = lexpr*rexpr;
              //$scope.exprRange[1] = Math.max(value, $scope.exprRange[1]);

              if (value > 0 && lexpr >= $scope.ligandRange.val && rexpr >= $scope.receptorRange.val) {  // src and tgt are talking!!!
                //var lrs = _pair.Ligand + ' -> ' + _pair.Receptor;
                var cells = src.name + ' -> ' + tgt.name;
                //console.log(cells);

                var edge = graph.edges.filter(function(d) { return d.name === cells; });

                if (edge.length === 0) {
                  edge = {
                    source: src,
                    target: tgt,
                    value:0,
                    name: cells,
                    values: [0, 0]
                  };
                  graph.edges.push(edge);
                } else if (edge.length === 1 && $scope.selected.pairs.length > 1) {
                  edge = edge[0];
                } else {
                  $log.warn('Duplicate edges found', edge.length);
                }

                edge.value += value;
                edge.values[0] += +lexpr;
                edge.values[1] += +rexpr;
     
              }


            });
          });

          /* for (var i = 0; i < ligandRow.length; i++) {
          for (var j = 0; j < receptorRow.length; j++) {

            var src = graphData.nodes[i];
            var tgt = graphData.nodes[j];

            var value = (+ligandRow[i])*(+receptorRow[j]);
            var lrs = _pair.Ligand + ' -> ' + _pair.Receptor;
            var cells = src.name + ' -> ' + tgt.name;

            if (value > minValue && graphData.nodes[i].selected && graphData.nodes[j].selected) {

              var link = graphData.links.filter(function(d) { return d.name == cells; });
              
              if (link.length > 0) {  // Existing
                link = link[0];
                console.log('duplicate found');
              } else {        // New
                link = { 
                  source: src,
                  target: tgt,
                  value:0, 
                  name: cells, 
                  values: [0, 0 ]  
                };
                graphData.links.push(link);
              }

              link.value += value;
              link.values[0] += +ligandRow[i];
              link.values[1] += +receptorRow[j];
              
            }

          }
          } */

          //DEBUG && console.log('sortCount',sortCount)
        }

      }

      function draw() {
        d3.select('#vis svg')
          .classed('labels',$scope.options.showLabels)
          .datum(graph)
          .call(chart);
      }

    });

})();