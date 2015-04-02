/* global d3 */
/* global lrd3 */
/* global _F */

(function() {
  'use strict';

  angular.module('lrSpaApp')

    .service('hiveGraph', function($log, $window, $rootScope, $timeout, Graph, debounce, growl, cfpLoadingBar) {  // TODO: should be a directive

      var data = null;
      var options = options;

      var graph = new Graph();
      var chart = new lrd3.charts.hiveGraph();  // Move?

      // Private Accesors
      var _value = _F('value');
      var _ticked = _F('ticked');
      var _fixed = _F('fixed');
      var _type = _F('type');
      //var _F = function(key) { return function(d) {return d[key];}; };

      //var type = _F('type');
      //var _valueComp = function(a,b) { return _value(b) - _value(a); };
      var _valueComp = _value.order(d3.descending);
      //var _valueFilter = function(d) { return d.type !== 'node' || d.value >= 0; };
      var _valueFilter = _type.neq('sample').or(_value.gte(0));
      //var typeFilter = function(type) { return function(d) {return d.type === type;}; };

      //var _value0 = _F(function(d) { return d.values[0]; });
      //var _value1 = _F(function(d) { return d.values[1]; });
      //var gtZero = function(d) {return d>0;};

      // Events
      //var _hover = _F('hover');
      chart.on('hover', debounce(function(d) {
        graph.data.hoverEvent = true;

        graph.data.selectedItems = graph.data.selectedItems.filter(_fixed);

        if (d && graph.data.selectedItems.indexOf(d) < 0) {
          graph.data.selectedItems.unshift(d);
        }

        //console.log(graph.data.selectedItems);
      }));

      chart.on('selectionChanged', function() {

        $rootScope.$apply(function() {
          graph.data.selectedItems = graph.data.nodes.filter(_fixed);
        });

      });

      //chart.on('contextmenu', debounce(function() {
      //  console.log('chart contextmenu');
      //}));

      function _makeNodes(genes, cells) {

        graph.data.nodes = [];
        graph.data.nodesIndex = {};

        cells.forEach(function(cell) {
          //if (!cell.ticked) { return; }
          var _node = angular.extend(cell, new graph.Node());
          //console.log(_node.type);

          _node.type = 'sample';
          graph.addNode(_node);
        });

        genes.forEach(function(gene) {
          //if (!gene.ticked) { return; }
          var _node = angular.extend(gene, new graph.Node());
          _node.type = 'gene';

          //console.log(_node);

          graph.addNode(_node);
        });

      }

      function _sortAndFilterNodes() {  //TODO: DRY this!!!

        graph.data.nodeCount = graph.data.nodes.length;  // do I need this?

        var nodes = graph.data._nodes.sort(_valueComp).filter(_valueFilter);    // Sort and filter out zeros

        /* var rankedLigands = nodes  // Ligand
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

        var _v = _value0.gte(filter0).or(_value1.gte(filter1));
        var _t = _type.neq('sample'); */

        graph.data._nodes = nodes.slice(0);

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

        // expression edges
        cells.forEach(function(cell) {
          if (!cell.ticked) { return; }
          //var nodeExpr = [];

          genes.forEach(function(gene) {
            if (!gene.ticked) { return; }

            var v = (gene.i > -1 && cell.i > -1) ? +expr[gene.i + 1][cell.i + 1] : 0;
            var min = (gene.class === 'receptor') ? options.receptorFilter : options.ligandFilter;
            min = Math.max(min,0);

            if (v > min) {
              var src = cell, tgt = gene;

              if (gene.class === 'receptor') {
                src = graph.data.nodesIndex[gene.id];
                tgt = graph.data.nodesIndex[cell.id];
              } else {
                src = graph.data.nodesIndex[cell.id];
                tgt = graph.data.nodesIndex[gene.id];
              }

              //console.log(src,tgt);

              var _edge = new graph.Edge(src,tgt);
              _edge.gene = gene;
              _edge.cell = cell;
              _edge.value = v;
              _edge.specificity = Math.log(v+1)/Math.log(10)-Math.log(gene.median+1)/Math.log(10);
              //_edge.i = gene.i; // remove
              _edge.id = src.id+tgt.id;  // remove {target, source}.id
              _edge.type = 'expression';  // remove
              _edge.class = gene.class;

              graph.addEdge(_edge);
              //nodeExpr.push(_edge);
            }

          });

        });

        // pair edges
        pairs.forEach(function addLinks(_pair) {
          if (!_pair.ticked) { return; }

          var _ligand = graph.data.nodesIndex[_pair.ligandId];
          var _receptor = graph.data.nodesIndex[_pair.receptorId];
          if (_ligand && _receptor) {
            var _lredge = new graph.Edge(_ligand,_receptor);
            _lredge.type = 'pair';
            _lredge.value = 1;
            graph.addEdge(_lredge);
          }

          if (graph.data.edges.length > MAXEDGES) {
            $log.warn('Maximum number of edges exceeded', graph.data.edges.length);
            throw StopIteration;
          }

        });

        var _expression = _type.eq('expression');

        graph.data.nodes.forEach(function(node) {  // todo: move these (after filter?)
          if (!node.ticked) { return; }

          //var a = function(a,b) { return b.value - a.value; };

          //console.log(data.edgesIndex[node.id]);

          //data.edgesIndex[node.id] = data.edgesIndex[node.id].sort(a);
          graph.data.outEdgesIndex[node.id] = graph.data.outEdgesIndex[node.id].sort(_valueComp);
          graph.data.inEdgesIndex[node.id] = graph.data.inEdgesIndex[node.id].sort(_valueComp);

          graph.data._outEdgesIndex[node.id] = graph.data.outEdgesIndex[node.id].filter(_ticked);
          graph.data._inEdgesIndex[node.id] = graph.data.inEdgesIndex[node.id].filter(_ticked);

          node.values[0] = d3.sum(graph.data._outEdgesIndex[node.id].filter(_expression),_value);
          node.values[1] = d3.sum(graph.data._inEdgesIndex[node.id].filter(_expression),_value);
          node.value = d3.sum(node.values);
          //console.log(node.id);
        });

      }

      /* function _getExpression(gene, cell) {
        return (gene.i > -1 && cell.i > -1) ? +data.expr[gene.i + 1][cell.i + 1] : 0;
      }

      function _showExpressionEdges(filter, max) {
        var edges = [];

        data.genes.forEach(function(gene) {
          if (filter.gene && filter.gene !== gene) { return; }

          if (gene.class === 'ligand' && filter.target && filter.target !== gene)  { return; }
          if (gene.class === 'receptor' && filter.source && filter.source !== gene)  { return; }

          data.cells.forEach(function(cell) {
            if (filter.sample && filter.sample !== cell) { return; }

            if (gene.class === 'ligand' && filter.source && filter.source !== cell)  { return; }
            if (gene.class === 'receptor' && filter.target && filter.target !== cell)  { return; }

            var v = _getExpression(gene, cell);
            var min = (gene.class === 'receptor') ? options.receptorFilter : options.ligandFilter;
            min = Math.max(min,0);
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

        edges.sort(function(a,b) { return b.value - a.value; }).slice(0, max || paths.length).forEach(function(d) {
          d.gene.ticked = true;
          d.cell.ticked = true;
        });

      } */

      /* function _showNeighbors(node, max, _class) {

        if (typeof node === 'string') {
          node = graph.data.nodesIndex[node];
        }

        var values = [];

        if (node.type == 'sample') {

          var cell = node;
          data.genes.forEach(function(gene) {
            if (_class !== undefined && _class !== gene.class) { return; }
            var v = _getExpression(gene, cell);
            var min = (gene.class === 'receptor') ? options.receptorFilter : options.ligandFilter;
            min = Math.max(min,0);
            if (v > min) {
              values.push([gene,cell,v]);
            };
          });

        } else {

          var gene = node;

          var min = (gene.class === 'receptor') ? options.receptorFilter : options.ligandFilter;
          min = Math.max(min,0);

          data.cells.forEach(function(cell) {
            var v = _getExpression(gene, cell);
            if (v > min) {
              values.push([gene,cell,v]);
            };
          });

        }

        //console.log(values);

        values.sort(function(a,b) { return b[2] - a[2]; }).slice(0, max || values.length).forEach(function(d) {
          d[0].ticked = true;
          d[1].ticked = true;
        });

      } */

      /* function _showPaths(filter, max) {

        var paths = [];

        data.pairs.forEach(function (pair) {
          if (!pair.ticked) { return; }
          if (filter.ligand && filter.ligand !== pair.ligand) { return; }
          if (filter.receptor && filter.receptor !== pair.receptor) { return; }

          data.cells.forEach(function(lcell) {
            if (filter.source && filter.source !== lcell) { return; }
            var l = _getExpression(pair.ligand,lcell);
            if (l <= options.ligandFilter) { return; }

            data.cells.forEach(function(rcell) {
              if (filter.target && filter.target !== rcell) { return; }

              var r = _getExpression(pair.receptor,rcell);
              if (r <= options.receptorFilter) { return; }

              if (l*r > 0) {
                paths.push({
                  source: lcell,
                  ligand: pair.ligand,
                  receptor: pair.receptor,
                  target: rcell,
                  ligandExpression: l,
                  receptorExpression: r,
                  product: l*r
                });
              }

            });
          });
        });

        console.log(paths);

        paths.sort(function(a,b) { return b.product - a.product; }).slice(0, max || paths.length).forEach(function(d) {
          d.source.ticked = true;
          d.ligand.ticked = true;
          d.receptor.ticked = true;
          d.target.ticked = true;
        });

      } */

      /* function _showPaths(node, max, _class) {

        if (typeof node === 'string') {
          node = graph.data.nodesIndex[node];
        }

        var values = [];

        //if (node.type == 'sample') {

          if (_class == undefined || _class == 'ligand') {
            data.pairs.forEach(function (pair) {
              if (!pair.ticked) { return; }
              var l = _getExpression(pair.ligand,node);
              if (l == 0) { return; }
              data.cells.forEach(function(cell) {
                var r = _getExpression(pair.receptor,cell);
                var v = l*r;
                if (v > 0) {
                  values.push([cell, pair.ligand, pair.receptor, v]);
                }
              });
            });
          }

          if (_class == undefined || _class == 'receptor') {
            data.pairs.forEach(function (pair) {
              if (!pair.ticked) { return; }
              var r = _getExpression(pair.receptor,node);
              if (r == 0) { return; }
              data.cells.forEach(function(cell) {
                var l = _getExpression(pair.ligand,cell);
                var v = l*r;
                if (v > 0) {
                  values.push([cell, pair.ligand, pair.receptor, v]);
                }
              });
            });
          }

        //} else {

        //}

        values.sort(function(a,b) { return b[3] - a[3]; }).slice(0, max || values.length);

      } */

      function _draw(options) {
        $log.debug('Drawing graph');

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

        graph.data.nodes = [];
        graph.data.edges = [];
        graph.data.nodesIndex = {};
        graph.data.edgesIndex = {};

        d3.selectAll('#vis svg g').remove();
      }

      function _makeNetwork(_data, _options) {  // pairs, cells, expr, options

        if (!_data) {return;}

        data = _data;
        options = _options;

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

        //console.log(data.nodes);

        $log.debug('Total nodes: ', graph.data.nodes.length);
        $log.debug('Total Edges: ', graph.data.edges.length);

        graph.data.edgeCount = graph.data.edges.length;

        //_sortAndFilterEdges(options);

        cfpLoadingBar.inc();

        graph.data._nodes = graph.data.nodes.filter(_ticked);  // combine these -> _sortAndFilterNodes
        _sortAndFilterNodes(options);

        graph.data.edges.forEach(function(d) {  // -> sort and filter edges
          d.ticked = false;
        });

        graph.data._nodes.forEach(function(node) {
          graph.data.outEdgesIndex[node.id].forEach(function(d) {
            d.ticked = true;
          });
        });

        graph.data._edges = graph.data.edges.filter(_ticked);

        if (graph.data._edges.length > options.edgeRankFilter*graph.data._edges.length) {  // Filter expression edges

          var _pairs = graph.data._edges.filter(_type.eq('pair'));

          graph.data._edges = graph.data._edges.filter(_type.eq('expression'))
            .sort(_valueComp)
            .slice(0,options.edgeRankFilter*graph.data.edges.length)
            .concat(_pairs);

        }

        $log.debug('Filtered nodes: ',graph.data._nodes.length);
        $log.debug('Filtered edges: ',graph.data._edges.length);

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

      } */

      return {
        graph: graph,
        data: graph.data,
        chart: chart,
        update: debounce(_update, 30),
        makeNetwork: _makeNetwork,
        draw: _draw,
        clear: _clear//,
        //showNeighbors: _showNeighbors,
        //showPaths: _showPaths,
        //showExpressionEdges: _showExpressionEdges
        //getJSON: _getJSON,
        //getGML: _getGML
      };

    });

})();
