/* global d3 */
/* global forceGraph */
/* global saveAs */

(function() {
  'use strict';

  var app = angular.module('lrSpaApp');

  app
    .constant('EXPRESSIONFILE', 'data/LR.expr.txt')
    .constant('PAIRSFILE', 'data/LR.pairs.txt');

  app
    .service('ligandReceptorData', function($q, $log,$http,EXPRESSIONFILE,PAIRSFILE) {
      var service = {};

      service.data = {};
      service.data.expr = [];
      service.data.pairs = [];
      service.data.cells = [];

      service.load = function() {
        var getPairs = $http.get(PAIRSFILE, {cache: true})
          .success(function(data) {
            data = d3.tsv.parse(data);

            $log.debug('Pairs loaded:',data.length);

            data.forEach(function(d,i) {
              d.id = i;
            });

            service.data.pairs = data;

          }).error(function(data, status, headers, config) {
            $log.warn('Error',data, status, headers, config);
          });

        var getExpression = $http.get(EXPRESSIONFILE, {cache: true})
          .success(function(data) {
            data = d3.tsv.parseRows(data);

            $log.debug('Genes loaded:',data.length);

            service.data.expr = data;

            service.data.cells = data[0].slice(1).map(function(d,i) {
              return { name: d, id: i };
            });

            $log.debug('Samples loaded:',service.data.cells.length);

          }).error(function(data, status, headers, config) {
            $log.warn('Error',data, status, headers, config);
          });

        return $q.all([getPairs, getExpression]).then(function() {
          $log.debug('Done loading');

          var _expr = service.data.expr;

          service.data.pairs.forEach(function(_pair) {  // Get ligand and receptor indecies in expression table

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
        });
      };

      return service;

    });

  app
    .service('forceGraph', function($log, $window, cfpLoadingBar) {  // TODO: should be a directive

      var data = {
        nodes: {},
        edges: {},
        edgeCount: 0,
        ligandExtent: [0,100000],
        receptorExtent: [0,100000]
      };

      var chart = forceGraph();

      var valueFormat = d3.format('.2f');
      var join = function(d) {return d.join(' '); };

      function formatList(arr, max) {
        var l = arr.slice(0,max).join(',');
        if (arr.length > max) {l += ' ( +'+(arr.length-max)+' more)';}
        return l;
      }

      chart.nodeTooltip.html(function(d) {
        var html = [['<b>',d.name,'</b>']];

        if (d.values[0] > 0) {html.push([(d.ligands.length > 1) ? 'Sum of' : '', 'Ligand expression:',valueFormat(d.values[0])]);}
        if (d.values[1] > 0) {html.push([(d.receptors.length > 1) ? 'Sum of' : '', 'Receptor expression:',valueFormat(d.values[1])]);}

        if (d.ligands.length > 0)   {html.push(['Ligands:',formatList(d.ligands,4)]);}
        if (d.receptors.length > 0) {html.push(['Receptors:',formatList(d.receptors,4)]);}

        return html.map(join).join('<br>');
      });

      chart.linkTooltip.html(function(d) {
        //var s = ''; //(selected.pairs.length > 1) ? 'Sum of' : '';

        var html = [['<b>',d.name,'</b>']];

        //if (d.source.values[0] > 0) {html.push([(d.source.ligands.length > 1) ? 'Sum of' : '', 'Ligand expression:',valueFormat(d.source.values[0])]);}
        //if (d.target.values[1] > 0) {html.push([(d.target.receptors.length > 1) ? 'Sum of' : '', 'Receptor expression:',valueFormat(d.target.values[1])]);}

        html.push([
          //s,'Ligand expression:',valueFormat(d.values[0]),
          //'<br />', s,'Receptor expression:',valueFormat(d.values[1]),
          'Product:',valueFormat(d.value)
        ]);

        return html.map(join).join('<br>');
      });

      function _makeNodes(pairs, cells, expr) {

        var nodes = cells;



        nodes.forEach(function(_node) {
          _node.ligands = [];
          _node.receptors = [];
          _node.lout = [];
          _node.lin = [];
          _node.values = [0,0];

          pairs.forEach(function(_pair) {

            var exprValues = _pair.index.map(function(_index) {
              return +expr[_index][_node.id+1];
            });

            if (exprValues[0] > 0 && _node.ligands.indexOf(_pair.Ligand) < 0) {
              _node.ligands.push(_pair.Ligand);
              _node.values[0] += +exprValues[0];
            }

            if (exprValues[1] > 0 && _node.receptors.indexOf(_pair.Receptor) < 0) {
              _node.receptors.push(_pair.Receptor);
              _node.values[1] += +exprValues[1];
            }

          });
        });

        data.nodeCount = nodes.length;

        return nodes;

      }

      function _filterNodes(nodes, options) {
        var value0 = function(d) { return d.values[0]; };
        var value1 = function(d) { return d.values[1]; };

        var ranked0 = nodes.map(value0).filter(function(d) { return d > 0; }).sort(d3.ascending);
        var ranked1 = nodes.map(value1).filter(function(d) { return d > 0; }).sort(d3.ascending);

        data.ligandExtent = d3.extent(ranked0);
        data.receptorExtent = d3.extent(ranked1);

        var filter0 = d3.quantile(ranked0, 1-options.receptorRankFilter);
        var filter1 = d3.quantile(ranked1, 1-options.ligandRankFilter);

        return nodes.filter(function(d) {
          return d.values[0] > 0 &&
                 d.values[1] > 0 &&
                 ( d.values[0] > filter0 || d.values[1] > filter1 );
        });
      }

      var MAXEDGES = 1000;

      var StopIteration = new Error('Maximum number of edges exceeded');

      function _makeEdges(nodes, pairs, expr, options) { // TODO: better 
        try {
          return __makeEdges(nodes, pairs, expr, options);
        } catch(e) {
          if(e !== StopIteration) {
            throw e;
          } else {
            $window.alert(StopIteration.message);
            return [];
          }
        }
      }

      function _maxCheck() {
        if (edges.length > MAXEDGES) {
            $log.warn('Maximum number of edges exceeded');
            throw StopIteration;
          }
      }

      function __makeEdges(nodes, pairs, expr, options) {

        var edges = [];

        pairs.forEach(function addLinks(_pair) {
          //$log.debug('Constructing network for',_pair);

          var lindex = _pair.index[0];
          var rindex = _pair.index[1];
           
          if (lindex > -1 && rindex > -1) {

            data.nodes.forEach(function(src) {  // all selected cell-cell pairs

              var lexpr = +expr[lindex][src.id+1];
              if (lexpr === 0) {return;}

              data.nodes.forEach(function(tgt) {
                var rexpr = +expr[rindex][tgt.id+1];
                if (rexpr === 0) {return;}

                //$log.debug('Non-zero product',src,tgt);

                var value = lexpr*rexpr;

                if (value > 0 && lexpr >= options.ligandFilter && rexpr >= options.receptorFilter) {  // src and tgt are talking!!!
                  var name = src.name + ' -> ' + tgt.name;

                  var edge = edges.filter(function(d) { return d.name === name; });

                  if (edge.length === 0) {
                    edge = {
                      source: src,
                      target: tgt,
                      value:0,
                      name: name,
                      values: [0, 0]
                    };
                    edges.push(edge);
                  } else if (edge.length === 1 && pairs.length > 1) {
                    edge = edge[0];
                  } else {
                    $log.warn('Duplicate edges found', edge.length);
                  }

                  edge.value += value;
       
                }

              if (edges.length > MAXEDGES) {
                $log.warn('Maximum number of edges exceeded');
                throw StopIteration;
              }

              });
            });

          }

        });

        return edges;

      }

      function _draw(options) {
        $log.debug('Drawing');

        if (data.nodes.length < 1 || data.edges.length < 1) { 
          _clear();
          return;
        }

        d3.select('#vis svg')
          .classed('labels',options.showLabels)
          .datum(data)
          .call(chart);
      }

      function _clear() {
        $log.debug('Clearing');
        d3.select('#vis svg g').remove();
      }



      function _makeNetwork(pairs, cells, expr, options) {
        $log.debug('Constructing');

        if (cells.length < 1 || pairs.length < 1) { 
          data.nodes = [];
          data.edges = [];
          return;
        }

        cfpLoadingBar.start();

        data.nodes = _makeNodes(pairs, cells, expr);

        $log.debug('Total nodes: ',data.nodes.length);

        data.nodes = _filterNodes(data.nodes, options);

        cfpLoadingBar.inc();

        $log.debug('Filtered nodes: ',data.nodes.length);

        $log.debug('Pairs: ',pairs.length);

        data.edges = _makeEdges(data.nodes, pairs, expr, options);

        $log.debug('Total Edges: ',data.edges.length);

        data.edgeCount = data.edges.length;

        cfpLoadingBar.inc();

        if (data.edges.length > options.edgeRankFilter*data.edges.length) {

          $log.warn('Too many edges', data.edges.length);

          data.edges = data.edges
            .sort(function(a,b) { return b.value - a.value; })
            .slice(0,options.edgeRankFilter*data.edges.length);

        }

        $log.debug('Filtered edges: ',data.edges.length);

        cfpLoadingBar.inc();

        data.edges.forEach(function(d, i) {  // Set in/out links
          d.index = i;

          d.source.lout.push(i);
          d.target.lin.push(i);

          d.count = d.source.lout.filter(function(_i) {
            var _target = data.edges[_i].target;
            return (_target === d.target);
          }).length;

        });

        data.nodes = data.nodes.filter(function(d) {   // Filtered nodes
          return (d.lout.length + d.lin.length) > 0;
        });

        cfpLoadingBar.complete();

      }

      function _graphDataToJSON() {
        var _json = {};

        _json.nodes = data.nodes.map(function(node) {
          return {
            name: node.name,
            values: node.values,
            ligands: node.ligands,
            receptors: node.receptors
          };
        });

        _json.links = data.edges.map(function(edge) {
          return {
            name: edge.name,
            source: data.nodes.indexOf(edge.source),
            target: data.nodes.indexOf(edge.target),
            value: edge.value,
            values: edge.values
          };
        });

        return JSON.stringify(_json);
      }

      return {
        data: data,
        chart: chart,
        makeNetwork: _makeNetwork,
        draw: _draw,
        clear: _clear,
        getJSON: _graphDataToJSON
      };

    });

  /* app
    .controller('ForceGraphCtrl', function ($scope, $log, localStorageService, ligandReceptorData, forceGraph) {

      // Make network
      localStorageService.bind($scope, 'options', {
        showLabels: true,
        maxEdges: 100,
        ligandFilter: 10,
        receptorFilter: 10,
        ligandRankFilter: 0.1,
        receptorRankFilter: 0.1,
        edgeRankFilter: 0.1,
      });

      forceGraph.clear();
      $scope.graphData = forceGraph.data;

      function updateNetwork(newVal, oldVal) {
        if (newVal === oldVal) {return;}
        saveSelection();
        forceGraph.makeNetwork($scope.selected.pairs, $scope.selected.cells, $scope.data.expr, $scope.options);
        forceGraph.draw($scope.options);
      }

      // Load Data
      $scope.selected = {
        pairs: [],
        cells: []
      };

      function saveSelection() {
        var _id = function(d) { return d.id; };

        var _pairs = $scope.selected.pairs.map(_id);
        var _cells = $scope.selected.cells.map(_id);

        localStorageService.set('pairs', _pairs);
        localStorageService.set('cells', _cells);
        //localStorageService.set('ligandRange', forceGraph.graph.ligandRange);
        //localStorageService.set('receptorRange', forceGraph.graph.receptorRange);
      }

      function loadSelection() {

        function _idin(arr) {
          return function(d) {
            return arr.indexOf(d.id) > -1;
          };
        }

        var _pairs = localStorageService.get('pairs') || [317];
        var _cells = localStorageService.get('cells') || [12,13,14,15,16,17,18,19,20,21,22,23,24,25,26];

        $log.debug('load from local stoarge',_pairs,_cells);

        if (_pairs.length < 1) { _pairs = [317]; }
        if (_cells.length < 1) { _cells = [12,13,14,15,16,17,18,19,20,21,22,23,24,25,26]; }

        $scope.selected.pairs = $scope.data.pairs.filter(_idin(_pairs));
        $scope.selected.cells = $scope.data.cells.filter(_idin(_cells));

        //TODO: not this
        //forceGraph.graph.ligandRange = localStorageService.get('ligandRange') || forceGraph.graph.ligandRange;
        //forceGraph.graph.receptorRange = localStorageService.get('receptorRange') || forceGraph.graph.receptorRange;
        
      }

      ligandReceptorData.load().then(function() {
        $scope.data = ligandReceptorData.data;

        loadSelection();

        updateNetwork(true,false);

        $scope.$watchCollection('selected', updateNetwork);

        $scope.$watch('options.ligandFilter', updateNetwork);
        $scope.$watch('options.receptorFilter', updateNetwork);
        $scope.$watch('options.ligandRankFilter', updateNetwork);
        $scope.$watch('options.receptorRankFilter', updateNetwork);

        $scope.$watch('options.edgeRankFilter', updateNetwork); // TODO: filter in place
        $scope.$watch('options.showLabels', function() {
          saveSelection();
          forceGraph.draw($scope.options);
        });

      });

      $scope.saveJson = function() {  // TODO: make a service?
        var txt = graphDataToJSON(forceGraph.data);
        var blob = new Blob([txt], { type: 'data:text/json' });
        saveAs(blob, 'lr-graph.json');
      };

      function graphDataToJSON(data) {
        var _json = {};

        _json.nodes = data.nodes.map(function(node) {
          return {
            name: node.name,
            values: node.values,
            ligands: node.ligands,
            receptors: node.receptors
          };
        });

        _json.links = data.edges.map(function(edge) {
          return {
            name: edge.name,
            source: data.nodes.indexOf(edge.source),
            target: data.nodes.indexOf(edge.target),
            value: edge.value,
            values: edge.values
          };
        });

        return JSON.stringify(_json);
      }

    }); */

})();