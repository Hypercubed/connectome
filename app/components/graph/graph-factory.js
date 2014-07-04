
(function() {
  'use strict';

  var app = angular.module('lrSpaApp');

  app
    .service('Graph', function($log) {

      var defaultSettings = {};

      //TODO:
      //  use better class contructor pattern?
      //  Expose data through methods?
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

        return graph;

      };

    });

})();
