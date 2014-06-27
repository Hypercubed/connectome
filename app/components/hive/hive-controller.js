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
        nodes: {},
        edges: {},
        edgeCount: 0,
        ligandExtent: [0,100000],
        receptorExtent: [0,100000],
        hoverItem: null,
        //hovertext: ''
        selectedItems: [null]
      };

      var chart = hiveGraph();

      //console.log(chart);

      //var valueFormat = d3.format('.2f');
      //var join = function(d) {return d.join(' '); };

      //function formatList(arr, max) {
      //  var l = arr.slice(0,max).join(',');
      //  if (arr.length > max) {l += ' ( +'+(arr.length-max)+' more)';}
      //  return l;
      //}

      //var _gene = _F('gene');
      //var _type = _F('type');
      //var _name = _F('name');
      var _value = _F('value');

      /* function nodeTipText(d) {  // Todo: clean this up

        var s = d.name.split('.');
        var name = s[0];
        var html = [['<b>',name,'</b>']];

        if (d.values[0] > 0) {html.push([(d.lin.length > 1) ? 'Sum of' : '', 'Ligand expression:',valueFormat(d.values[0])]);}
        if (d.values[1] > 0) {html.push([(d.lout.length > 1) ? 'Sum of' : '', 'Receptor expression:',valueFormat(d.values[1])]);}
        if (d.genes && d.genes.length > 0)   {html.push(['Genes:',formatList(d.genes,4)]);}
        if (d.expr && d.expr.length > 0)   {html.push(['Top genes:',formatList(d.expr.map(_gene),4)]);}

        if (d.meta) {
          var keys = ['Name', 'Ontology', 'HGNCID', 'UniprotID','Taxon', 'Age'];
          keys.forEach(function(k) {
            if (d.meta[k]) {
              html.push([k+':',d.meta[k]]);
            }
          });
        }

        return html.map(join).join('<br>');
      }

      function edgeTipText(d) {

        //var s = ''; //(selected.pairs.length > 1) ? 'Sum of' : '';

        var html = [['<b>',d.name,'</b>']];

        //if (d.source.values[0] > 0) {html.push([(d.source.ligands.length > 1) ? 'Sum of' : '', 'Ligand expression:',valueFormat(d.source.values[0])]);}
        //if (d.target.values[1] > 0) {html.push([(d.target.receptors.length > 1) ? 'Sum of' : '', 'Receptor expression:',valueFormat(d.target.values[1])]);}

        html.push([
          //s,'Ligand expression:',valueFormat(d.values[0]),
          //'<br />', s,'Receptor expression:',valueFormat(d.values[1]),
          'Expression:',valueFormat(d.value)
        ]);

        return html.map(join).join('<br>');
      } */

      //var _hover = _F('hover');
      chart.on('hover', function(d) {
        $rootScope.$apply(function() {
          data.hoverEvent = true;

          if (!d && !data.selectedItems[0].fixed) {
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

      /* function Node(id, name, type) {
        return {
          id: id,
          name: name,
          type: type,
          lout: [],
          lin: [],
          //out: [],
          //in: [],
          //genes: [],
          //ligands: [],  // remove these
          //receptors: [],
          value: 0,
          values: [0,0]
        };
      } */

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

      /*       function _makeNodes(pairs, cells, expr) {

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

        //console.log(nodes);

        data.nodeCount = nodes.length;

        return nodes;

      } */


      /* function Node(id, name, type) {
        return {
          id: id,
          name: name,
          type: type,
          lout: [],
          lin: [],
          //out: [],
          //in: [],
          //genes: [],
          //ligands: [],  // remove these
          //receptors: [],
          value: 0,
          values: [0,0]
        };
      } */

      /* function Node(_node, name, type) {
        if (typeof _node !== 'object') { return Node({ id: _node, name: name, type: type }); }

        _node.values = [0,0];
        _node.value = 0;
        _node.lout = [];
        _node.lin = [];

        _node._expr = [];    // rename these
        _node._ligands = [];
        _node._receptors = [];

        return _node;
      } */

      function Node(id, name, type) {
        if (id) {this.id = id;}
        if (name) {this.name = name;}
        if (type) {this.type = type;}

        this.values = [0,0];
        this.value = 0;
        this.lout = [];
        this.lin = [];

        this._expr = [];    // rename these
        this._ligands = [];
        this._receptors = [];
      }

      function _makeNodes(genes, pairs, cells) {  // Selected pairs, selected cells

        var _nodes = [];

        //console.log(genes.length);

        cells.forEach(function(cell) {
          if (!cell.ticked) { return; }

          var _node = angular.extend(cell, new Node());

          _node.type = 'node';

          //console.log(_node.expr);

          _node._expr = _node.expr.filter(function(expr) {
            return genes[expr.id].ticked;
          });

          _node._expr.sort(_valueComp);
          _node._ligands = _node._expr.filter(_F('type').eq('ligand'));
          _node._receptors = _node._expr.filter(_F('type').eq('receptor'));

          _node.values[0] = d3.sum(_node._ligands,_value);
          _node.values[1] = d3.sum(_node._receptors,_value);
          _node.value = d3.sum(_node.values);

          _nodes.push(_node);

        });

        genes.forEach(function(gene) {
          if (!gene.ticked) { return; }

          var _node = angular.extend(gene, new Node());
          _node.type = 'gene.'+gene._type;
          _nodes.push(_node);
        });

        //console.log(_nodes.length, cells.length);

        /* if (_nodes.length !== cells.length + genes.length) {
          $log.error('Inconsistancy found in number of generated nodes.');
          $log.error('nodes',_nodes.length);
          $log.error('cells',cells.length);
          $log.error('genes',genes.length);
        } */

        return _nodes;

      }

      /* function _makeNodes(pairs, cells, expr) {

        var _nodes = [];

        ['Ligand','Receptor'].forEach(function(d,i) {
          var type = d.toLowerCase();

          cells.forEach(function(cell) {
            var _node = new Node(cell.id,cell.name+'.'+type,'node.'+type);

            pairs.forEach(function(_pair) {
              var index = _pair.index[i];
              var exprValue = +expr[index][_node.id+1];

              if (exprValue > 0 && _node.genes.indexOf(_pair[d]) < 0) {
                _node.genes.push(_pair[d]);
                _node.value += +exprValue;
              }
            });

            _nodes.push(_node);
          });

        });

        if (_nodes.length !== 2*cells.length) {
          $log.error('Inconsistancy found in number of generated nodes.');
        }

        return _nodes;

      } */

      //var _F = function(key) { return function(d) {return d[key];}; };

      //var type = _F('type');
      var _valueComp = function(a,b) { return _value(b) - _value(a); };
      var _valueFilter = function(d) { return d.type !== 'node' || d.value >= 0; };
      //var typeFilter = function(type) { return function(d) {return d.type === type;}; };

      var _value0 = function(d) { return d.values[0]; };
      var _value1 = function(d) { return d.values[1]; };
      //var gtZero = function(d) {return d>0;};

      function _sortAndFilterNodes(nodes, options) {  //TODO: DRY this!!!

        data.nodeCount = nodes.length;

        //console.log(nodes.length);

        nodes = nodes.sort(_valueComp).filter(_valueFilter);    // Sort and filter out zeros

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

        console.log(filter0,filter1);

        var filtered = nodes.filter(function(d) {
          //console.log(d);
          return ( d.type !== 'node' || d.values[0] >= filter0 || d.values[1] >= filter1 );
        });

        //console.log(filtered.length);

        return filtered;

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

      var MAXEDGES = 1000;

      var StopIteration = new Error('Maximum number of edges exceeded');

      function _makeEdges(nodes, genes, pairs, expr, options) { // TODO: better

        //console.log(genes);

        try {
          return __makeEdges(nodes, genes, pairs, expr, options);
        } catch(e) {
          if(e !== StopIteration) {
            throw e;
          } else {
            growl.addErrorMessage(StopIteration.message);
            return [];
          }
        }
      }

      function __makeEdges(nodes, genes, pairs, expr, options) {


        var edges = [];

        if (nodes.length < 2) { return edges; }

        /* function matchKeys(meta, match) {  // Do this on load
          var keys = d3.keys(meta);
          var values = {};

          keys.forEach(function(k) {
            if (k.match(match)) {
              values[k.replace(match,'')] = meta[k];
            }
          });

          return values;
        } */

        var _n = {};  // Make this better

        nodes.forEach(function(node) {
          _n[node.name] = node;
        });

        //console.log([_l,_r,_n]);

        angular.forEach(_n, function(node) {  // Improve this

          angular.forEach(node._expr, function(expr) {
            var target = _n[genes[expr.id].name];
            if (target) {
              var min = (target.type === 'gene.receptor') ? options.receptorFilter : options.ligandFilter;
              var _expr = expr.value;
              if (_expr && _expr > 0 && _expr >= min) {
                //console.log(target.type);
                var _edge = (target.type === 'gene.receptor') ? new Edge(target,node) : new Edge(node,target);
                _edge.value = _expr;
                _edge.type = 'expression';
                edges.push(_edge);

                if (edges.length > MAXEDGES) {
                  $log.warn('Maximum number of edges exceeded', edges.length);
                  throw StopIteration;
                }
              }
            }

          });

        });

        pairs.forEach(function addLinks(_pair) {
          //$log.debug('Constructing edges for',_pair);

          //console.log(_pair);

          var _ligand = _n[_pair.Ligand];
          var _receptor = _n[_pair.Receptor];
          if (_ligand && _receptor) {
            var _lredge = new Edge(_ligand,_receptor);
            _lredge.type = 'pair';
            edges.push(_lredge);
          }

          if (edges.length > MAXEDGES) {
            $log.warn('Maximum number of edges exceeded', edges.length);
            throw StopIteration;
          }
          //var _l = nodes.filter()



        /*   function _linkNodes(i, target) {

            var index = _pair.index[i];
            var row = expr[index];
            if (!row) { return; }

            var min = (i === 0) ? options.ligandFilter : options.receptorFilter;

            data.nodes.forEach(function(_node) {
              if (!_node.type.match('node')) {return;}

              var _expr = +row[_node.id+1];

              if (!_expr || _expr <= 0 || _expr < min) {return;}

              var _edge = (i === 0) ?
                new Edge(_node,target) :
                new Edge(target,_node);

              _edge.value = _expr;
              _edge.type = 'expression';
              edges.push(_edge);

            });
          }

          var _ligand = _l[_pair.Ligand];
          if (!_ligand) {
            _ligand = new Node(i,_pair.Ligand,'gene.ligand');
            _ligand.meta = matchKeys(_pair, 'Ligand.');
            nodes.push(_ligand);
            _ligand.value = 0;  // Get real values
            _ligand.values = [0,0];
            _l[_pair.Ligand] = _ligand;
            data.nodeCount++;

            _linkNodes(0, _ligand);
          }

          var _receptor = _r[_pair.Receptor];
          if (!_receptor) {
            _receptor = new Node(i,_pair.Receptor,'gene.receptor');
            _receptor.meta = matchKeys(_pair, 'Receptor.');
            _receptor.value = 0;  // Get real values
            _receptor.values = [0,0];
            nodes.push(_receptor);
            _r[_pair.Receptor] = _receptor;
            data.nodeCount++;

            _linkNodes(1, _receptor);
          }

          //var name = _pair.Ligand + ' -> ' + _pair.Receptor;
          var _lredge = new Edge(_ligand,_receptor);
          _lredge.type = 'pair';
          edges.push(_lredge);

          if (edges.length > MAXEDGES) {
            $log.warn('Maximum number of edges exceeded', edges.length);
            throw StopIteration;
          }

          _lredge.value = 1;*/

        });

        return edges;

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
        d3.selectAll('#vis svg g').remove();
      }

      function _makeNetwork(_data, options) {  // pairs, cells, expr, options

        //var expr = data.expr;
        //console.log(expr);

        if (!_data) {return;}

        var pairs = _data.pairs.filter(function(d) { return d.ticked; });
        var cells = _data.cells.filter(function(d) { return d.ticked; });
        var expr = _data.expr;
        var genes = _data.genes.filter(function(d) { return d.ticked; });

        $log.debug('Constructing');

        /* _selected.cells.forEach(function(cell) {  // TODO: move this, should only run when new cell is selected
          //if (cell.expr) { return; };

          cell.expr = [];

          $log.debug('getting all gene expression for '+cell.name);

          _data.genes.forEach(function(gene) {
            var v = expr[gene.id + 1][cell.id + 1];
            if (v > 0) {
              cell.expr.push({
                gene: gene,
                type: gene.type,
                value: v
              });
            }
          });

          cell.expr.sort(_valueComp);

          cell.ligands = cell.expr.filter(_type.eq('Ligand'));
          cell.receptors = cell.expr.filter(_type.eq('Receptor'));

        }); */

        if (cells.length < 1 && genes.length < 1) {
          data.nodes = [];
          data.edges = [];

          growl.addWarnMessage('No cells or genes selected');
          //if (genes.length < 1) {growl.addWarnMessage('No genes selected');}
          //if (pairs.length < 1) {growl.addWarnMessage('No pairs selected.  Select at least one L-R pair.');}
          return;
        }

        cfpLoadingBar.start();

        data.nodes = _makeNodes(_data.genes, pairs, _data.cells, expr);

        $log.debug('Total nodes: ',data.nodes.length);

        data.nodes = _sortAndFilterNodes(data.nodes, options);

        cfpLoadingBar.inc();

        $log.debug('Filtered nodes: ',data.nodes.length);

        $log.debug('Pairs: ',pairs.length);

        data.edges = _makeEdges(data.nodes, _data.genes, pairs, expr, options);

        $log.debug('Total Edges: ',data.edges.length);

        data.edgeCount = data.edges.length;

        cfpLoadingBar.inc();

        if (data.edges.length > options.edgeRankFilter*data.edges.length) {

          data.edges = data.edges
            .sort(_valueComp)
            .slice(0,options.edgeRankFilter*data.edges.length);

        }

        $log.debug('Filtered edges: ',data.edges.length);

        cfpLoadingBar.inc();

        data.edges.forEach(function(d, i) {  // Set in/out links
          d.index = i;

          //console.log(d.source, d.target);

          d.source.lout.push(i);
          d.target.lin.push(i);

          d.count = d.source.lout.filter(function(_link) {
            return (_link === d.target.index);
          }).length;

        });

        data.nodes.forEach(function(d) {
          if (d.type.match(/gene/)) {
            d.class=d.type.replace('gene.','');
          } else {
            if (d.lout.length > 0) {d.class='ligand';} //  Ligand only, lime green
            if (d.lin.length > 0) {d.class='receptor';}   //  Receptor only, Very light blue
            if (d.lout.length > 0 && d.lin.length > 0) {d.class='both';}   //  Both, Dark moderate magenta
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

  /* app
    .controller('HiveGraphCtrl', function ($scope, $log, localStorageService, ligandReceptorData, hiveGraph) {

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

      hiveGraph.clear();
      $scope.graphData = hiveGraph.data;

      function updateNetwork(newVal, oldVal) {
        if (newVal === oldVal) {return;}
        hiveGraph.makeNetwork($scope.selected.pairs, $scope.selected.cells, $scope.data.expr, $scope.options);
        hiveGraph.draw($scope.options);
      }

      $scope.saveJson = function() {
        var txt = graphDataToJSON(hiveGraph.data);
        var blob = new Blob([txt], { type: 'data:text/json' });
        saveAs(blob, 'lr-graph.json');
      };

      function graphDataToJSON(data) {
        var _json = {};

        _json.nodes = data.nodes.map(function(node) {
          return {
            name: node.name,
            type: node.type.split('.')[1],
            value: node.value,
            genes: node.genes
          };
        });

        _json.links = data.edges.map(function(edge) {
          return {
            name: edge.name,
            source: data.nodes.indexOf(edge.source),
            target: data.nodes.indexOf(edge.target),
            value: edge.value
          };
        });

        return JSON.stringify(_json);
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
        //localStorageService.set('ligandRange', hiveGraph.graph.ligandRange);
        //localStorageService.set('receptorRange', hiveGraph.graph.receptorRange);
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
        //hiveGraph.graph.ligandRange = localStorageService.get('ligandRange') || hiveGraph.graph.ligandRange;
        //hiveGraph.graph.receptorRange = localStorageService.get('receptorRange') || hiveGraph.graph.receptorRange;

      }

      ligandReceptorData.load().then(function() {
        $scope.data = ligandReceptorData.data;

        loadSelection();

        updateNetwork(true,false);

        $scope.$watchCollection('selected', updateNetwork);

        $scope.$watchCollection('options', saveSelection);
        $scope.$watchCollection('selected', saveSelection);

        $scope.$watch('options.ligandFilter', updateNetwork);
        $scope.$watch('options.receptorFilter', updateNetwork);
        $scope.$watch('options.ligandRankFilter', updateNetwork);
        $scope.$watch('options.receptorRankFilter', updateNetwork);

        $scope.$watch('options.edgeRankFilter', updateNetwork); // TODO: filter in place
        $scope.$watch('options.showLabels', function() {
          hiveGraph.draw($scope.options);
        });

      });

    }); */

})();
