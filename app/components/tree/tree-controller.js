/* global d3 */
/* global treeGraph */

(function() {
  'use strict';

  var app = angular.module('lrSpaApp');

  app
    .service('treeGraph', function($log, cfpLoadingBar) {  // TODO: should be a directive

      var data = {
        nodes: {},
        edges: {},
        edgeCount: 0,
        ligandExtent: [0,100000],
        receptorExtent: [0,100000]
      };

      var chart = treeGraph();

      //console.log(chart);

      var valueFormat = d3.format('.2f');
      var join = function(d) {return d.join(' '); };

      function formatList(arr, max) {
        var l = arr.slice(0,max).join(',');
        if (arr.length > max) {l += ' ( +'+(arr.length-max)+' more)';}
        return l;
      }

      function toTitleCase(str)
      {
        return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
      }

      chart.nodeTooltip.html(function(d) {  // Todo: clean this up
        var s = d.name.split('.');
        var name = s[0];
        var type = (d.genes.length === 1) ? toTitleCase(s[1]) : s[1];
        var html = [['<b>',name,'</b>']];

        if (d.value > 0) {html.push([(d.genes.length > 1) ? 'Sum of' : '',type, 'expression:',valueFormat(d.value),'tpm']);}
        if (d.genes.length > 0)   {html.push(['Genes:',formatList(d.genes,4)]);}

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
          'Expression:',valueFormat(d.value)
        ]);

        return html.map(join).join('<br>');
      });

      function Node(id, name, type) {
        return {
          id: id,
          name: name,
          type: type,
          value: 0,
          lout: [],
          lin: [],
          genes: [],
          ligands: [],  // remove these
          receptors: [],
          values: [100,100]
        };
      }

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

      function _makeNodes(pairs, cells, expr) {

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

          //pairs.forEach(function(_pair) {
          //  var _node = new Node(_pair.id,_pair[d]+'.'+type,type);
          //  _nodes.push(_node);
          //});

        });

        if (_nodes.length !== 2*cells.length) {
          $log.error('Inconsistancy found in number of generated nodes.');
        }

        /* var nodes = cells.slice(0);

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

        return nodes; */

        return _nodes;

      }

      function _sortAndFilterNodes(nodes, options) {

        var value = function(d) { return d.value; };
        var valueComp = function(a,b) { return value(b) - value(a) ; };

        nodes = nodes.sort(valueComp);

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

        console.log('filter',filter0,filter1);

        return nodes.filter(function(d) {
          if (d.value === 0) {return false;}

          var limit = (d.type.match('ligand')) ? filter0 : filter1;
          return d.value > 0  && d.value > limit;
        });

      }

      function _makeEdges(nodes, pairs, expr, options) {

        var edges = [];

        pairs.forEach(function addLinks(_pair, i) {
          $log.debug('Constructing network for',_pair);

          var lindex = _pair.index[0];
          var rindex = _pair.index[1];

          var name = _pair.Ligand + ' -> ' + _pair.Receptor;

          var _pairNode = new Node(i,name,'gene');  // Todo: move this?

          nodes.push(_pairNode);

          data.nodes.forEach(function(_node) {
            if (!_node.type.match('node')) {return;}

            var index = (_node.type === 'node.ligand') ? lindex : rindex;
            var min = (_node.type === 'node.ligand') ? options.ligandFilter : options.receptorFilter;

            var _expr = +expr[index][_node.id+1];
            if (!_expr || _expr <= 0 || _expr < min) {return;}

            var _edge = (_node.type === 'node.ligand') ?
              new Edge(_node,_pairNode) :
              new Edge(_pairNode,_node);

            _edge.value = _expr;
            
            edges.push(_edge);
          });

        });

        /* pairs.forEach(function addLinks(_pair) {
          $log.debug('Constructing network for',_pair);

          var lindex = _pair.index[0];
          var rindex = _pair.index[1];
           
          if (lindex > -1 && rindex > -1) {

            data.nodes.forEach(function(src) {  // all selected cell-cell pairs

              if (src.type !== 'ligand') return;

              var lexpr = +expr[lindex][src.id+1];
              if (lexpr === 0) {return;}

              data.nodes.forEach(function(tgt) {
                if (tgt.type !== 'receptor') return;

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


              });
            });

          }

        }); */

        return edges;

      }

      function _draw(options) {
        d3.select('#vis svg')
          .classed('labels',options.showLabels)
          .datum(data)
          .call(chart);
      }

      function _clear() {
        d3.select('#vis svg g').remove();
      }

      function _makeNetwork(pairs, cells, expr, options) {

        $log.debug('Constructing network');
        if (cells.length < 1 || pairs.length < 1) { return;}

        cfpLoadingBar.start();

        data.nodes = _makeNodes(pairs, cells, expr);

        $log.debug('Total nodes: ',data.nodes.length);

        data.nodes = _sortAndFilterNodes(data.nodes, options);

        cfpLoadingBar.inc();

        $log.debug('Filtered nodes: ',data.nodes.length);

        $log.debug('Pairs: ',pairs.length);

        data.edges = _makeEdges(data.nodes, pairs, expr, options);

        $log.debug('Total Edges: ',data.edges.length);

        data.edgeCount = data.edges.length;

        cfpLoadingBar.inc();

        if (data.edges.length > options.maxEdges) {

          $log.warn('Too many edges', data.edges.length);

          data.edges = data.edges
            .sort(function(a,b) { return b.value - a.value; })
            .slice(0,options.maxEdges);

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

        //data.nodes = data.nodes.filter(function(d) {   // Filtered nodes
        //  return true;
        //  return (d.lout.length + d.lin.length) > 0;
        //});

        cfpLoadingBar.complete();

      }

      return {
        data: data,
        chart: chart,
        makeNetwork: _makeNetwork,
        draw: _draw,
        clear: _clear
      };

    });

  app
    .controller('TreeGraphCtrl', function ($scope, $log, localStorageService, ligandReceptorData, treeGraph) {

      localStorageService.bind = function(scope, key, def) {
        var value = localStorageService.get(key);

        if (value === null && angular.isDefined(def)) {
          value = def;
        } else if (angular.isObject(value) && angular.isObject(def)) {
          value = angular.extend(def, value);
        }

        scope[key] = value;

        scope.$watchCollection(key, function(newVal) {
          localStorageService.set(key, newVal);
        });
      };

      /* Manage panel state */
     
      localStorageService.bind($scope, 'panelState', {
        filters: true,
        options: false,
        help: true
      });

      /* Make network */
      localStorageService.bind($scope, 'options', {
        showLabels: true,
        maxEdges: 100,
        ligandFilter: 10,
        receptorFilter: 10,
        ligandRankFilter: 0.8,
        receptorRankFilter: 0.8
      });

      treeGraph.clear();
      $scope.graphData = treeGraph.data;

      function updateNetwork(newVal, oldVal) {
        if (newVal === oldVal) {return;}
        treeGraph.makeNetwork($scope.selected.pairs, $scope.selected.cells, $scope.data.expr, $scope.options);
        treeGraph.draw($scope.options);
      }

      /* Load Data */
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
        //localStorageService.set('ligandRange', treeGraph.graph.ligandRange);
        //localStorageService.set('receptorRange', treeGraph.graph.receptorRange);
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
        //treeGraph.graph.ligandRange = localStorageService.get('ligandRange') || treeGraph.graph.ligandRange;
        //treeGraph.graph.receptorRange = localStorageService.get('receptorRange') || treeGraph.graph.receptorRange;
        
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

        $scope.$watch('options.maxEdges', updateNetwork); // TODO: filter in place
        $scope.$watch('options.showLabels', function() {
          treeGraph.draw($scope.options);
        });

      });

    });

})();