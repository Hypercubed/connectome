/* global d3 */
/* global lrd3 */
/* global _F */

(function() {
  'use strict';

  var app = angular.module('lrSpaApp');

  app
    .service('forceGraph', function($log, $window, $rootScope, $timeout, Graph, debounce, growl, cfpLoadingBar) {  // TODO: should be a directive

      var chart = new lrd3.charts.forceGraph();
      var graph = new Graph();

      //function setupChart() {
        //chart = force2Graph();  // TODO: look at options

        // Events
        //var _hover = _F('hover');
      chart.on('hover', debounce(function(d) {
        graph.data.hoverEvent = true;

        graph.data.selectedItems = graph.data.selectedItems.filter(function(d) { return d.fixed; });

        if (d && !d.fixed) {
          graph.data.selectedItems.unshift(d);
        }
      }));

      chart.on('selectionChanged', debounce(function() {
        graph.data.selectedItems = graph.data.nodes.filter(function(d) { return d.fixed; });
      }));

      // Accesors
      var _value = _F('value');
      var _ticked = _F('ticked');
      //var _F = function(key) { return function(d) {return d[key];}; };

      //var type = _F('type');
      var _valueComp = function(a,b) { return _value(b) - _value(a); };
      var _valueFilter = function(d) { return d.type !== 'node' || d.value >= 0; };
      //var typeFilter = function(type) { return function(d) {return d.type === type;}; };

      var _value0 = function(d) { return d.values[0]; };
      var _value1 = function(d) { return d.values[1]; };
      //var gtZero = function(d) {return d>0;};

      function _makeNodes(genes, cells) {

        graph.data.nodes = [];
        graph.data.nodesIndex = {};

        cells.forEach(function(cell) {
          var _node = angular.extend(cell, new graph.Node());

          _node.type = 'sample';
          graph.addNode(_node);
        });

        genes.forEach(function(gene) {
          var _node = angular.extend(gene, new graph.Node());
          _node.type = 'gene';

          graph.addNode(_node);
        });

      }

      function _sortAndFilterNodes(options) {  //TODO: DRY this!!!

        graph.data.nodeCount = graph.data.nodes.length;  // do I need this?

        var nodes = graph.data._nodes.sort(_valueComp).filter(_valueFilter);    // Sort and filter out zeros

        var rankedLigands = nodes  // Ligand
          .map(_value0)
          //.filter(gtZero)
          .sort(d3.ascending);

        var rankedReceptors = nodes  // Receptor
          .map(_value1)
          //.filter(gtZero)
          .sort(d3.ascending);

        graph.data.ligandExtent = d3.extent(rankedLigands);       // TODO: Already ranked, don't need extent
        graph.data.receptorExtent = d3.extent(rankedReceptors);

        var filter0 = d3.quantile(rankedLigands, 1-options.ligandRankFilter);
        var filter1 = d3.quantile(rankedReceptors, 1-options.receptorRankFilter);

        filter0 = Math.max(filter0, 0) || 0;
        filter1 = Math.max(filter1, 0) || 0;

        //console.log(filter0,filter1);

        var filtered = nodes.filter(function(d) {
          //console.log(d);
          return ( d.type !== 'sample' || d.values[0] >= filter0 || d.values[1] >= filter1 );
        });

        //console.log(filtered.length);

        graph.data._nodes = nodes; //filtered;

      }

      var MAXEDGES = 1000;

      var StopIteration = new Error('Maximum number of edges exceeded');

      function _makeEdges(cells, genes, pairs, expr, options) { // TODO: better

        //console.log(genes);

        try {
          return __makeEdges(cells, genes, pairs, expr, options);
        } catch(e) {
          if(e !== StopIteration) {
            throw e;
          } else {
            growl.addErrorMessage(StopIteration.message);
            return [];
          }
        }
      }

      function __makeEdges(cells, genes, pairs, expr, options) { //selected nodes

        graph.data.edges = [];

        //expression edges
        cells.forEach(function(cell) {
          if (!cell.ticked) { return; }
          //var nodeExpr = [];

          genes.forEach(function(gene) {
            if (!gene.ticked) { return; }

            //console.log(gene.i, cell.i);
            var v = (gene.i > -1 && cell.i > -1) ? +expr[gene.i + 1][cell.i + 1] : 0;
            var min = (gene.class === 'receptor') ? options.receptorFilter : options.ligandFilter;
            min = Math.max(min,0);

            if (v > min) {
              var src, tgt;

              if (gene.class === 'receptor') {
                src = gene;
                tgt = cell;
              } else {
                src = cell;
                tgt = gene;
              }

              //console.log(data.edgesIndex[src.id][tgt.id]);
              var s = (v+1)/(gene.median+1);

              var _edge = new graph.Edge(graph.data.nodesIndex[src.id],graph.data.nodesIndex[tgt.id]);
              _edge.value = v;
              _edge.i = gene.i; // remove
              _edge.id = gene.id;  // remove {target, source}.id
              _edge.type = 'expression';  // remove
              _edge.class = gene.class;
              _edge._specificity = s,
              _edge.specificity = Math.log(s)/Math.log(10),

              graph.addEdge(_edge);
              //nodeExpr.push(_edge);
            }

          });

        });

        // sample-sample edges
        pairs.forEach(function addLinks(_pair) {
          if (!_pair.ticked) { return; }

          var ligandEdges = graph.data.inEdgesIndex[_pair.ligandId];
          var receptorEdges = graph.data.outEdgesIndex[_pair.receptorId];

          ligandEdges.forEach(function(ligand) {
            receptorEdges.forEach(function(receptor) {

              var value = ligand.value*receptor.value;
              if (value > 0 && ligand.value > options.receptorFilter && receptor.value > options.ligandFilter) {
                //console.log(ligand.value,receptor.value,value);

                //var _edge;

                //if (data.edgesIndex[ligand.source.id]) {
                  //console.log(data.edgesIndex[ligand.source.id][receptor.target.id]);
                //}

                var _edge = 
                  graph.data.edgesIndex[ligand.source.id][receptor.target.id] || 
                  new graph.Edge(ligand.source,receptor.target);

                var s = ligand._specificity*receptor._specificity;

                if (!_edge._specificity) {
                  _edge._specificity = _edge.specificity = 0;
                }

                _edge.type = 'sample-sample';
                _edge.name = ligand.source.name + ' -> ' + receptor.target.name;
                _edge.value += value;
                _edge._specificity += s;
                _edge.specificity += Math.log(s)/Math.log(10);

                graph.addEdge(_edge);
              }
              //delete ligandEdges[i];
              //delete receptorEdges[j];
            });
            //delete ligandEdges[i];
          });

        });

        
        graph.data.nodes.forEach(function(node) {  // todo: move
          if (!node.ticked) { return; }

          var a = function(a,b) { return b.value - a.value; };

          //console.log(data.edgesIndex[node.id]);

          //data.edgesIndex[node.id] = data.edgesIndex[node.id].sort(a);
          graph.data.outEdgesIndex[node.id] = graph.data.outEdgesIndex[node.id].sort(a);
          graph.data.inEdgesIndex[node.id] = graph.data.inEdgesIndex[node.id].sort(a);

          graph.data._outEdgesIndex[node.id] = graph.data._outEdgesIndex[node.id].sort(a);
          graph.data._inEdgesIndex[node.id] = graph.data._inEdgesIndex[node.id].sort(a);

          node.values[0] = d3.sum(graph.data._outEdgesIndex[node.id].filter(_F('type').eq('expression')),_value);
          node.values[1] = d3.sum(graph.data._inEdgesIndex[node.id].filter(_F('type').eq('expression')),_value);
          node.value = d3.sum(node.values);
          //console.log(node.id);
        });

      }

      function _draw(options) {
        $log.debug('Drawing graph');

        //if (!chart) {
        //  setupChart(options);
        //}

        if (graph.data.nodes.length < 1) {
          _clear();
          return;
        }

        //$timeout(function() {
        d3.select('#vis svg')
          .classed('labels',options.showLabels)
          .datum(graph.data)
          .call(chart);
        //});

      }

      function _update() {
        if (chart.update) {
          $log.debug('Updating graph');
          chart.update();
        }
      }

      function _clear() {
        $log.debug('Clearing');

        graph.data.nodes = [];  // Todo: graph.clear()
        graph.data.edges = [];
        graph.data.nodesIndex = {};
        graph.data.edgesIndex = {};

        d3.selectAll('#vis svg g').remove();
      }

      function _makeNetwork(_data, options) {  // pairs, cells, expr, options

        if (!_data) {return;}

        var pairs = _data.pairs.filter(function(d) { return d.ticked; });  // remove?
        var cells = _data.cells.filter(function(d) { return d.ticked; });

        var expr = _data.expr;
        var genes = _data.genes.filter(function(d) { return d.ticked; });

        $log.debug('Constructing');

        if (cells.length < 1 && genes.length < 1) {
          _clear();

          growl.addWarnMessage('No cells or genes selected');
          return;
        }

        cfpLoadingBar.start();

        _makeNodes(_data.genes, _data.cells);
        _makeEdges(_data.cells, _data.genes, pairs, expr, options);

        graph.data.edges = graph.data.edges.filter(_F('type').eq('sample-sample'));

        //console.log(data.nodes);

        $log.debug('Total nodes: ', graph.data.nodes.length);
        $log.debug('Total Edges: ', graph.data.edges.length);

        graph.data.edgeCount = graph.data.edges.length;  // needed?

        //_sortAndFilterEdges(options);

        cfpLoadingBar.inc();

        graph.data._nodes = graph.data.nodes
          .filter(_ticked)
          .filter(_F('type').eq('sample'));  // combine these -> _sortAndFilterNodes
        _sortAndFilterNodes(options);

        graph.data.edges.forEach(function(d) {  // -> sort and filter edges
          d.ticked = false;
        });

        graph.data._nodes.forEach(function(node) {
          graph.data.outEdgesIndex[node.id].forEach(function(d) {
            d.ticked = true;
          });
        });


        graph.data._edges = graph.data.edges
          .filter(_ticked);
          //.filter(_F('type').eq('sample-sample'));

        if (graph.data._edges.length > options.edgeRankFilter*graph.data._edges.length) {

          graph.data._edges = graph.data._edges
            .sort(_valueComp)
            .slice(0,options.edgeRankFilter*graph.data.edges.length);

          graph.data._nodes.forEach(function(node) {
            node.inDegree = node.outDegree = 0;
          });

          graph.data._edges.forEach(function(edge) {
            edge.target.inDegree++;
            edge.source.outDegree++;
          });

          graph.data._nodes = graph.data._nodes.filter(function(node) {
            return node.inDegree > 0 || node.outDegree > 0;
          });

        }

        $log.debug('Filtered nodes: ', graph.data._nodes.length);
        $log.debug('Filtered edges: ', graph.data._edges.length);

        cfpLoadingBar.inc();

        graph.data._nodes.forEach(function(d) {

          if (d.type === 'gene') {
            d.group = 'gene.'+d.class;
          } else {
            d.group = 'sample';
            if (d.values[0] > 0) { d.class='ligand';} //  Ligand only, lime green
            if (d.values[1] > 0) { d.class='receptor';}   //  Receptor only, Very light blue
            if (d.values[0] > 0 && d.values[1] > 0) {d.class='both';}   //  Both, Dark moderate magenta
          }
          //console.log(d.ntype);
        });

        cfpLoadingBar.complete();

      }

      /* function __getDATA() {  // This is hive version, move to service
        var _json = {

        };

        _json.nodes = graph.data.nodes.map(function(node, i) {

          var _n = {
            data: {
              id: i,
              name: node.name,
              type: node.type.split('.')[1] || 'sample',
              value: String(node.value),
              genes: node.genes
            },
            position: {
              x: node.x,
              y: node.y
            }
          };

          _.extend(_n.data, node.meta);

          return _n;
        });

        _json.edges = graph.data.edges.map(function(edge) {
          return {
            data: {
              id: edge.index,
              name: edge.name,
              source: graph.data.nodes.indexOf(edge.source),
              target: graph.data.nodes.indexOf(edge.target),
              value: String(edge.value)
            }
          };
        });

        return _json;
      }

      function _getJSON() {  // This is hive version, move to service
        var _json = {
          'format_version' : '1.0',
          'generated_by' : [name,version].join('-'),
          'target_cytoscapejs_version' : '~2.1',
          data: {},
          elements: __getDATA()
        };

        _json.elements.nodes.forEach(function(d) {
          d.data.id = String(d.data.id);
        });

        _json.elements.edges.forEach(function(d) {
          d.data.id = String(d.data.id);
          d.data.source = String(d.data.source);
          d.data.target = String(d.data.target);
        });

        return JSON.stringify(_json);
      }

      function _getGML() {  // This is hive version, move to service

        function quote(str) {
          return '"'+str+'"';
        }

        function indent(n, p) {
          n = n || 2;
          p = p || ' ';
          var pp = strRepeat(p, n);
          return function(s) {
            return pp+s;
          };
        }

        function strRepeat(str, qty){
          var result = '';
          while (qty > 0) {
            result += str;
            qty--;
          }
          return result;
        }

        function convert(obj, k) {
          if (_.isString(obj)) {return [k,quote(obj)].join(' ');}
          if (_.isArray(obj)) {return [k,quote(String(obj))].join(' ');}
          if (_.isObject(obj)) {
            var e = _.map(obj, convert);
            e.unshift(k,'[');
            e.push(']');
            return e.join(' ');
          }
          return [k,String(obj)].join(' ');
        }

        var _data = __getDATA();

        var _gml = [];
        _gml.push('graph [');

        _data.nodes.forEach(function(d) {
          _gml.push('  node [');
          var e = _.map(d.data, convert).map(indent(4));
          _gml = _gml.concat(e);

          _gml.push('    graphics [');

          _gml.push(indent(6)(convert(d.position, 'center')));

          _gml.push('    ]');

          _gml.push('  ]');
        });

        _data.edges.forEach(function(d) {
          _gml.push('  edge [');
          var e = _.map(d.data, convert).map(indent(4)); //function(v,k) { return '    '+convert(v,k); } );
          _gml = _gml.concat(e);
          _gml.push('  ]');
        });

        _gml.push(']');

        return _gml.join('\n');

      }*/

      return {
        graph: graph,
        data: graph.data,
        chart: chart,
        update: debounce(_update, 30),
        makeNetwork: _makeNetwork,
        draw: _draw,
        clear: _clear//,
        //getJSON: _getJSON,
        //getGML: _getGML
      };

    });

})();
