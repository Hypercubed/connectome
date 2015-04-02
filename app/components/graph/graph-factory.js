/* global _ */

(function() {
  'use strict';

  angular.module('lrSpaApp')
  
    .service('Graph', function($log, site) {

      var defaultSettings = {};

      //TODO:
      //  use better class contructor pattern?
      //  Expose data through methods? (getNode, getFilteredNodes, getNeighbors?)
      //  replace with sigma.js?

      return function Graph(settings) {

        settings = settings || defaultSettings;

        var graph = {};

        var defaultData = {
          nodes: [],                  // -> nodesArray
          edges: [],                  // -> edgesArray

          nodesIndex: {},
          edgesIndex: {},             // edgesIndex[nodeA.id][nodeB.id]

          inEdgesIndex: {},
          outEdgesIndex: {},

          // temp
          _nodes: [],                  // -> nodesArray
          _edges: [],                  // -> edgesArray
          _inEdgesIndex: {},
          _outEdgesIndex: {},

          edgeCount: 0,               // get rid?
          ligandExtent: [0,100000],   // get rid?
          receptorExtent: [0,100000], // get rid?

          selectedItems: []
        };

        graph.clear = function clear() {
          graph.data = defaultData;
        };

        graph.clear();

        graph.Node = function Node(id, name, type) {
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
        };

        graph.addNode = function addNode(node) {
          if (typeof node !== 'object' || arguments.length !== 1) {
            $log.error('addNode: Wrong arguments.');
          }

          //if (!node.ticked) { return; }

          var id = node.id;

          graph.data.nodes.push(node);
          graph.data.nodesIndex[id] = node;

          graph.data.edgesIndex[id] = {};

          graph.data.inEdgesIndex[id] = [];
          graph.data.outEdgesIndex[id] = [];
          graph.data._inEdgesIndex[id] = [];
          graph.data._outEdgesIndex[id] = [];
        };

        graph.Edge = function Edge(src,tgt,name) {
          name = name || src.name+'->'+tgt.name;
          return {
            source: src,
            target: tgt,
            value: 0,
            name: name,
            values: [0, 0]  // remove these
          };
        };

        graph.addEdge = function addEdge(edge) {
          if (arguments.length !== 1 || typeof edge !== 'object') {
            $log.error('addNode: Wrong arguments.');
          }

          edge.ticked = edge.source.ticked && edge.target.ticked;

          if (edge.ticked) {
            graph.data.edges.push(edge);
          }

          var src = edge.source.id;
          var tgt = edge.target.id;

          if (edge.source.ticked) {  // todo: push sorted
            graph.data.edgesIndex[src] = graph.data.edgesIndex[src] || {};
            graph.data.edgesIndex[src][tgt] = edge;

            graph.data.outEdgesIndex[src] = graph.data.outEdgesIndex[src] || [];
            graph.data.outEdgesIndex[src].push(edge);
            if (edge.ticked) {
              graph.data._outEdgesIndex[src].push(edge);
            }
          }

          if (edge.target.ticked) {
            graph.data.inEdgesIndex[tgt] = graph.data.inEdgesIndex[tgt] || [];
            graph.data.inEdgesIndex[tgt].push(edge);
            if (edge.ticked) {
              graph.data._inEdgesIndex[tgt].push(edge);
            }
          }

        };

        function __getDATA() {
          var _json = {

          };

          _json.nodes = graph.data._nodes.map(function(node, i) {

            var _n = {
              data: {
                id: i,
                name: node.name,
                type: node.type,
                class: node.class,
                value: String(node.value)
              },
              position: {
                x: node.x,
                y: node.y
              }
            };

            angular.extend(_n.data, node.meta);

            return _n;
          });

          _json.edges = graph.data._edges.map(function(edge, i) {
            return {
              data: {
                id: i,
                name: edge.name,
                interaction: edge.type,
                source: graph.data._nodes.indexOf(edge.source),
                target: graph.data._nodes.indexOf(edge.target),
                value: String(edge.value)
              }
            };
          });

          return _json;
        }

        graph.getJSON =  function _getJSON() {
          var _json = {
            'format_version' : '1.0',
            'generated_by' : [site.name,site.version].join('-'),
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
        };

        graph.getGML = function __getGML() {

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

        };

        return graph;

      };

    });

})();
