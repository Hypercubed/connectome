/* global d3 */

(function() {
  'use strict';

  var app = angular.module('lrSpaApp');

  app
    .constant('files', {
      expression: 'data/LR.expr.txt',
      pairs: 'data/LR.pairs.txt',
      ontology: 'data/ontology.txt'
    });

  app
    .service('ligandReceptorData', function($q, $log,$http,$timeout,dsv,files) {
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

        return $q.all([_getPairs(files.pairs), _getExpression(files.expression), _getOntology(files.ontology)])
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

})();
