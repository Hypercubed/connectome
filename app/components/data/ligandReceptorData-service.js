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
            id: d.Ligand+'_'+d.Receptor,
            name: d.Ligand+'-'+d.Receptor,
            Ligand: d.Ligand,
            Receptor: d.Receptor,
            ligandId: d.Ligand+'.ligand',
            receptorId: d.Receptor+'.receptor',
            source: d.Source
          };
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

          if (i === 0) { return row; }
          return row.map(function(e,i) {
            return i === 0 ? e : +e;
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
          /*jshint camelcase: false */
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
        /*jshint camelcase: true */
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

      service.load = function load() {

        return $q.all([_getPairs(files.pairs), _getExpression(files.expression), _getOntology(files.ontology), _getGenes(files.genes)])
          .then(function(data) {

            service.data.pairs = data[0];
            var _expr = service.data.expr = data[1];
            var _ontology = data[2];
            service.data.genes = data[3];

            //console.log(data);

            // get samples from expression table
            service.data.cells = _expr[0].slice(1).map(function(d,i) {

              var _cell = {
                name: d,
                id: String(i),  // better name?
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
              var i = _genesIndecies.indexOf(gene.name);
              gene.i = i;

              if (i > -1) {
                gene.median = d3.median(_expr[gene.i + 1].slice(1));
              } else {
                gene.median = 0;
              }

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

            // cross reference pairs
            service.data.pairs = service.data.pairs.filter(function(pair) {

              var _ligand, _receptor;

              service.data.genes.forEach(function(gene) {
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
              pair.ligand = _ligand;
              pair.receptor = _receptor;

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

      function _match(obj, text) {
        if (text === '') { return true; }

        var key;

        // if both are objects check each key
        if (obj && text && typeof obj === 'object' && typeof text === 'object' ) {
          if (angular.equals(obj, text)) { return true; }
          for (key in text) {
            if (!hasOwnProperty.call(obj, key) || !_match(obj[key], text[key])) {
              return false;
            }
          }
          return true;
        }

        // if array, check ao leats one match
        if (angular.isArray(text)) {
          if (text.length === 0) { return true; }
          for (key in text) {
            if (_match(obj, text[key])) {
              return true;
            }
          }
          return false;
        }

        if (typeof text === 'boolean') {
          return obj === text;
        }

        return ''+obj === ''+text;
      }

      service.getExpressionValues = function (filter, max, acc) {
        filter = filter || {};
        acc = acc || _F('value');

        var ligandMin = filter.ligandMin || 0;
        var receptorMin = filter.receptorMin || 0;

        var edges = [];

        service.data.genes.forEach(function(gene) {
          if (gene.i < 0) { return; }
          if (gene.locked) { return false; }
          if (filter.gene && !_match(gene,filter.gene)) { return false; }


          var min = Math.max(gene.class === 'ligand' ? ligandMin : receptorMin,0);

          service.data.cells.forEach(function(cell) {
            if (cell.i < 0) { return; }
            if (cell.locked) { return false; }
            if (filter.cell && !_match(cell,filter.cell)) { return false; }

            var v = +service.data.expr[gene.i+1][cell.i+1];

            if (v > min) {  // todo: insertion sort
              edges.push(
              {
                gene: gene,
                cell: cell,
                value: v,
                specificity: (v+1)/(gene.median+1)
              });
            }

          });
        });

        $log.debug('found',edges.length, 'expression values');
        return edges.sort(function(a,b){ return acc(b) - acc(a); }).slice(0,max);

      };

      service.getPathways = function getPathways(filter, max, acc) {
        max = max || 10;
        acc = acc || _F('value');

        var paths = [];

        $log.debug('Calculating pathways');

        var ligandMin = (filter.ligandMin !== undefined) ? filter.ligandMin : 10;
        var receptorMin = (filter.receptorMin !== undefined) ? filter.receptorMin : 10;

        var count = 0;

        service.data.pairs.forEach(function (pair) {

          if (pair.locked) { return false; }

          if (pair.ligand.i < 0 || pair.receptor.i < 0) { return; }

          if (filter.pair && !_match(pair,filter.pair)) { return; }

          if (pair.ligand.locked) { return false; }
          if (pair.receptor.locked) { return false; }

          if (filter.ligand && !_match(pair.ligand,filter.ligand)) { return; }
          if (filter.receptor && !_match(pair.receptor,filter.receptor)) { return; }

          //console.log(pair.name);

          service.data.cells.forEach(function(source)  {

            if (source.locked) { return false; }

            var l = +service.data.expr[pair.ligand.i+1][source.i+1];
            var ls = (l+1)/(pair.ligand.median+1);

            if (l <= ligandMin) { return; }

            if (filter.source && !_match(source,filter.source)) { return; }
            if (filter.cell && !_match(source,filter.cell)) { return; }

            //console.log(source.name);

            service.data.cells.forEach(function(target) {

              if (target.locked) { return false; }

              var r = +service.data.expr[pair.receptor.i+1][target.i+1];
              var rs = (r+1)/(pair.receptor.median+1);

              if (r <= receptorMin) { return; }

              if (filter.target && !_match(target,filter.target)) { return; }
              if (filter.cell   && !_match(target,filter.cell)) { return; }

              //console.log(target.name);

              // todo: use insertion sort (fin position, if pos > max, don't push)
              paths.push({
                pair: pair,
                source: source,
                ligand: pair.ligand,
                receptor: pair.receptor,
                target: target,
                ligandExpression: l,
                receptorExpression: r,
                value: l*r,
                specificity: ls*rs
              });

              if (paths.length > max) {
                paths = paths.sort(function(a,b) { return acc(b) - acc(a); }).slice(0,max);
              }

              count++;

            });
          });

        });

        $log.debug('found',paths.length,'paths out of',count);
        //console.log('found',paths.length,'paths out of',count);

        return paths;
      };

      return service;

    });

})();
