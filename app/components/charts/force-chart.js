/* global _F */
/* global d3 */

(function(root) {
  'use strict';

  var forceGraph = function() {
    var width = 500, height = 500;
    var margin = { top: 10, right: 370, bottom: 240, left: 370};
    //var padding = { top: 60, right: 100, bottom: 60, left: 60};

    function chart(selection) {
      selection.each(chart.draw);
    }

    // elements
    var nodes, links;

    // Private objects
    var zoom = d3.behavior.zoom();

    var groups = ['gene.ligand','gene.receptor','sample'];

    // Scales
    var ncolor = d3.scale.ordinal().domain(['ligand','both','receptor']).range(['#ed1940','yellow','#3349ff']); // ['#ed1940','#a650e2','#3349ff']
    var slog = d3.scale.log().range([2,9]).clamp(true);     // Maps value to normalized edge width
    var eopac = d3.scale.linear().range([0.2,0.8]).clamp(true);
    var rsize = d3.scale.linear().range([3, 12]).clamp(true);  // Maps value to size
    //var angle = d3.scale.ordinal().domain(groups).range([-Math.PI/4+Math.PI, Math.PI/4+Math.PI, 0]);  // maps type to angle
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
    var _class = _F('class');
    var _fixed = _F('fixed');
    var _edgeFixed = _F('source',_fixed).and(_F('target',_fixed));
    var _hover = _F('hover');

    var linkName = function(d) { return [d.source.name, d.name, d.target.name].join(':'); };
    var nodeName = function(d) {  // TODO: not this
      return d.name.split('.')[0];
    };

    // Range accesors
    //var _angle = _F('group', angle); //function(d) { return angle(d.type); };
    //var _radius = function(d) { return radius(_y[_group(d)](d._i)); };
    var _ncolor = _F('class', ncolor); //function(d) {  return ncolor(d.class); };
    var _slog = _F(_value, slog);

    var dispatch = d3.dispatch('hover','selectionChanged');

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

      container.on('click', function() {
        if (d3.event.defaultPrevented) {return;}
        d3.event.stopPropagation();

        graph.nodes.forEach(function(d) {
          d.fixed = false;
        });

        updateClasses();
        dispatch.selectionChanged();
      });

      // Ranges
      var _e = d3.extent(graph._edges, _value);  // Edge values
      slog.domain(_e);
      eopac.domain(_e);

      var _n = d3.extent(graph._nodes, _value);  // Node values
      rsize.domain(_n);

      /* var nodesByType = d3.nest()   // Nest nodes by type
        .key(_group)
        .sortKeys(d3.ascending)
        .entries(graph._nodes);

      nodesByType.forEach(function(type) { // Setup domain for position range
        _y[type.key].domain(d3.range(type.values.length));

        type.values.forEach(function(node,i) {
          node._i = i;
          //node.group = group;
        });
      }); */

      function tick() {


        links.attr('d', function(d) {

          var
              x1 = d.source.x,
              y1 = d.source.y,
              x2 = d.target.x,
              y2 = d.target.y,
              dx = x2 - x1,
              dy = y2 - y1;

          var dr = Math.sqrt(dx * dx + dy * dy),
              drx = dr,
              dry = dr,
              xRotation = 0, // degrees
              largeArc = 0, // 1 or 0
              sweep = 1; // 1 or 0

          // Self edge.
          if ( x1 === x1 && y1 === y2 ) {

            // Needs to be 1.
            largeArc = 1;

            // Change sweep to change orientation of loop.
            sweep = 0;

            var dcx = x1 - width/2;
            var dcy = y1 - height/2;
            var dcr = Math.sqrt(dcx * dcx + dcy * dcy);

            xRotation = Math.atan(dcy/dcx || 0)*180/Math.PI;

            drx = 30;
            dry = 20;

            x2 +=  dcy/dcr;
            y2 -=  dcx/dcr;

          } else {
            var _radius = rsize(d.target.value)+_slog(d)+5;
            var theta = Math.PI/6; //Math.atan(dy / dx || 0);

            var c = Math.cos(theta);
            var s = Math.sin(theta);

            x2 -= _radius * (dx/dr*c-dy/dr*s);
            y2 -= _radius * (dx/dr*s+dy/dr*c);
            //dx = x2-x1;
            //dy = y2-y1;

            //dr = drx = dry = Math.sqrt(dx * dx + dy * dy);
          }

          return 'M' + x1 + ',' + y1 + 'A' + drx + ',' + dry + ' ' + xRotation + ',' + largeArc + ',' + sweep + ' ' + x2 + ',' + y2;
        });

        nodes
          .attr('transform', function(d) {
            return 'translate(' + d.x + ',' + d.y + ')';
          });

      }

      var force = d3.layout.force()  // todo: move
        .charge(-2000)
        .linkDistance(function linkDistance(d) {
          return d.type === 'pair' ? 1 : 400;
        })
        .size([width, height])
        .on('tick', tick);

      force
        .nodes(graph._nodes)
        .links(graph._edges)
        .start();

      var drag = force.drag()
        .on('dragstart', function() {
          d3.event.sourceEvent.stopPropagation();
        });

      // MARKERS
      container.selectAll('defs').remove();

      container
        .append('defs')
          .append('svg:marker')
              .attr('class', 'Triangle')
              .attr('viewBox', '0 -5 10 10')
              .attr('refY', 0)
              .attr('refX', 2.5)
              .attr('markerWidth', 2.5)
              .attr('markerHeight', 2.5)
              .attr('stroke-width', 1)
              .attr('markerUnits','strokeWidth')
              //.style('stroke', function(d) { return color(d.value); })
              //.style('fill', function(d) { return color(d.value); })
              .attr('orient', 'auto')
              .attr('id', 'arrow')
              .append('svg:path')
                .attr('d', 'M0,-5L10,0L0,5');

      var g = container.selectAll('.networkGraph').data([1]);

      g.enter()
        .append('g')
        .attr('class', 'networkGraph')
        .each(function() { // Only called once
          container.call(zoom.on('zoom', rescale));
          zoom.translate([0,margin.top]);
          zoom.event(container);
        });

      // rescale g
      function rescale() {
        var trans=d3.event.translate;
        var scale=d3.event.scale;

        g.attr('transform',
            'translate(' + trans + ') scale(' + scale + ')');
      }

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

        var tgt = d.target;
        var src = d.source;

        d.hover = tgt.hover = src.hover = true;

        if (tgt.type !== 'node') {
          classNeighbors(tgt, 3, 'hover');
        }

        if (src.type !== 'node') {
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
        //console.log('updateClasses');

        nodes
          .classed('hover', _hover)
          .classed('fixed', _fixed);

        links
          .classed('hover', _hover)
          .classed('fixed', _edgeFixed)
          //.attr('marker-end', function(d,i) { return (d.source !== d.target) ? 'url("#arrow-'+i+'")' : ''; })
          ;
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

      links.enter().append('path')
        .classed('link', true)
        .style({
          fill: 'none',
          stroke: '#666',
          'stroke-width': '1.5px',
        })
        .style('opacity', function(d) { return eopac(d.value); })
        .on('mouseover.highlight',mouseoverEdgeHighlight)
        .on('mouseout.highlight',mouseoutHighlight)
        //.on('mouseover', tooltipShow)
        //.on('mouseout', tooltipHide)
        .attr('marker-end', function(d) { return (d.source !== d.target) ? 'url("#arrow")' : ''; })
        ;

      links
        //.attr('id', function(d,i) { return 'link-'+i; })
        .style('stroke-width', _slog)
        //.attr('d', hiveLink)
        //.attr('marker-end', function(d,i) { return (d.source !== d.target) ? 'url(#arrow-'+i+')' : 'none'; })
        ;

      links.exit().remove();

      // NODES
      var nodesLayer = g.selectAll('g.nodes').data([graph._nodes]);

      nodesLayer.enter()
        .append('g')
          .classed('nodes', true);

      // Select
      //nodesLayer.selectAll('.node').remove();  // TODO: not this, hack to ensure nodes are stacked

      nodes = nodesLayer.selectAll('.node').data(_F(), _name);

      function nodeClick(d) {
        if (d3.event.defaultPrevented) {return;}
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
          .style({fill: '#ccc','fill-opacity': 1,stroke: '#333','stroke-width': '1px'})
          .on('click', nodeClick)
          .on('dblclick', function(d) {
            //if (d3.event.defaultPrevented) {return;}

            //console.log(d3.event);
            d3.event.stopPropagation();

            var edges = d3.event.shiftKey ? graph.inEdgesIndex[d.id] : graph.outEdgesIndex[d.id];
            //var alt = d3.event.altKey;

            if (d3.event.altKey) {
              for (var i = edges.length; i > -1; i--) {
                if (edges[i].type === 'sample-sample') {
                  var node = d3.event.shiftKey ? edges[i].source : edges[i].target;
                  if (node.ticked) {
                    node.ticked = false;
                    break;
                  }
                }
              }
            } else {
              for (var j = 0; j < edges.length; j++) {
                if (edges[j].type === 'sample-sample') {
                  var _node = d3.event.shiftKey ? edges[j].source : edges[j].target;
                  if (!_node.ticked) {
                    _node.ticked = true;
                    break;
                  }
                }
              }
            }

            updateClasses();
            dispatch.selectionChanged(d);

          })
          .on('mouseover.highlight', mouseoverNodeHighlight) //function() { nodeClassed.call(this, 'hover', true); })
          .on('mouseout.highlight', mouseoutHighlight) //function() { nodeClassed.call(this, 'hover', false); })
          //.on('mouseover', tooltipShow)
          //.on('mouseout', tooltipHide)
          .call(drag)
          ;

      nodesEnter
        .append('rect')
          //.on('dblclick', tooltip.toggle)
          //.on('mouseout', tooltip.hide)
          ;

      nodesEnter
        .append('text')
          .style({'stroke': 'none','fill': '#333','stroke-width': '1px','font-size': '10px'})
          .attr('text-anchor', 'start')
          .attr('dy', 3)
          .attr('dx', 15)
          //.on('mouseover', nodeLabelTooltip.show)
          //.on('mouseout', nodeLabelTooltip.hide)
          ;

      nodes
        .attr('id', function(d) { return 'node-'+d._index; })
        .classed('fixed', _fixed);

      function _r(d) { return (d.type === 'gene') ? 5 : rsize(d.value); }
      function __r(d) { return -_r(d); }
      function _2r(d) { return 2*_r(d); }
      function rx(d) { return (d.type === 'gene') ? 0 : _r(d); }

      nodes
        .select('rect')
          .attr('x',__r)
          .attr('y',__r)
          .attr('width',_2r)
          .attr('height',_2r)
          .attr('rx',rx)
          .attr('ry',rx)
          .style('fill',_ncolor);

      nodes
        .select('text')
          .text(nodeName)
          .attr('dy',function(d) { return (d.type === 'gene') ? 0 : 3; })
          .attr('dx',function(d) { return (d.type === 'gene') ? 10 : 15; })
          ;

      nodes.exit().remove();

      function legendHighlight(d) {

        if (d === null) {
          container.classed('hover', false);
          nodes.classed('hover', false);
          return;
        }

        var h = _group.eq(d.group).and(_class.eq(d.class));

        nodes
          .classed('hover', h);

        container.classed('hover', true);

      }

      var _l = [
        { name: 'Ligand expressing sample', class: 'ligand', group: 'sample' },
        { name: 'Receptor expressing sample', class: 'receptor', group: 'sample' },
        { name: 'Ligand and receptor expressing sample', class: 'both', group: 'sample' }//,
        //{ name: 'Ligand gene', class: 'ligand', group: 'gene.ligand' },
        //{ name: 'Receptor gene', class: 'receptor', group: 'gene.receptor' }
      ];

      var legend = root.models.legend()
        .colors(_ncolor)
        .on('mouseover', _F(null, legendHighlight))
        .on('mouseout', function() { legendHighlight(null); });

      container.selectAll('.caxis').remove();

      container.append('g')
        .attr('class', 'axis caxis')
        .attr('transform', 'translate('+(margin.left)+','+margin.top+')')
        .datum(_l)
        .call(legend);

      /* container.selectAll('.caxis').remove();  // TODO: not this

      var labels = container.selectAll('.caxis').data([_l]).enter().append('g')
        .attr('class', 'axis caxis')
        .attr('transform', 'translate('+(margin.left)+','+margin.top+')')
        .selectAll('.label').data(_F()).enter().append('g')
          .attr('class', 'label')
          .on('mouseover', _F(null, highlight)) //function(d) { highlight(d); })  //function(d) { highlight(d); }
          .on('mouseout', function() { highlight(null); })
          .attr('transform', function(d,i) { return 'translate(0,'+((i+1)*20)+')'; });

      var _rx = function rx(d) { return (d.name.match(/gene/)) ? 0 : 15; };

      labels.append('rect')
        .style({'stroke-width': '1px', 'stroke': 'rgb(51, 51, 51)'})
        .attr('width', 15)
        .attr('height', 15)
        .attr('rx',_rx)
        .attr('ry',_rx)
        .style('fill', _ncolor);

      labels.append('text')
        .style({'stroke': 'none','fill': '#333','stroke-width': '1px','font-size': '10px'})
        .attr('x', 20)
        .attr('dy', '1.2em')
        .text(_F('name')); */

    };

    d3.rebind(chart, dispatch, 'on');
    return chart;
  };

  root.charts.forceGraph = forceGraph;

})(window.lrd3);
