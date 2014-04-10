'use strict';

angular.module('lrSpaApp')
  .constant('EXPRESSIONFILE', 'data/LR.expr.txt')
  .constant('PAIRSFILE', 'data/LR.pairs.txt');

angular.module('lrSpaApp')
  .controller('MainCtrl', function ($scope) {

  });

angular.module('lrSpaApp')
  .controller('UICtrl', function ($scope, $log, $http, $d3, cfpLoadingBar, PAIRSFILE, EXPRESSIONFILE) {
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

    var chart = networkGraph();

    $http.get(PAIRSFILE, {cache: true})  
      .success(function(data, status, headers, config) {
        data = d3.tsv.parse(data);

        $log.debug('Pairs loaded:',data.length);

        $scope.data.pairs = data;

        //console.log('localStorage pairs', localStorage.getItem(STORE+'pairs'));

      }).error(function(data, status, headers, config) {
          $log.warn('Error',data, status, headers, config);
      });

    $http.get(EXPRESSIONFILE, {cache: true})  
      .success(function(data, status, headers, config) {
        data = d3.tsv.parseRows(data);

        $log.debug('Genes loaded:',data.length);

        $scope.data.expr = data;

        $scope.data.cells = data[0].slice(1).map(function(d,i) {
          return { name: d, index: i };
        });

        $log.debug('Samples loaded:',$scope.data.cells.length);

        //makeNetwork();

      }).error(function(data, status, headers, config) {
          $log.warn('Error',data, status, headers, config);
      });

    function makeNetwork() {

      //var ph = selected.pairs.map(function(d,i) { return i; } ).join(',');

      
      //ph = "5,6,7";
      //console.log(JSON.stringify(ph));

      //localStorage.setItem(STORE+'pairs', JSON.stringify(ph));

      //localStorage.setItem( STORE+'pairs', JSON.stringify(ph) );
      //localStorage.setItem( STORE+'cells', selected.cells.map(function(d,i) { return d.$$hashKey; } ) );

      cfpLoadingBar.start();

      $log.debug('Constructing network: ');
      if ($scope.selected.cells.length < 1 && $scope.selected.pairs.length < 1) return;

      graph.nodes = $scope.selected.cells;

      graph.nodes.forEach(function(n) {
        n.lout = [];
        n.lin = [];
        n.values = [0,0];
      });

      cfpLoadingBar.inc();

      $log.debug('Nodes: ',$scope.graph.nodes.length);
      $log.debug('Pairs: ',$scope.selected.pairs.length);

      graph.edges = [];
      $scope.selected.pairs.forEach(addLinks);

      cfpLoadingBar.inc();

      var EDGELIMIT = 100;
      if (graph.edges.length > EDGELIMIT) {

        $log.warn('Too many edges', graph.edges.length);

        graph.edges = graph.edges
          .sort(function(a,b) { return b.value - a.value; })
          .slice(0,EDGELIMIT);

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

      cfpLoadingBar.inc();

      draw();

      cfpLoadingBar.complete()

    }

    function addLinks(_pair) {
      var expr = $scope.data.expr;
      var cells = $scope.selected.cells;

      var minValue = 0;

      var ligandRow = null;
      var receptorRow = null;

      for (var i = 1; i < data.expr.length; i++) {
        var row = data.expr[i];
        var gene = row[0];

        if (gene == _pair.Ligand)     ligandRow = row.slice(1);
        if (gene == _pair.Receptor) receptorRow = row.slice(1);

        if (ligandRow && receptorRow) break;
      }

      if (ligandRow && receptorRow) {

        $scope.selected.cells.forEach(function(src) {  // all selected cell-cell pairs
        $scope.selected.cells.forEach(function(tgt) {

          var value = (+ligandRow[src.index])*(+receptorRow[tgt.index]);

          if (value > minValue) {  // src and tgt are talking!!!
            var lrs = _pair.Ligand + ' -> ' + _pair.Receptor;
            var cells = src.name + ' -> ' + tgt.name;
            //console.log(cells);

            var edge = graph.edges.filter(function(d) { return d.name == cells; });

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
            edge.values[0] += +ligandRow[src.index];
            edge.values[1] += +receptorRow[tgt.index];
 
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

    $scope.$watch('selected.pairs', makeNetwork);
    $scope.$watch('selected.cells', makeNetwork);

  });
