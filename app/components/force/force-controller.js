/* global d3 */
/* global forceGraph */

(function() {
  'use strict';

  var app = angular.module('lrSpaApp');

  app
    .constant('EXPRESSIONFILE', 'data/LR.expr.txt')  // TODO: combine
    .constant('PAIRSFILE', 'data/LR.pairs.txt')
    .constant('ONTOLGYFILE', 'data/ontology.txt');

  app
    .service('ligandReceptorData', function($q, $log,$http,$timeout,dsv,EXPRESSIONFILE,PAIRSFILE,ONTOLGYFILE) {   // TODO: move
      var service = {};

      service.data = {
        expr: [],
        pairs: [],
        cells: [],
        genes: [],
        ontology: []
      };

      function _getPairs(filename) {
        return dsv.tsv.get(filename, {cache: true}, function(d,i) {
          d.i = i;
          d.id = i;
          //d.id = i;
          d.name = d.Ligand + '-' + d.Receptor;

          return d;
        })
        .error(function(data, status, headers, config) {
          $log.warn('Error',data, status, headers, config);
        })
        .success(function(data) {
          $log.debug('Pairs loaded:',data.length);
        })
        .then(function(res) {
          return res.data;
        });
      }

      function _getExpression(filename) {
        return dsv.tsv.getRows(filename, {cache: true})
          .error(function(data, status, headers, config) {
            $log.warn('Error',data, status, headers, config);
          })
          .success(function(data) {
            $log.debug('Genes loaded:', data.length);

          })
          .then(function(res) {
            return res.data;
          });
      }

      function _getOntology(filename) {
        return dsv.tsv.get(filename, {cache: true})
          .error(function(data, status, headers, config) {
            $log.warn('Error',data, status, headers, config);
          })
          .then(function(res) {

            var _ontology = {};

            res.data.forEach(function(_item) {
              _ontology[_item.Cell] = _item.Ontology;
            });

            return _ontology;
          });
      }

      service.load = function() {

        return $q.all([_getPairs(PAIRSFILE), _getExpression(EXPRESSIONFILE), _getOntology(ONTOLGYFILE)])
          .then(function(data) {
            $log.debug('Done loading');

            service.data.pairs = data[0];
            var _expr = service.data.expr = data[1];
            var _ontology = data[2];

            //var __expr = _expr.slice(1);

            service.data.cells = _expr[0].slice(1).map(function(d,i) {

              var _cell = {
                name: d,
                id: d,  // better name?
                i:  i,
                //id: i,   // TODO: get rid of this
                type: 'sample'
              };

              var _o = _ontology[d];
              if (_o) {
                _cell.meta = _cell.meta || {};
                _cell.meta.Ontology = _o;
              }

              /* _cell.expr = [];
              __expr.forEach(function(row) {
                var v = +row[i+1];
                if (v > 0) {
                  _cell.expr.push({ gene: row[0], value: v });
                }
              })
              _cell.expr.sort(function(a,b) { return b.value - a.value; }); */

              return _cell;
            });

            $log.debug('Samples loaded:', service.data.cells.length);

            function matchKeys(meta, match) {  // Do this on load
              var keys = d3.keys(meta);
              var values = {};

              keys.forEach(function(k) {
                if (k.match(match)) {
                  values[k.replace(match,'').toLowerCase()] = meta[k];
                }
              });

              return values;
            }

            service.data.genes = _expr.slice(1).map(function(row, i) {  // TODO: generate one gene file
              return {
                name: row[0],
                id: row[0],
                //id: i, // todo: get rid of this
                i: i,
                pairs: [], // todo: get rid of this
                type: 'gene',
                class: 'unknown',
                description: '',
                _genes: [],  // todo: get rid of this
                ligands: [],  // todo: get rid of this
                receptors: []
              };
            });

            service.data.pairs = service.data.pairs.filter(function(pair) {

              var _ligand, _receptor;

              service.data.genes.forEach(function(gene) {
                if (gene.name === pair.Ligand) {
                  _ligand = gene;
                } else if (gene.name === pair.Receptor) {
                  _receptor = gene;
                }
              });

              if (!_ligand || !_receptor) {
                $log.warn('Ligand or receptor missing from expression table');
                return false;
              }

              pair.index = [_ligand.i,_receptor.i];

              // cross reference
              _ligand.class = 'ligand';
              _ligand._genes.push(_receptor.i);
              _ligand.receptors.push({ i: _receptor.i });
              _ligand.meta = matchKeys(pair, 'Ligand.');
              _ligand.description = _ligand.meta.name;
              delete _ligand.meta.name;

              _receptor.class = 'receptor';
              _receptor._genes.push(_ligand.i);
              _receptor.ligands.push({ i: _ligand.i });
              _receptor.meta = matchKeys(pair, 'Receptor.');
              _receptor.description = _receptor.meta.name;
              delete _receptor.meta.name;

              return true;
            });

          });
      };

      return service;

    });

  app
    .service('forceGraph', function($log, $window, growl, cfpLoadingBar) {  // TODO: should be a directive

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

        if (d.meta) {
          var keys = ['Name', 'Ontology', 'HGNCID', 'UniprotID','Taxon', 'Age'];
          keys.forEach(function(k) {
            if (d.meta[k]) {
              html.push([k+':',d.meta[k]]);
            }
          });
        }

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

        console.log(nodes);

        nodes.forEach(function(_node) {

          _node.ligands = [];
          _node.receptors = [];
          _node.lout = [];
          _node.lin = [];
          _node.values = [0,0];

          pairs.forEach(function(_pair) {

            if(_pair.index[0] === -1 || _pair.index[1] === -1) {
              $log.warn('Ligand or receptor missing from expression table');
              //console.log(_pair.Ligand+'-'+_pair.Receptor);
              return;
            }

            var exprValues = _pair.index.map(function(_index) {
              return +expr[_index][_node.i+1];
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

        filter0 = Math.max(filter0, 0);
        filter1 = Math.max(filter1, 0);

        return nodes.filter(function(d) {
          return ( d.values[0] > filter0 || d.values[1] > filter1 );
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
            growl.addErrorMessage(StopIteration.message);
            return [];
          }
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

              var lexpr = +expr[lindex][src.i+1];
              if (lexpr === 0) {return;}

              data.nodes.forEach(function(tgt) {
                var rexpr = +expr[rindex][tgt.i+1];
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
        d3.selectAll('#vis svg g').remove();
      }



      function _makeNetwork(pairs, cells, expr, options) {
        $log.debug('Constructing');

        if (cells.length < 1 || pairs.length < 1) {
          data.nodes = [];
          data.edges = [];

          if (cells.length < 1) {growl.addWarnMessage('No cells selected');}
          if (pairs.length < 1) {growl.addWarnMessage('No pairs selected.  Select at least one L-R pair.');}
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
          if (d.lout.length > 0) {d.type='ligand';} //  Ligand only, lime green
          if (d.lin.length > 0) {d.type='receptor';}   //  Receptor only, Very light blue
          if (d.lout.length > 0 && d.lin.length > 0) {d.type='both';}   //  Both, Dark moderate magenta
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

})();
