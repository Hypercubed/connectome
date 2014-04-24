
(function(d3) {
  'use strict';

  // Helpers
  //var _I = function(d, i) { return i; };
  var _D = function(d) { return d; };
  var _F = function(n) { return function(d) { return d[n]; }; };
  //var _AF = function(n) { return function(d) { return [d[n]]; }; };

  function degrees(radians) {
    return radians / Math.PI * 180-90;
  }

  var treeGraph = function() {

    //console.log('Tree graph');

    // elements
    var nodes, links;

    // private
    var width = 500,
        height = 500;

    // Private objects
    var zoom = d3.behavior.zoom();

    var groups = ['node.ligand','gene','node.receptor'];

    // Scales
    var ncolor = d3.scale.ordinal().domain(groups).range(['#00cc66','#cc66cc','#99ccff']);
      //  Receptor only, Very light blue
      //  Receptor only, Very light blue
      //  Ligand only, lime green

    var slog = d3.scale.log().range([2,9]).clamp(true);     // Maps value to normalized edge width
    var rsize = d3.scale.linear().range([3, 12]).clamp(true);  // Maps value to size
    var angle = d3.scale.ordinal().domain(groups).range([4 * Math.PI/3, 0, 2 * Math.PI/3]);  // maps type to angle
    var radius = d3.scale.linear();  // maps position to radius

    var _y = {};  // maps index to position
    groups.forEach(function(d) {
      _y[d] = d3.scale.ordinal().rangePoints([0, 1]);
    });

    // Accessors
    function value(d) { return d.value; }
    function linkName(d) { return d.source.name + ':' + d.name + ':' + d.target.name; }
    function _ncolor(d) {  return ncolor(d.type); }



    // Tooltips
    var nodeTooltip = chart.nodeTooltip = d3.tip().attr('class', 'd3-tip node').html(_F('name'));
    var linkTooltip = chart.linkTooltip = d3.tip().attr('class', 'd3-tip link').html(_F('name'));

    nodeTooltip.offset(function() {
      return [-this.getBBox().height / 2, -rsize(value(this.__data__))];
    });

    function nodeClassed(name, value) {  // TODO: imporve this

      if (arguments.length < 2) {value = true;}
      name = name || 'active';

      chart.container.classed(name,value);

      var node = d3.select(this);
      var data = this.__data__;

      node.classed(name, value);
      data[name] = value;

      links[0].forEach(function(d) {
        var link = d3.select(d);
        var index = d.__data__.index;

        var found = data.lout.indexOf(index) > -1 ||
                    data.lin.indexOf(index) > -1;

        if (found) {
          link.classed(name, value);
        }

      });
      
    }

    function chart(selection) {
      selection.each(chart.draw);
    }

    chart.draw = function draw(graph) {

      var container = d3.select(this);

      width = parseInt(container.style('width'));
      height = parseInt(container.style('height'));

      var size = Math.min(height, width)/(1+Math.cos(Math.PI/3))/1.5;
      radius.range([size/10, size]);

      chart.update = function() { container.transition().call(chart); };
      chart.container = container;

      container
        .attr('width', width)
        .attr('height', height)
        .call(linkTooltip)
        .call(nodeTooltip);

      // Ranges
      var _e = d3.extent(graph.edges, _F('value'));  // Edge values
      slog.domain(_e);

      var _n = d3.extent(graph.nodes, _F('value'));  // Node values
      rsize.domain(_n);

      var nodesByType = d3.nest()   // Nest nodes by type
        .key(_F('type'))
        .sortKeys(d3.ascending)
        .entries(graph.nodes);

      nodesByType.forEach(function(type) { // Setup domain for position range
        var group = groups.indexOf(type.key);  // TODO: eliminte y and node.group?
        _y[type.key].domain(d3.range(type.values.length));

        type.values.forEach(function(node,i) {
          node.i = i;
          //node.group = group;
        });
      });

      // Range accesors
      var _angle = function(d) { return angle(d.type); };
      var _radius = function(d) { return radius(_y[d.type](d.i)); };

      function name(d) {  // TODO: not this
        return d.name.split('.')[0];
      }

      function _labelAngle(d) {
        var a = -_angle(d)-Math.PI;
        if (a === -Math.PI) {return a;}
        return a+Math.PI/2;
      }

      var hiveLink = d3.hive.link()
        .angle(_angle)
        .radius(_radius);

      var g = container.selectAll('.treeGraph').data([1]);

      g.enter()
        .append('g')
        .attr('class', 'treeGraph')
        .each(function() { // Only called once
          container.call(zoom.on('zoom', rescale));
          zoom.translate([width/2,height/2+(height/2-size)]);
          zoom.event(container);
        });

      // rescale g
      function rescale() {
        var trans=d3.event.translate;
        var scale=d3.event.scale;
       
        g.attr('transform',
            'translate(' + trans + ') scale(' + scale + ')');
      }

      g.selectAll('.axis')
          .data(groups)
        .enter().append('line')
          .attr('class', 'axis')
          .attr('transform', function(d) { return 'rotate(' + degrees(angle(d)) + ')'; })
          .attr('x1', radius.range()[0])
          .attr('x2', radius.range()[1]);

      // LINKS
      var gLinks = g.selectAll('g.links').data([graph.edges]);

      gLinks.enter()
          .append('g')
            .classed('links', true);

      links = gLinks.selectAll('path')
          .data(_D, linkName);

      links.enter().append('svg:path')
        .classed('link', true)
        .on('mouseover', linkTooltip.show)
        .on('mouseout', linkTooltip.hide)
        ;

      links
        .attr('id', function(d) { return 'link-'+d.index; })
        .style('stroke-width', function(d) { return slog(d.value); })
        .attr('d', hiveLink)
        ;

      links.exit().remove();

      // NODES
      var nodesLayer = g.selectAll('g.nodes').data([graph.nodes]);

      nodesLayer.enter()
        .append('g')
          .classed('nodes', true);

      // Select

      nodesLayer.selectAll('.node').remove();  // TODO: not this, hack to ensure nodes are stacked

      nodes = nodesLayer.selectAll('.node').data(_D, _F('name'));

      // Create
      var nodesEnter = nodes.enter().append('g')
          .classed('node', true)
          .on('dblclick', function(d) { d3.event.stopPropagation(); d.fixed = (d.fixed) ? false : true; nodeClassed.call(this, 'fixed', d.fixed); })
          .on('mouseover.highlight', function() { nodeClassed.call(this, 'hover', true); })
          .on('mouseout.highlight', function() { nodeClassed.call(this, 'hover', false); })
          .on('mouseover', nodeTooltip.show)
          .on('mouseout', nodeTooltip.hide);

      nodesEnter
        .append('rect');

      nodesEnter
        .append('text')
          .attr('text-anchor', 'start')
          .attr('dy', 3);
          
      nodes
        .attr('id', function(d) { return 'node-'+d.index; })
        .classed('fixed', _F('fixed'))
        .attr('transform', function(d) {
          return 'rotate( '+degrees(_angle(d))+' ) translate(' + _radius(d) + ') rotate( '+degrees(_labelAngle(d))+' )';
        });

      function _r(d) { return rsize(d.value); }
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
          .text(name)
          .attr('dx',function(d) { return rsize(d.value)+5; });

      nodes.exit().remove();

    };

    return chart;
  };

  window.treeGraph = treeGraph;

})(window.d3);