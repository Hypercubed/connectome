/* global d3 */
/* global hiveGraph */
/* global _ */
/* global _F */

(function() {
  'use strict';

  var app = angular.module('lrSpaApp');

  app
    .service('hiveGraph', function($log, $window, $rootScope, $timeout, debounce, growl, cfpLoadingBar, name, version) {  // TODO: should be a directive

      var data = {
        nodes: [],                  // -> nodesArray
        edges: [],                  // -> edgesArray

        nodesIndex: {},

        edgesIndex: {},
        inEdgesIndex: {},
        outEdgesIndex: {},

        edgeCount: 0,               // get rid?
        ligandExtent: [0,100000],   // get rid?
        receptorExtent: [0,100000], // get rid?
        //hoverItem: null,            // get rid?
        //hovertext: ''

        selectedItems: []
      };

      var chart = hiveGraph();  // Move?

      // Events
      //var _hover = _F('hover');
      chart.on('hover', function(d) {
        $rootScope.$apply(function() {
          data.hoverEvent = true;

          //console.log(d);

          if (!d && data.selectedItems.length > 0 && !data.selectedItems[0].fixed) {
            data.selectedItems.shift();
          } else if (d && !d.fixed) {
            data.selectedItems.unshift(d);
          }

        });
      });

      chart.on('selectionChanged', function(d) {
        console.log('selectionChanged');
        $rootScope.$apply(function() {

          var index = data.selectedItems.indexOf(d);
          if (index > 0) {data.selectedItems.splice(index, 1);}  // if already in list remove it

          if (index !==0 && d.fixed) {
            data.selectedItems.unshift(d);
          }

          //console.log(d.order);
        });
      });


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

      function Edge(src,tgt,name) {
        name = name || src.name+'->'+tgt.name;
        return {
          source: src,
          target: tgt,
          value: 10,
          name: name,
          values: [10, 10]  // remove these
        };
      }

      function Node(id, name, type) {
        if (id) {this.id = id;}
        if (name) {this.name = name;}
        if (type) {this.type = type;}

        this.values = [0,0];
        this.value = 0;
        this.lout = [];  // todo: remove
        this.lin = [];

        this._expr = [];    // rename these
        this._ligands = [];
        this._receptors = [];
      }

      function addNode(node) {   // expose
        if (typeof node !== 'object' || arguments.length !== 1) {
          $log.error('addNode: Wrong arguments.');
        }

        if (!node.ticked) { return; }

        data.nodes.push(node);
        data.nodesIndex[node.id] = node;
      }

      function _makeNodes(genes, cells) {

        data.nodes = [];
        data.nodesIndex = {};

        cells.forEach(function(cell) {
          //if (!cell.ticked) { return; }
          var _node = angular.extend(cell, new Node());
          //console.log(_node.type);

          _node.type = 'sample';
          addNode(_node);
        });

        genes.forEach(function(gene) {
          //if (!gene.ticked) { return; }
          var _node = angular.extend(gene, new Node());
          _node.type = 'gene';

          addNode(_node);
        });

      }

      function _sortAndFilterNodes(options) {  //TODO: DRY this!!!

        data.nodeCount = data.nodes.length;

        var nodes = data._nodes.sort(_valueComp).filter(_valueFilter);    // Sort and filter out zeros

        var rankedLigands = nodes  // Ligand
          .map(_value0)
          //.filter(gtZero)
          .sort(d3.ascending);

        var rankedReceptors = nodes  // Receptor
          .map(_value1)
          //.filter(gtZero)
          .sort(d3.ascending);

        data.ligandExtent = d3.extent(rankedLigands);       // TODO: Already ranked, don't need extent
        data.receptorExtent = d3.extent(rankedReceptors);

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

        data._nodes = filtered;

      }

      /* function __sortAndFilterNodes(nodes, options) {

        nodes = nodes.sort(_valueComp);

        var ligands = nodes.map(function(d) {
          return d.type.match('ligand') ? d.value : 0;
        }).filter(function(d) {return d>0;}).sort(d3.ascending);

        var receptors = nodes.map(function(d) {
          return d.type.match('receptor') ? d.value : 0;
        }).filter(function(d) {return d>0;}).sort(d3.ascending);

        data.ligandExtent = d3.extent(ligands);
        data.receptorExtent = d3.extent(receptors);

        var filter0 = d3.quantile(ligands, options.ligandRankFilter);
        var filter1 = d3.quantile(receptors, options.receptorRankFilter);

        //console.log('filter',filter0,filter1);

        return nodes.filter(function(d) {
          if (d.value === 0) {return false;}

          var limit = (d.type.match('ligand')) ? filter0 : filter1;
          return d.value > 0  && d.value > limit;
        });

      } */

      function addEdge(edge) {   // expose
        if (arguments.length !== 1 || typeof edge !== 'object') {
          $log.error('addNode: Wrong arguments.');
        }

        edge.ticked = edge.source.ticked && edge.target.ticked;

        if (edge.source.ticked && edge.target.ticked) {
          data.edges.push(edge);
        }

        if (edge.source.ticked) {  // todo: push sorted
          data.edgesIndex[edge.source.id] = data.edgesIndex[edge.source.id] || [];
          //data.outEdgesIndex[edge.source.id] = data.outEdgesIndex[edge.source.id] || [];

          data.edgesIndex[edge.source.id].push(edge);
          //data.outEdgesIndex[edge.source.id].push(edge);
        }

        if (edge.target.ticked) {
          data.edgesIndex[edge.target.id] = data.edgesIndex[edge.target.id] || [];
          //data.inEdgesIndex[edge.target.id] = data.inEdgesIndex[edge.target.id] || []

          data.edgesIndex[edge.target.id].push(edge);
          //data.inEdgesIndex[edge.target.id].push(edge);
        }

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

        data.edges = [];
        data.edgesIndex = {};
        data.outEdgesIndex = {};
        data.inEdgesIndex = {};

        data._outEdgesIndex = {};
        data._inEdgesIndex = {};

        //if (data.nodes.length < 2) { return; }

        //var count = 0;
        cells.forEach(function(cell) {
          //var nodeExpr = [];

          genes.forEach(function(gene) {
            if (gene.ticked || cell.ticked) {
              var v = +expr[gene.i + 1][cell.i + 1];
              var min = (gene.class === 'receptor') ? options.receptorFilter : options.ligandFilter;
              min = Math.max(min,0);

              if (v > min) {
                var _edge = (gene.class === 'receptor') ? new Edge(gene,cell) : new Edge(cell,gene);
                _edge.value = v;
                _edge.i = gene.i; // remove
                _edge.id = gene.id;  // remove {target, source}.id
                _edge.type = 'expression';  // remove
                _edge.class = gene.class;

                addEdge(_edge);
                //nodeExpr.push(_edge);
              }

            }
          });

          //data.edgesIndex[cell.id] = nodeExpr.sort(function(a,b) { return b.value - a.value; });
          //data.outEdgesIndex[cell.id]   = nodeExpr.filter(_F('_type').eq('ligand'));
          //data.inEdgesIndex[cell.id] = nodeExpr.filter(_F('_type').eq('receptor'));

          /* var geneTicked = function(expr) {
            return genes[expr.i].ticked;
          };

          var edgeRef = function(edge) {  // temp
            return {
              i: edge.i,
              id: edge.id,
              type: edge.type,
              class: edge.class,
              value: edge.value
            }
          }

          var nodeExpr = data.edgesIndex[cell.id] || [];

          cell._expr = nodeExpr.filter(geneTicked).map(edgeRef);
          cell._ligands   = cell._expr.filter(_F('class').eq('ligand'));
          cell._receptors = cell._expr.filter(_F('class').eq('receptor'));
          //_expr.sort(_valueComp);

          //cell._ligands = data.outEdgesIndex[cell.id].filter(geneTicked).map(edgeRef);   // temp solution
          //cell._receptors = data.inEdgesIndex[cell.id].filter(geneTicked).map(edgeRef);

          cell.values = [0,0];
          cell.values[0] = d3.sum(cell._ligands,_value);
          cell.values[1] = d3.sum(cell._receptors,_value);
          cell.value = d3.sum(cell.values); */

        });

        //data.nodes.forEach(function(node) {

        //});

        /* angular.forEach(cells, function(node) {  // Improve this
          if (!node.ticked || node.type !== 'node') { return; }

          var nodeExpr = data.edgesIndex[node.id];

          if (!nodeExpr) {  // todo: store in seperate table
            $log.debug('getting all gene expression for '+node.name);

            nodeExpr = [];

            genes.forEach(function(gene) {
              var v = +expr[gene.i + 1][node.i + 1];

              if (v > 0) {

                //console.log(gene,node);

                var _edge = (gene._type === 'receptor') ? new Edge(gene,node) : new Edge(node,gene);
                _edge.value = v;
                _edge.i = gene.i; // remove
                _edge.id = gene.id;  // remove {target, source}.id
                _edge.type = 'expression';  // remove
                _edge._type = gene._type;

                nodeExpr.push(_edge);

              }
            });

            // sort once
            data.edgesIndex[node.id] = nodeExpr.sort(function(a,b) { return b.value - a.value; });

            data.outEdgesIndex[node.id]   = nodeExpr.filter(_F('_type').eq('ligand'));
            data.inEdgesIndex[node.id] = nodeExpr.filter(_F('_type').eq('receptor'));

          }

          var geneTicked = function(expr) {
            return genes[expr.i].ticked;
          };

          var edgeRef = function(edge) {
            return {
              i: edge.i,
              id: edge.id,
              //type: edge.type,
              value: edge.value
            }
          }

          node._expr = nodeExpr.filter(geneTicked).map(edgeRef);

          //_expr.sort(_valueComp);

          node._ligands = data.outEdgesIndex[node.id].filter(geneTicked).map(edgeRef);   // temp solution
          node._receptors = data.inEdgesIndex[node.id].filter(geneTicked).map(edgeRef);

          node.values[0] = d3.sum(node._ligands,_value);
          node.values[1] = d3.sum(node._receptors,_value);
          node.value = d3.sum(node.values);

        //});

          nodeExpr.forEach(function(edge) {
            if (edge.source.ticked && edge.target.ticked) {

              var min = (edge._type === 'receptor') ? options.receptorFilter : options.ligandFilter;
              var _v = edge.value;

              if (_v && _v > 0 && _v >= min) {
                data.edges.push(edge);
              }

            }
          });

        //angular.forEach(data.nodes, function(node) {  // Improve this

          /* angular.forEach(data.edgesIndex[node.id], function(expr) {  // filtered edges, todo: move to filters

            var min = (expr._type === 'receptor') ? options.receptorFilter : options.ligandFilter;
            //var _v = expr.value;

            //var target = data.nodesIndex[genes[expr.i].id];
            if (expr.source.ticked && expr.target.ticked) {
              //var min = (target.type === 'gene.receptor') ? options.receptorFilter : options.ligandFilter;
              var _v = expr.value;
              if (_v && _v > 0 && _v >= min) {
                //console.log(target.type);
                //var _edge = (target.type === 'gene.receptor') ? new Edge(target,node) : new Edge(node,target);
                //_edge.value = _v;
                //_edge.type = 'expression';

                //console.log(expr);

                data.edges.push(expr);

                if (data.edges.length > MAXEDGES) {
                  $log.warn('Maximum number of edges exceeded', data.edges.length);
                  throw StopIteration;
                }

              }

            }

          });

        });*/

        pairs.forEach(function addLinks(_pair) {
          //$log.debug('Constructing edges for',_pair);

          //console.log(_pair);

          var _ligand = data.nodesIndex[_pair.Ligand];
          var _receptor = data.nodesIndex[_pair.Receptor];
          if (_ligand && _receptor) {
            var _lredge = new Edge(_ligand,_receptor);
            _lredge.type = 'pair';
            addEdge(_lredge);
          }

          if (data.edges.length > MAXEDGES) {
            $log.warn('Maximum number of edges exceeded', data.edges.length);
            throw StopIteration;
          }

        });

        data.nodes.forEach(function(node) {  // todo: move
          if (!node.ticked) { return; }

          var a = function(a,b) { return b.value - a.value; };

          //console.log(data.edgesIndex[node.id]);

          data.edgesIndex[node.id] = data.edgesIndex[node.id].sort(a);
          data.outEdgesIndex[node.id] = data.edgesIndex[node.id].filter(_F('source').eq(node));
          data.inEdgesIndex[node.id] = data.edgesIndex[node.id].filter(_F('target').eq(node));

          data._outEdgesIndex[node.id] = data.outEdgesIndex[node.id].filter(_ticked);
          data._inEdgesIndex[node.id] = data.inEdgesIndex[node.id].filter(_ticked);

          node.values[0] = d3.sum(data._outEdgesIndex[node.id],_value);
          node.values[1] = d3.sum(data._inEdgesIndex[node.id],_value);
          node.value = d3.sum(node.values);
          //console.log(node.id);
        });

      }

      function _draw(options) {
        $log.debug('Drawing graph');

        if (data.nodes.length < 1) {
          _clear();
          return;
        }

        //$timeout(function() {
        d3.select('#vis svg')
          .classed('labels',options.showLabels)
          .datum(data)
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

        data.nodes = [];
        data.edges = [];
        data.nodesIndex = {};
        data.edgesIndex = {};

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

        //console.log(data.nodes);

        $log.debug('Total nodes: ', data.nodes.length);
        $log.debug('Total Edges: ',data.edges.length);

        data.edgeCount = data.edges.length;

        //_sortAndFilterEdges(options);

        cfpLoadingBar.inc();

        data._nodes = data.nodes.filter(_ticked);  // combine these -> _sortAndFilterNodes
        _sortAndFilterNodes(options);

        data.edges.forEach(function(d) {  // -> sort and filter edges
          d.ticked = false;
        });

        data._nodes.forEach(function(node) {
          data.edgesIndex[node.id].forEach(function(d) {
            d.ticked = true;
          });
        });

        data._edges = data.edges.filter(_ticked);

        if (data._edges.length > options.edgeRankFilter*data._edges.length) {

          data._edges = data._edges
            .sort(_valueComp)
            .slice(0,options.edgeRankFilter*data.edges.length);

        }

        $log.debug('Filtered nodes: ',data._nodes.length);
        $log.debug('Filtered edges: ',data._edges.length);

        cfpLoadingBar.inc();

        /* data.edges.forEach(function(d, i) {  // Set in/out links
          d.index = i;

          //

          //console.log(d.source, d.target);
          d.source.lout = d.source.lout || [];
          d.target.lin = d.source.lin || [];

          d.source.lout.push(i);
          d.target.lin.push(i);

          d.count = d.source.lout.filter(function(_link) {
            return (_link === d.target.index);
          }).length;

          //console.log(d.source, d.target);

        }); */

        data._nodes.forEach(function(d) {

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

      function __getDATA() {  // This is hive version, move to service
        var _json = {

        };

        _json.nodes = data.nodes.map(function(node, i) {

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

        _json.edges = data.edges.map(function(edge) {
          return {
            data: {
              id: edge.index,
              name: edge.name,
              source: data.nodes.indexOf(edge.source),
              target: data.nodes.indexOf(edge.target),
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

        /*data.nodes.forEach(function(node, i) {
          _gml.push(['  node','[']);
          _gml.push(['    id',String(i)]);
          _gml.push(['    label',quote(node.name)]);
          _gml.push(['    type',quote(node.type.split('.')[1] || 'sample')]);
          _gml.push(['    value',String(node.value)]);
          _gml.push(['    genes',quote(String(node.genes))]);
          _gml.push(['  ]']);
        });*/

        /* data.edges.forEach(function(edge,  i) {
          _gml.push(['  edge','[']);
          _gml.push(['    id',String(edge.index)]);
          _gml.push(['    label',quote(edge.name)]);
          _gml.push(['    source',String(data.nodes.indexOf(edge.source))]);
          _gml.push(['    target',String(data.nodes.indexOf(edge.target))]);
          _gml.push(['    value',String(edge.value)]);
          _gml.push(['  ]']);
        }); */

      }

      return {
        data: data,
        chart: chart,
        update: debounce(_update, 30),
        makeNetwork: _makeNetwork,
        draw: _draw,
        clear: _clear,
        getJSON: _getJSON,
        getGML: _getGML
      };

    });

})();
