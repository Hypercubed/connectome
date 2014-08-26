/* global d3 */
/* global _F */

(function(root) {
  'use strict';

  function degrees(radians) {
    return radians / Math.PI * 180-90;
  }

  var hiveGraph = function() {
    var width = 500, height = 500;
    var margin = { top: 10, right: 60, bottom: 240, left: 60};
    //var padding = { top: 60, right: 100, bottom: 60, left: 60};

    function chart(selection) {
      selection.each(chart.draw);
    }

    // elements
    var nodes, links;

    // Private objects
    var zoom = d3.behavior.zoom();

    // Scales
    var groups = ['gene.ligand','gene.receptor','sample'];
    var ncolor = d3.scale.ordinal()
      .domain(['ligand','both','receptor'])
      .range(['#ed1940','yellow','#3349ff']);
      //.range(['#ed1940','#a650e2','#9999ff']);
      //.range(['#ed1940','#a650e2','#3349ff']);
    var slog = d3.scale.log().range([2,9]).clamp(true);     // Maps value to normalized edge width
    var eopac = d3.scale.linear().range([0.2,0.8]).clamp(true);
    var rsize = d3.scale.linear().range([3, 12]).clamp(true);  // Maps value to size
    var angle = d3.scale.ordinal().domain(groups).range([-Math.PI/4+Math.PI, Math.PI/4+Math.PI, 0]);  // maps type to angle
    var radius = d3.scale.linear();  // maps position to radius

    var _y = {};  // maps index to position
    groups.forEach(function(d) {
      _y[d] = d3.scale.ordinal().rangePoints([0, 1]);
    });

    // Value accessors
    //var _type = _F('type');
    var _group = _F('group');
    var _value = _F('value');
    var _name = _F('name');
    var _id = _F('id');
    var _class = _F('class');
    var _fixed = _F('fixed');
    var _edgeFixed = _F('source',_fixed).and(_F('target',_fixed));
    var _hover = _F('hover');

    var linkName = function(d) { return [d.source.name, d.name, d.target.name].join(':'); };
    var nodeName = function(d) {  // TODO: not this
      return d.name.split('.')[0];
    };

    // Range accesors
    var _angle = _F('group', angle); //function(d) { return angle(d.type); };
    var _radius = function(d) {
      if (!_y[_group(d)]) { return 0; };
      
      return radius(_y[_group(d)](d._i));
    };
    var _ncolor = _F('class', ncolor); //function(d) {  return ncolor(d.class); };
    var _slog = _F(_value, slog);

    var dispatch = d3.dispatch('hover','selectionChanged','contextmenu');

    chart.draw = function draw(graph) {

      var container = d3.select(this);

      width = parseInt(container.style('width'));
      height = parseInt(container.style('height'));

      var size = Math.min(height, width)/(1+Math.cos(Math.PI/3))/1.5;
      radius.range([size/10, size]);

      chart.update = function() {
        updateClasses();
      };

      chart.container = container;

      container
        .attr('width', width)
        .attr('height', height)
        ;

      // Ranges
      var _e = d3.extent(graph._edges, _value);  // Edge values
      slog.domain(_e);
      eopac.domain(_e);

      var _n = d3.extent(graph._nodes, _value);  // Node values
      rsize.domain(_n);

      var nodesByType = d3.nest()   // Nest nodes by type
        .key(_group)
        .sortKeys(d3.ascending)
        .entries(graph._nodes);

      nodesByType.forEach(function(type) { // Setup domain for position range
        if (_y[type.key]) {
          _y[type.key].domain(d3.range(type.values.length));

          type.values.forEach(function(node,i) {
            node._i = i;
          });
        }
      });

      function _labelAngle(d) {
        var a = -_angle(d)+Math.PI;
        a = (a+2*Math.PI) % (2*Math.PI);
        if (a > Math.PI/2 && a < 3*Math.PI/2) {return a;}
        return a+Math.PI/2;
      }

      var hiveLink = d3.hive.link()
        .angle(_angle)
        .radius(_radius);

      container.selectAll('defs').remove();

      var markers = container
        .append('defs')
        .selectAll('marker').data(graph._edges).enter()
        .append('svg:marker')
          .attr({
            class:           'Triangle',
            viewBox:         '0 -5 10 10',
            refY:            0,
            refX:            20,
            markerWidth:     5,
            markerHeight:    5,
            'stroke-width':  1,
            markerUnits:     'strokeWidth',
            orient:          'auto',
            id:              function(d,i) { return 'arrow-'+i; }
          });

      markers.append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5');

      var g = container.selectAll('.hiveGraph').data([1]);

      g.enter()
        .append('g')
        .attr('class', 'hiveGraph')
        .each(function() { // Only called once
          container.call(zoom.on('zoom', rescale));
          zoom.translate([width/2,height/2+(height/2-size)]);
          zoom.event(container);
        });

      container.on('click', function() {
        if (d3.event.defaultPrevented) {return;}
        d3.event.stopPropagation();

        graph.nodes.forEach(function(d) {
          d.fixed = false;
        });

        updateClasses();
        dispatch.selectionChanged();
      });

      // rescale g
      function rescale() {
        var trans=d3.event.translate;
        var scale=d3.event.scale;

        g.attr('transform',
            'translate(' + trans + ') scale(' + scale + ')');
      }

      //g.selectAll('.axis').remove();

      var axes = g.selectAll('.axis')
        .data(groups);

      axes.enter().append('line')
        .style({
          stroke: '#000',
          'stroke-width': '1.5px'
        });

      axes
        .attr({
          class:     'axis',
          transform: function(d) { return 'rotate(' + degrees(angle(d)) + ')'; },
          x1:        radius.range()[0],
          x2:        radius.range()[1]
        });

      //function sign(x) { return x > 0 ? 1 : x < 0 ? -1 : 0; }

      function classNeighbors(node, direction, key, value) {
        if (arguments.length < 4) { value = true; }

        var _tgt = (direction <= 0) ? 'source' : 'target';
        //var _dir = (direction <= 0) ? 'lin' : 'lout';

        var edges = (direction <= 0) ? graph._inEdgesIndex[node.id] : graph._outEdgesIndex[node.id];

        edges.forEach(function(d) {
          if(d) {
            d[key] = value;         // class edge

            var t = d[_tgt];
            t[key] = value;   // class node

            if (t.type === 'gene') {
              classNeighbors(t, direction, key, value);
            }

          }
        });
      }

      function mouseoverEdgeHighlight(d) {

        //var edge = d3.select(this);

        var tgt = d.target;
        var src = d.source;

        d.hover = tgt.hover = src.hover = true;

        if (tgt.type == 'gene') {
          classNeighbors(tgt, 3, 'hover');
        }

        if (src.type == 'gene') {
          classNeighbors(src, -3, 'hover');
        }

        chart.container.classed('hover',true);
        updateClasses();

        dispatch.hover(d);
      }

      function mouseoverNodeHighlight(d) {

        //var node = d3.select(this);

        d.hover = true;

        classNeighbors(d, 3, 'hover');
        classNeighbors(d, -3, 'hover');

        chart.container.classed('hover',true);
        updateClasses();

        dispatch.hover(d);
      }

      function updateClasses() {
        nodes
          .classed('hover', _hover)
          .classed('fixed', _fixed);

        links
          .classed('hover', _hover)
          .classed('fixed', _edgeFixed);
      }

      var _hoff = function(d) {d.hover = false; };
      function mouseoutHighlight() {
        chart.container.classed('hover',false);

        nodes.each(_hoff);
        links.each(_hoff);

        updateClasses();
        dispatch.hover(null);
      }

      // LINKS
      var gLinks = g.selectAll('g.links').data([graph._edges]);

      gLinks.enter()
          .append('g')
            .classed('links', true);

      links = gLinks.selectAll('.link')
          .data(_F(), linkName);

      links.enter().append('svg:path')
        .classed('link', true)
        .style({
          fill: 'none',
          stroke: '#666',
          'stroke-width': '1.5px',
        })
        .on('mouseover.highlight',mouseoverEdgeHighlight)
        .on('mouseout.highlight',mouseoutHighlight)
        //.on('mouseover', tooltipShow)
        //.on('mouseout', tooltipHide)
        ;

      links
        .attr({
          id:           function(d) { return 'link-'+d._index; },
          d:            hiveLink,
          'marker-end': function(d,i) { return d.type === 'pair' ? 'url(#arrow-'+i+')' : ''; }
        })
        .style({
          'stroke-width': _slog,
          opacity:        function(d) { return eopac(d.value); }
        })
        ;

      links.exit().remove();

      links.each(function(d, i) {
        if (d.type !== 'pair') {return;}

        var def = d3.select(markers[0][i]);
        var dy = def.attr('refX');

        var l = this.getTotalLength();
        var p0 = this.getPointAtLength(l);
        var pm1 = this.getPointAtLength(l-dy);

        var a = Math.atan((pm1.y-p0.y)/(pm1.x-p0.x));

        def
          .attr('orient', degrees(a-Math.PI/2));
      });

      //console.log(graph.edges);

      // NODES
      var nodesLayer = g.selectAll('g.nodes').data([graph._nodes]);

      nodesLayer.enter()
        .append('g')
          .classed('nodes', true);

      // Select

      nodesLayer.selectAll('.node').remove();  // TODO: not this, hack to ensure nodes are stacked

      nodes = nodesLayer.selectAll('.node').data(_F(), _id);

      function nodeClick(d) {
        d3.event.stopPropagation();

        var p = d.fixed;

        if (d3.event.altKey) {                                // remove
          d.ticked = (d.ticked) ? false : true;
        } else if (d3.event.ctrlKey && !d3.event.shiftKey) {                        // add to selection
          d.fixed = (d.fixed) ? false : true;
        } else if (d3.event.shiftKey) {                       // add all to selection
          graph.nodes.forEach(function(d) {
            d.fixed = (d.hover) ? !p : (!d3.event.ctrlKey) ? false : d.fixed;
          });
        } else {                                              // change selection
          graph.nodes.forEach(function(d) {
            d.fixed = false;
          });
          d.fixed = (p) ? false : true;
        }

        updateClasses(); //function(d) { return d.source.fixed && d.target.fixed; });
        dispatch.selectionChanged(d);
      }

      // Create
      var nodesEnter = nodes.enter().append('g')
          .classed('node', true)
          .style({
            fill: '#ccc',
            'fill-opacity': 1,
            stroke: '#333',
            'stroke-width': '1px'
          })
          .on('click', nodeClick)
          .on('dblclick', function(d) {
            //if (d3.event.defaultPrevented) {return;}

            //console.log(d3.event);
            d3.event.stopPropagation();

            var outEdges = graph.outEdgesIndex[d.id];

            for (var i = 0; i < outEdges.length; i++) {
              if (!outEdges[i].target.ticked) {
                //console.log(outEdges[i].target);
                outEdges[i].target.ticked = true;
                break;
              }
            }

            updateClasses();
            dispatch.selectionChanged(d);

            //graph.outEdgesIndex[d.id].forEach(function(edge) {

            //});

            /* if (d3.event.altKey || d3.event.ctrlKey) {
              d3.event.stopPropagation();
              if (d3.event.altKey) {
                d.ticked = (d.ticked) ? false : true;
              } else if (d3.event.ctrlKey) {
                d.fixed = (d.fixed) ? false : true;
              }

              updateClasses(); //function(d) { return d.source.fixed && d.target.fixed; });
              dispatch.selectionChanged(d);
            } */

          })
          .on('contextmenu', function(d) {
            d3.event.preventDefault();
            dispatch.contextmenu(d);
          })
          .on('mouseover.highlight', mouseoverNodeHighlight) //function() { nodeClassed.call(this, 'hover', true); })
          .on('mouseout.highlight', mouseoutHighlight) //function() { nodeClassed.call(this, 'hover', false); })
          //.on('mouseover', tooltipShow)
          //.on('mouseout', tooltipHide)
          ;

      nodesEnter
        .append('rect')
          //.on('dblclick', tooltip.toggle)
          //.on('mouseout', tooltip.hide)
          ;

      nodesEnter
        .append('text')
          .style({
            stroke:         'none',
            fill:           '#333',
            'stroke-width': '1px',
            'font-size':    '10px'
          })
          .attr({
            'text-anchor': 'start',
            'dy':          3,
            'dx':          15
          });

      nodes
        .attr('id', function(d) { return 'node-'+d._index; })
        .classed('fixed', _fixed)
        .attr('transform', function(d) {
          return 'rotate( '+degrees(_angle(d))+' ) translate(' + _radius(d) + ') rotate( '+degrees(_labelAngle(d))+' )';
        });

      nodes.each(function(d) {  // Store the x-y position for output
        var b = this.getBoundingClientRect();
        d.x = b.left;
        d.y = b.top;
      });

      function _r(d) { return (d.type === 'gene') ? 5 : rsize(d.value); }
      function __r(d) { return -_r(d); }
      function _2r(d) { return 2*_r(d); }
      function rx(d) { return (d.type === 'gene') ? 0 : _r(d); }

      nodes
        .select('rect')
          .attr({
            x:      __r,
            y:      __r,
            width:  _2r,
            height: _2r,
            rx:     rx,
            ry:     rx,
          })
          .style('fill',_ncolor);

      nodes
        .select('text')
          .text(nodeName)
          .attr({
            dy: function(d) { return (d.type === 'gene') ? 0 : 3; },
            dx: function(d) { return (d.type === 'gene') ? 10 : 15; }
          });

      nodes.exit().remove();

      function legendHighlight(d) {

        if (d === null) {
          container.classed('hover', false);
          nodes.style('opacity', 1).classed('hover', false);
          return;
        }

        var h = _group.eq(d.group).and(_class.eq(d.class));
        //function o(n) { return h(n) ? 1 : 0.2; };

        nodes
          //.style('opacity', o)
          .classed('hover', h);

        container.classed('hover', true);

      }

      var legend = root.models.legend()
        .colors(_ncolor)
        .on('mouseover', _F(null, legendHighlight))
        .on('mouseout', function() { legendHighlight(null); });

      var _l = [
        { name: 'Ligand expressing sample', class: 'ligand', group: 'sample' },
        { name: 'Receptor expressing sample', class: 'receptor', group: 'sample' },
        { name: 'Ligand and receptor expressing sample', class: 'both', group: 'sample' },
        { name: 'Ligand gene', class: 'ligand', group: 'gene.ligand' },
        { name: 'Receptor gene', class: 'receptor', group: 'gene.receptor' }
      ];

      container.selectAll('.caxis').remove();  // TODO: not this

      container.append('g')
        .attr({
          class:     'axis caxis',
          transform: 'translate('+(margin.left)+','+margin.top+')'
        })
        .datum(_l)
        .call(legend);

    };

    d3.rebind(chart, dispatch, 'on');
    return chart;
  };

  root.charts.hiveGraph = hiveGraph;

})(window.lrd3);
