/* global d3 */
/* global _F */

(function() {
  'use strict';

  var app = angular.module('lrSpaApp');

  app
    .constant('files', {
      expression: 'data/LR.expr.txt',
      pairs: 'data/LR.pairs.txt',
      genes: 'data/LR.genes.txt',
      ontology: 'data/ontology.txt'
    });

  app
    .service('ligandReceptorData', function($q, $log,$http,$timeout,dsv,files) {
      var service = {};

      var cache = false;

      service.data = {
        expr: [],
        pairs: [],
        cells: [],
        genes: [],
        ontology: []
      };

      function _getPairs(filename) {
        return dsv.tsv.get(filename, {cache: cache}, function(d,i) {
          return {
            i: i,
            id: i,
            name: d.PairName,
            Ligand: d.Ligand,
            Receptor: d.Receptor,
            ligandId: d.Ligand+'.ligand',
            receptorId: d.Receptor+'.receptor',
          }
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
          return dsv.tsv.getRows(filename, {cache: cache}, function(row, i) {
            if (i == 0) { return row; }
            return row.map(function(e,i) {
              return i == 0 ? e : +e;
            });
          })
          .error(function(data, status, headers, config) {
            $log.warn('Error',data, status, headers, config);
          })
          .success(function(data) {
            $log.debug('Expression rows:', data.length);
          })
          .then(function(res) {
            return res.data;
          });
      }

      function _getGenes(filename) {
        return dsv.tsv.get(filename, {cache: cache}, function(d) {
          return {
            name: d.ApprovedSymbol,
            description: d.ApprovedName,
            class: d.Class.toLowerCase(),
            id: d.ApprovedSymbol+'.'+d.Class.toLowerCase(),
            age: d.Age,
            taxon: d.Taxon,
            consensus: d.Consensus_Call,
            type: 'gene',
            hgncid: d.HGNCID,
            uniprotid: d.UniProtID
          };
        })
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
        return dsv.tsv.get(filename, {cache: cache})
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

        return $q.all([_getPairs(files.pairs), _getExpression(files.expression), _getOntology(files.ontology), _getGenes(files.genes)])
          .then(function(data) {

            service.data.pairs = data[0];
            var _expr = service.data.expr = data[1];
            var _ontology = data[2];
            service.data.genes = data[3];

            // get samples from expression table
            service.data.cells = _expr[0].slice(1).map(function(d,i) {

              var _cell = {
                name: d,
                id: d,  // better name?
                i:  i,
                type: 'sample'
              };

              var _o = _ontology[d];
              if (_o) {
                _cell.meta = _cell.meta || {};
                _cell.meta.Ontology = _o;
              }

              return _cell;
            });

            $log.debug('Samples loaded:', service.data.cells.length);
            $log.debug('Done loading');

            /* function matchKeys(meta, match) {  // Do this on load
              var keys = d3.keys(meta);
              var values = {};

              keys.forEach(function(k) {
                if (k.match(match)) {
                  values[k.replace(match,'').toLowerCase()] = meta[k];
                }
              });

              return values;
            } */

            // Get index for each gene in expression table
            var _genesIndecies = _expr.slice(1).map(_F(0));
            service.data.genes = service.data.genes.map(function(gene) {
              gene.i = _genesIndecies.indexOf(gene.name);
              return gene;
            });

            /* service.data.genes = _expr.slice(1).map(function(row, i) {  // TODO: generate one gene file
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
            }); */

            // corss reference pairs
            service.data.pairs = service.data.pairs.filter(function(pair) {

              var _ligand, _receptor;

              service.data.genes.forEach(function(gene, i) {
                //if (i === 0) {
                //  console.log(gene.id, pair.ligandId);
                //};
                if (gene.id === pair.ligandId) {
                  _ligand = gene;
                } else if (gene.id === pair.receptorId) {
                  _receptor = gene;
                }
              });

              if (!_ligand || !_receptor) {
                $log.warn('Ligand or receptor missing from expression table');
                pair.index = [-1,-1];
                return false;
              }

              pair.index = [_ligand.i,_receptor.i];

              if (_ligand.class !== 'ligand') {
                $log.warn('Class inconsistancy',_ligand.name);
                return false;
              }

              if(_receptor.class !== 'receptor') {
                $log.warn('Class inconsistancy',_receptor.name);
                return false;
              }

              //console.log(_receptor.class == 'receptor');

              // cross reference
              //_ligand.class = 'ligand';
              //_ligand._genes.push(_receptor.i);
              //_ligand.receptors.push({ i: _receptor.i });
              //_ligand.meta = matchKeys(pair, 'Ligand.');
              //_ligand.description = _ligand.meta.name;
              //delete _ligand.meta.name;

              //_receptor.class = 'receptor';
              //_receptor._genes.push(_ligand.i);
              //_receptor.ligands.push({ i: _ligand.i });
              ////_receptor.meta = matchKeys(pair, 'Receptor.');
              //_receptor.description = _receptor.meta.name;
              //delete _receptor.meta.name;

              //console.log(pair);

              return true;
            });

            return service.data;

          });
      };

      return service;

    });

})();
