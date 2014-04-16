/* global d3 */
/* global networkGraph */

(function() {
  'use strict';

  var app = angular.module('lrSpaApp');

  app
    .config(function(snapRemoteProvider) {
      snapRemoteProvider.globalOptions = {
        disable: 'right',
        maxPosition: 350
      }
    });

  app
    .constant('EXPRESSIONFILE', 'data/LR.expr.txt')
    .constant('PAIRSFILE', 'data/LR.pairs.txt');

  app
    .controller('MainCtrl', function () {

  });

  app
    .controller('UICtrl', function ($scope, $log, $http, $q, cfpLoadingBar, PAIRSFILE, EXPRESSIONFILE) {
      var STORE = 'lr.';

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

      $scope.exprRange = [0,1];
      $scope.exprValue = 0;
      $scope.exprMax = 0;

      $scope.edgeCount = 0;

      $scope.ligandRange = { min: 0, max: 1000000, val: 10 };
      $scope.receptorRange = { min: 0, max: 10000000, val: 10 };
      $scope.maxEdges = 100;

      var chart = networkGraph();

      var valueFormat = d3.format('.2f');

      chart.nodeTooltip.html(function(d) {
        var s = (selected.pairs.length > 1) ? 'Sum of' : '';
        var html = [
          d.name,
          '<br />', s, 'Ligand expression: '+valueFormat(d.values[0]),
          '<br />', s, 'Receptor expression: '+valueFormat(d.values[1])
        ];
        return html.join(' ');
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

          //console.log('localStorage pairs', localStorage.getItem(STORE+'pairs'));

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
        loadSelection();

        makeNetwork(true,false);

        $scope.$watch('selected.pairs', makeNetwork);
        $scope.$watch('selected.cells', makeNetwork);
        $scope.$watch('ligandRange.val', makeNetwork);
        $scope.$watch('receptorRange.val', makeNetwork);
        $scope.$watch('maxEdges', makeNetwork);
      });

      function saveSelection() {
        var _id = function(d) { return d.id; };

        var _pairs = selected.pairs.map(_id);
        var _cells = selected.cells.map(_id);

        localStorage.setItem(STORE+'pairs', JSON.stringify(_pairs));
        localStorage.setItem(STORE+'cells', JSON.stringify(_cells));
        localStorage.setItem(STORE+'ligandRange', JSON.stringify($scope.ligandRange));
        localStorage.setItem(STORE+'receptorRange', JSON.stringify($scope.receptorRange));
      }

      function loadSelection() {

        function _idin(arr) {
          return function(d) {
            return arr.indexOf(d.id) > -1;
          };
        }

        console.log(localStorage.getItem(STORE+'pairs'));

        var _pairs = JSON.parse(localStorage.getItem(STORE+'pairs')) || [317];
        var _cells = JSON.parse(localStorage.getItem(STORE+'cells')) || [12,13,14,15,16,17,18,19,20,21,22,23,24,25,26];

        $log.debug('load from local stoarge',_pairs,_cells);

        if (_pairs.length < 1) { _pairs = [317] }
        if (_cells.length < 1) { _cells = [12,13,14,15,16,17,18,19,20,21,22,23,24,25,26] }

        selected.pairs = data.pairs.filter(_idin(_pairs));
        selected.cells = data.cells.filter(_idin(_cells));
        $scope.ligandRange = JSON.parse(localStorage.getItem(STORE+'ligandRange')) || {"min":0,"max":100,"val":10};
        $scope.receptorRange = JSON.parse(localStorage.getItem(STORE+'receptorRange')) || {"min":0,"max":699.419821048934,"val":10};
        
      }

      function makeNetwork(newVal, oldVal) {
        if (newVal === oldVal) {return;}

        saveSelection();

        cfpLoadingBar.start();

        $log.debug('Constructing network');
        if ($scope.selected.cells.length < 1 && $scope.selected.pairs.length < 1) {return;}

        graph.nodes = selected.cells;

        graph.nodes.forEach(function(n) {
          n.lout = [];
          n.lin = [];
          n.values = [0,0];
        });

        cfpLoadingBar.inc();

        $log.debug('Nodes: ',graph.nodes.length);
        $log.debug('Pairs: ',selected.pairs.length);

        graph.edges = [];
        $scope.exprRange[1] = 1;

        $scope.ligandRange.max = 100;
        $scope.receptorRange.max = 100;

        $scope.selected.pairs.forEach(addLinks);

        $scope.ligandRange.max = Math.ceil($scope.ligandRange.max);
        $scope.receptorRange.max = Math.ceil($scope.receptorRange.max);

        $scope.ligandRange.val = Math.min($scope.ligandRange.val,$scope.ligandRange.max);
        $scope.receptorRange.val = Math.min($scope.receptorRange.val,$scope.receptorRange.max);

        $scope.edgeCount = graph.edges.length;

        cfpLoadingBar.inc();

        if (graph.edges.length > $scope.maxEdges) {

          $log.warn('Too many edges', graph.edges.length);

          graph.edges = graph.edges
            .sort(function(a,b) { return b.value - a.value; })
            .slice(0,$scope.maxEdges);

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

          d.source.values[0] += +d.values[0] || 0;  // Ligand
          d.target.values[1] += +d.values[1] || 0;  // Receptor

        });

        graph.nodes = graph.nodes.filter(function(d) {   // Filtered nodes
          return (d.lout.length + d.lin.length) > 0;
        });

        cfpLoadingBar.inc();

        draw();

        //$scope.exprRange = d3.extent(graph.edges, function(d) { return d.value; });

        cfpLoadingBar.complete();

      }

      function addLinks(_pair) {
        var expr = $scope.data.expr;

        //var minValue = 0;

        var ligandRow = null;
        var receptorRow = null;

        for (var i = 1; i < expr.length; i++) {
          var row = expr[i];
          var gene = row[0];

          if (gene === _pair.Ligand)   {ligandRow = row.slice(1);}
          if (gene === _pair.Receptor) {receptorRow = row.slice(1);}

          if (ligandRow && receptorRow) {break;}
        }

        if (ligandRow && receptorRow) {

          graph.nodes.forEach(function(src) {  // all selected cell-cell pairs
            graph.nodes.forEach(function(tgt) {

              var lexpr = +ligandRow[src.id];
              var rexpr = +receptorRow[tgt.id];

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
          .datum(graph)
          .call(chart);
      }

    });

})();