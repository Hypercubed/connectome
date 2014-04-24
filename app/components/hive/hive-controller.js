/* global d3 */
/* global hiveGraph */

(function() {
  'use strict';

  var app = angular.module('lrSpaApp');

  app
    .service('hiveGraph', function($log, cfpLoadingBar) {  // TODO: should be a directive

      var data = {
        nodes: {},
        edges: {},
        edgeCount: 0,
        ligandExtent: [0,100000],
        receptorExtent: [0,100000]
      };

      var chart = hiveGraph();

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

      var _F = function(key) { return function(d) {return d[key];} }
      var value = _F('value');
      var type = _F('type');
      var valueComp = function(a,b) { return value(b) - value(a); };
      var valueFilter = function(d) {return value(d)>0;};
      var typeFilter = function(type) { return function(d) {return d.type === type;} };       

      function _sortAndFilterNodes(nodes, options) {  //TODO: DRY this

        nodes = nodes.sort(valueComp).filter(valueFilter);    // Sort and filter out zeros

        var ligands = nodes.filter(typeFilter('node.ligand'));
        var topLigands = ligands.slice(0,-options.ligandRankFilter*ligands.length);

        var receptors = nodes.filter(typeFilter('node.receptor'));
        var topReceptors = receptors.slice(0,-options.receptorRankFilter*receptors.length);

        data.ligandExtent = d3.extent(ligands,value);
        data.receptorExtent = d3.extent(receptors,value);

        return topLigands.concat(topReceptors);
      }

      function __sortAndFilterNodes(nodes, options) {

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

        //console.log('filter',filter0,filter1);

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
            .sort(valueComp)
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
    .controller('HiveGraphCtrl', function ($scope, $log, localStorageService, ligandReceptorData, hiveGraph) {

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
      }

      function graphDataToJSON(data) {
        var _json = {};

        _json.nodes = data.nodes.map(function(node) {
          return {
            name: node.name,
            type: node.type.split('.')[1],
            value: node.value,
            genes: node.genes
          }
        });

        _json.links = data.edges.map(function(edge) {
          return {
            name: edge.name,
            source: data.nodes.indexOf(edge.source),
            target: data.nodes.indexOf(edge.target),
            value: edge.value
          }
        });

        return JSON.stringify(_json);
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

        $scope.$watch('options.maxEdges', updateNetwork); // TODO: filter in place
        $scope.$watch('options.showLabels', function() {
          hiveGraph.draw($scope.options);
        });

      });



    });

})();

/*

{
  "nodes":[
    {"name":"Myriel","group":1},
    {"name":"Napoleon","group":1},
    {"name":"Mlle.Baptistine","group":1},
    {"name":"Mme.Magloire","group":1},
    {"name":"CountessdeLo","group":1},
    {"name":"Geborand","group":1},
    {"name":"Champtercier","group":1},
    {"name":"Cravatte","group":1},
    {"name":"Count","group":1},
    {"name":"OldMan","group":1},
    {"name":"Labarre","group":2},
    {"name":"Valjean","group":2},
    {"name":"Marguerite","group":3},
    {"name":"Mme.deR","group":2},
    {"name":"Isabeau","group":2},
    {"name":"Gervais","group":2},
    {"name":"Tholomyes","group":3},
    {"name":"Listolier","group":3},
    {"name":"Fameuil","group":3},
    {"name":"Blacheville","group":3},
    {"name":"Favourite","group":3},
    {"name":"Dahlia","group":3},
    {"name":"Zephine","group":3},
    {"name":"Fantine","group":3},
    {"name":"Mme.Thenardier","group":4},
    {"name":"Thenardier","group":4},
    {"name":"Cosette","group":5},
    {"name":"Javert","group":4},
    {"name":"Fauchelevent","group":0},
    {"name":"Bamatabois","group":2},
    {"name":"Perpetue","group":3},
    {"name":"Simplice","group":2},
    {"name":"Scaufflaire","group":2},
    {"name":"Woman1","group":2},
    {"name":"Judge","group":2},
    {"name":"Champmathieu","group":2},
    {"name":"Brevet","group":2},
    {"name":"Chenildieu","group":2},
    {"name":"Cochepaille","group":2},
    {"name":"Pontmercy","group":4},
    {"name":"Boulatruelle","group":6},
    {"name":"Eponine","group":4},
    {"name":"Anzelma","group":4},
    {"name":"Woman2","group":5},
    {"name":"MotherInnocent","group":0},
    {"name":"Gribier","group":0},
    {"name":"Jondrette","group":7},
    {"name":"Mme.Burgon","group":7},
    {"name":"Gavroche","group":8},
    {"name":"Gillenormand","group":5},
    {"name":"Magnon","group":5},
    {"name":"Mlle.Gillenormand","group":5},
    {"name":"Mme.Pontmercy","group":5},
    {"name":"Mlle.Vaubois","group":5},
    {"name":"Lt.Gillenormand","group":5},
    {"name":"Marius","group":8},
    {"name":"BaronessT","group":5},
    {"name":"Mabeuf","group":8},
    {"name":"Enjolras","group":8},
    {"name":"Combeferre","group":8},
    {"name":"Prouvaire","group":8},
    {"name":"Feuilly","group":8},
    {"name":"Courfeyrac","group":8},
    {"name":"Bahorel","group":8},
    {"name":"Bossuet","group":8},
    {"name":"Joly","group":8},
    {"name":"Grantaire","group":8},
    {"name":"MotherPlutarch","group":9},
    {"name":"Gueulemer","group":4},
    {"name":"Babet","group":4},
    {"name":"Claquesous","group":4},
    {"name":"Montparnasse","group":4},
    {"name":"Toussaint","group":5},
    {"name":"Child1","group":10},
    {"name":"Child2","group":10},
    {"name":"Brujon","group":4},
    {"name":"Mme.Hucheloup","group":8}
  ],
  "links":[
    {"source":1,"target":0,"value":1},
    {"source":2,"target":0,"value":8},
    {"source":3,"target":0,"value":10},
    {"source":3,"target":2,"value":6},
    {"source":4,"target":0,"value":1},
    {"source":5,"target":0,"value":1},
    {"source":6,"target":0,"value":1},
    {"source":7,"target":0,"value":1},
    {"source":8,"target":0,"value":2},
    {"source":9,"target":0,"value":1},
    {"source":11,"target":10,"value":1},
    {"source":11,"target":3,"value":3},
    {"source":11,"target":2,"value":3},
    {"source":11,"target":0,"value":5},
    {"source":12,"target":11,"value":1},
    {"source":13,"target":11,"value":1},
    {"source":14,"target":11,"value":1},
    {"source":15,"target":11,"value":1},
    {"source":17,"target":16,"value":4},
    {"source":18,"target":16,"value":4},
    {"source":18,"target":17,"value":4},
    {"source":19,"target":16,"value":4},
    {"source":19,"target":17,"value":4},
    {"source":19,"target":18,"value":4},
    {"source":20,"target":16,"value":3},
    {"source":20,"target":17,"value":3},
    {"source":20,"target":18,"value":3},
    {"source":20,"target":19,"value":4},
    {"source":21,"target":16,"value":3},
    {"source":21,"target":17,"value":3},
    {"source":21,"target":18,"value":3},
    {"source":21,"target":19,"value":3},
    {"source":21,"target":20,"value":5},
    {"source":22,"target":16,"value":3},
    {"source":22,"target":17,"value":3},
    {"source":22,"target":18,"value":3},
    {"source":22,"target":19,"value":3},
    {"source":22,"target":20,"value":4},
    {"source":22,"target":21,"value":4},
    {"source":23,"target":16,"value":3},
    {"source":23,"target":17,"value":3},
    {"source":23,"target":18,"value":3},
    {"source":23,"target":19,"value":3},
    {"source":23,"target":20,"value":4},
    {"source":23,"target":21,"value":4},
    {"source":23,"target":22,"value":4},
    {"source":23,"target":12,"value":2},
    {"source":23,"target":11,"value":9},
    {"source":24,"target":23,"value":2},
    {"source":24,"target":11,"value":7},
    {"source":25,"target":24,"value":13},
    {"source":25,"target":23,"value":1},
    {"source":25,"target":11,"value":12},
    {"source":26,"target":24,"value":4},
    {"source":26,"target":11,"value":31},
    {"source":26,"target":16,"value":1},
    {"source":26,"target":25,"value":1},
    {"source":27,"target":11,"value":17},
    {"source":27,"target":23,"value":5},
    {"source":27,"target":25,"value":5},
    {"source":27,"target":24,"value":1},
    {"source":27,"target":26,"value":1},
    {"source":28,"target":11,"value":8},
    {"source":28,"target":27,"value":1},
    {"source":29,"target":23,"value":1},
    {"source":29,"target":27,"value":1},
    {"source":29,"target":11,"value":2},
    {"source":30,"target":23,"value":1},
    {"source":31,"target":30,"value":2},
    {"source":31,"target":11,"value":3},
    {"source":31,"target":23,"value":2},
    {"source":31,"target":27,"value":1},
    {"source":32,"target":11,"value":1},
    {"source":33,"target":11,"value":2},
    {"source":33,"target":27,"value":1},
    {"source":34,"target":11,"value":3},
    {"source":34,"target":29,"value":2},
    {"source":35,"target":11,"value":3},
    {"source":35,"target":34,"value":3},
    {"source":35,"target":29,"value":2},
    {"source":36,"target":34,"value":2},
    {"source":36,"target":35,"value":2},
    {"source":36,"target":11,"value":2},
    {"source":36,"target":29,"value":1},
    {"source":37,"target":34,"value":2},
    {"source":37,"target":35,"value":2},
    {"source":37,"target":36,"value":2},
    {"source":37,"target":11,"value":2},
    {"source":37,"target":29,"value":1},
    {"source":38,"target":34,"value":2},
    {"source":38,"target":35,"value":2},
    {"source":38,"target":36,"value":2},
    {"source":38,"target":37,"value":2},
    {"source":38,"target":11,"value":2},
    {"source":38,"target":29,"value":1},
    {"source":39,"target":25,"value":1},
    {"source":40,"target":25,"value":1},
    {"source":41,"target":24,"value":2},
    {"source":41,"target":25,"value":3},
    {"source":42,"target":41,"value":2},
    {"source":42,"target":25,"value":2},
    {"source":42,"target":24,"value":1},
    {"source":43,"target":11,"value":3},
    {"source":43,"target":26,"value":1},
    {"source":43,"target":27,"value":1},
    {"source":44,"target":28,"value":3},
    {"source":44,"target":11,"value":1},
    {"source":45,"target":28,"value":2},
    {"source":47,"target":46,"value":1},
    {"source":48,"target":47,"value":2},
    {"source":48,"target":25,"value":1},
    {"source":48,"target":27,"value":1},
    {"source":48,"target":11,"value":1},
    {"source":49,"target":26,"value":3},
    {"source":49,"target":11,"value":2},
    {"source":50,"target":49,"value":1},
    {"source":50,"target":24,"value":1},
    {"source":51,"target":49,"value":9},
    {"source":51,"target":26,"value":2},
    {"source":51,"target":11,"value":2},
    {"source":52,"target":51,"value":1},
    {"source":52,"target":39,"value":1},
    {"source":53,"target":51,"value":1},
    {"source":54,"target":51,"value":2},
    {"source":54,"target":49,"value":1},
    {"source":54,"target":26,"value":1},
    {"source":55,"target":51,"value":6},
    {"source":55,"target":49,"value":12},
    {"source":55,"target":39,"value":1},
    {"source":55,"target":54,"value":1},
    {"source":55,"target":26,"value":21},
    {"source":55,"target":11,"value":19},
    {"source":55,"target":16,"value":1},
    {"source":55,"target":25,"value":2},
    {"source":55,"target":41,"value":5},
    {"source":55,"target":48,"value":4},
    {"source":56,"target":49,"value":1},
    {"source":56,"target":55,"value":1},
    {"source":57,"target":55,"value":1},
    {"source":57,"target":41,"value":1},
    {"source":57,"target":48,"value":1},
    {"source":58,"target":55,"value":7},
    {"source":58,"target":48,"value":7},
    {"source":58,"target":27,"value":6},
    {"source":58,"target":57,"value":1},
    {"source":58,"target":11,"value":4},
    {"source":59,"target":58,"value":15},
    {"source":59,"target":55,"value":5},
    {"source":59,"target":48,"value":6},
    {"source":59,"target":57,"value":2},
    {"source":60,"target":48,"value":1},
    {"source":60,"target":58,"value":4},
    {"source":60,"target":59,"value":2},
    {"source":61,"target":48,"value":2},
    {"source":61,"target":58,"value":6},
    {"source":61,"target":60,"value":2},
    {"source":61,"target":59,"value":5},
    {"source":61,"target":57,"value":1},
    {"source":61,"target":55,"value":1},
    {"source":62,"target":55,"value":9},
    {"source":62,"target":58,"value":17},
    {"source":62,"target":59,"value":13},
    {"source":62,"target":48,"value":7},
    {"source":62,"target":57,"value":2},
    {"source":62,"target":41,"value":1},
    {"source":62,"target":61,"value":6},
    {"source":62,"target":60,"value":3},
    {"source":63,"target":59,"value":5},
    {"source":63,"target":48,"value":5},
    {"source":63,"target":62,"value":6},
    {"source":63,"target":57,"value":2},
    {"source":63,"target":58,"value":4},
    {"source":63,"target":61,"value":3},
    {"source":63,"target":60,"value":2},
    {"source":63,"target":55,"value":1},
    {"source":64,"target":55,"value":5},
    {"source":64,"target":62,"value":12},
    {"source":64,"target":48,"value":5},
    {"source":64,"target":63,"value":4},
    {"source":64,"target":58,"value":10},
    {"source":64,"target":61,"value":6},
    {"source":64,"target":60,"value":2},
    {"source":64,"target":59,"value":9},
    {"source":64,"target":57,"value":1},
    {"source":64,"target":11,"value":1},
    {"source":65,"target":63,"value":5},
    {"source":65,"target":64,"value":7},
    {"source":65,"target":48,"value":3},
    {"source":65,"target":62,"value":5},
    {"source":65,"target":58,"value":5},
    {"source":65,"target":61,"value":5},
    {"source":65,"target":60,"value":2},
    {"source":65,"target":59,"value":5},
    {"source":65,"target":57,"value":1},
    {"source":65,"target":55,"value":2},
    {"source":66,"target":64,"value":3},
    {"source":66,"target":58,"value":3},
    {"source":66,"target":59,"value":1},
    {"source":66,"target":62,"value":2},
    {"source":66,"target":65,"value":2},
    {"source":66,"target":48,"value":1},
    {"source":66,"target":63,"value":1},
    {"source":66,"target":61,"value":1},
    {"source":66,"target":60,"value":1},
    {"source":67,"target":57,"value":3},
    {"source":68,"target":25,"value":5},
    {"source":68,"target":11,"value":1},
    {"source":68,"target":24,"value":1},
    {"source":68,"target":27,"value":1},
    {"source":68,"target":48,"value":1},
    {"source":68,"target":41,"value":1},
    {"source":69,"target":25,"value":6},
    {"source":69,"target":68,"value":6},
    {"source":69,"target":11,"value":1},
    {"source":69,"target":24,"value":1},
    {"source":69,"target":27,"value":2},
    {"source":69,"target":48,"value":1},
    {"source":69,"target":41,"value":1},
    {"source":70,"target":25,"value":4},
    {"source":70,"target":69,"value":4},
    {"source":70,"target":68,"value":4},
    {"source":70,"target":11,"value":1},
    {"source":70,"target":24,"value":1},
    {"source":70,"target":27,"value":1},
    {"source":70,"target":41,"value":1},
    {"source":70,"target":58,"value":1},
    {"source":71,"target":27,"value":1},
    {"source":71,"target":69,"value":2},
    {"source":71,"target":68,"value":2},
    {"source":71,"target":70,"value":2},
    {"source":71,"target":11,"value":1},
    {"source":71,"target":48,"value":1},
    {"source":71,"target":41,"value":1},
    {"source":71,"target":25,"value":1},
    {"source":72,"target":26,"value":2},
    {"source":72,"target":27,"value":1},
    {"source":72,"target":11,"value":1},
    {"source":73,"target":48,"value":2},
    {"source":74,"target":48,"value":2},
    {"source":74,"target":73,"value":3},
    {"source":75,"target":69,"value":3},
    {"source":75,"target":68,"value":3},
    {"source":75,"target":25,"value":3},
    {"source":75,"target":48,"value":1},
    {"source":75,"target":41,"value":1},
    {"source":75,"target":70,"value":1},
    {"source":75,"target":71,"value":1},
    {"source":76,"target":64,"value":1},
    {"source":76,"target":65,"value":1},
    {"source":76,"target":66,"value":1},
    {"source":76,"target":63,"value":1},
    {"source":76,"target":62,"value":1},
    {"source":76,"target":48,"value":1},
    {"source":76,"target":58,"value":1}
  ]
}

*/