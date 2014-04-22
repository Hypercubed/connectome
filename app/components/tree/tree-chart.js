
(function(d3) {
  'use strict';

  // Helpers
  //var _I = function(d, i) { return i; };
  //var _D = function(d) { return d; };
  var _F = function(n) { return function(d) { return d[n]; }; };
  //var _AF = function(n) { return function(d) { return [d[n]]; }; };

  // Simple vector manipulation
  function v(x,y) {
    if (arguments.length < 2) {
      return  { x: x[0], y: x[1]};
    }

    return { x: x, y: y};
  }

  function vAdd(a,b) {
    return v(a.x+b.x, a.y + b.y);
  }

  function vSub(a,b) {
    return v(a.x-b.x, a.y-b.y);
  }

  function vScale(S,a) {
    return v(S*a.x, S*a.y);
  }

  function vLen(a) {
    return Math.sqrt( vMul(a,a) );
  }

  function vMul(a,b) {
    return a.x * b.x + a.y * b.y;
  }

  function vNorm(a) {
    return vScale(1/vLen(a), a);
  }

  function vRot(a, A) {  // Rotate by A radians
    var s = Math.sin(A);
    var c = Math.cos(A);

    return v(c*a.x - s*a.y, s*a.x + c*a.y);
  }

  var treeGraph = function() {

    console.log('Tree graph');

    // elements
    var nodes, links;

    // private
    var width = 500,
        height = 500;

    // Private objects
    var zoom = d3.behavior.zoom();

    //var line = d3.svg.line()  // Change to diagnal
    //  .x(function(d) { return d.x; })
    //  .y(function(d) { return d.y; })
    //  ;




    // Scales
    function ncolor(d) {  // Clean this
      if (d.type.match('receptor'))  {return '#99ccff';}   //  Receptor only, Very light blue
      if (d.type.match('ligand')) {return '#00cc66';} //  Ligand only, lime green
    }

    var slog = d3.scale.log().range([2,9]).clamp(true);     // Maps value to normalized edge width
    var rsize = d3.scale.linear().range([10, 10]).clamp(true);  // Maps value to size

    var x = d3.scale.ordinal().domain([0,1,2]).rangeBands([0, width], 1);

    var y = [];
    y[0] = d3.scale.ordinal().rangePoints([0, height],1);
    y[2] = d3.scale.ordinal().rangePoints([0, height],1);
    y[1] = d3.scale.ordinal().rangePoints([1, height],2);

    var line = d3.svg.diagonal().projection(function(d) { return [d.y, d.x]; });;

    // Accessors
    function sumValues(d) { return d3.sum(d.values); }
    function linkName(d) { return d.source.name + ':' + d.name + ':' + d.target.name; }

    function chart(selection) {
      selection.each(chart.draw);
    }

    // Tooltips
    var nodeTooltip = chart.nodeTooltip = d3.tip().attr('class', 'd3-tip node').html(_F('name'));
    var linkTooltip = chart.linkTooltip = d3.tip().attr('class', 'd3-tip link').html(_F('name'));

    nodeTooltip.offset(function() {
      return [-10, 0];
    });

    var nodeClassed = function nodeClassed(name, value) {

      if (arguments.length < 2) {value = true;}
      name = name || 'active';

      chart.container.classed(name,value);

      var node = d3.select(this);

      node.classed(name, value);
      this.__data__[name] = value;

      links[0].forEach(function(d) {
        var link = d3.select(d);
        var found = node.datum().lout.indexOf(link.datum().index) > -1 ||
                    node.datum().lin.indexOf(link.datum().index) > -1;

        if (found) {
          link.classed(name, value);
        }

      });
      
    };

    chart.draw = function draw(graph) {

      var container = d3.select(this);

      width = parseInt(container.style('width'));
      height = parseInt(container.style('height'));

      x.rangeBands([0, width], 1);
      y[0].rangePoints([0, height],1);
      y[2].rangePoints([0, height],1);
      y[1].rangePoints([0, height],2);

      //console.log(width,height);

      chart.update = function() { container.transition().call(chart); };
      chart.container = container; 

      container
        .attr('width', width)
          .attr('height', height)
            .append('svg:defs');

      container
        .call(linkTooltip)
        .call(nodeTooltip);

      // Ranges
      var _s = d3.extent(graph.edges, _F('value'));
      slog.domain(_s);

      var _e = d3.extent(graph.nodes, sumValues);
      rsize.domain(_e);

      var groupCounts = [0,0,0];

      graph.nodes.forEach(function(node,i) {  // Todo: use scales

        var group = 0;
        //if (node.type == 'node.ligand') { group = 0; };
        if (node.type == 'gene') { group = 1; };
        if (node.type == 'node.receptor') { group = 2; };

        node.group = group;
        node._i = groupCounts[group]++;
      });

      groupCounts.forEach(function(d,i) {
        y[i].domain(d3.range(d));
      });

      console.log(y);
    
      graph.nodes.forEach(function(node,i) {  // Todo: use scales
        node.y = x(node.group);
        node.x = y[node.group](node._i);

        //console.log(node.x,node.y);
      });

      var g = container.selectAll('.treeGraph').data([1]);

      g.enter()
        .append('g')
        .attr('class', 'treeGraph');

      // rescale g
      function rescale() {
        var trans=d3.event.translate;
        var scale=d3.event.scale;
       
        g.attr('transform',
            'translate(' + trans + ') scale(' + scale + ')');
      }

      container.call(zoom.on('zoom', rescale));

      // MARKERS
      /* container.selectAll('defs').remove();

      container.append('defs')
        .selectAll('marker')
          .data(graph.edges)
        .enter()
        .append('svg:marker')
            .attr('class', 'Triangle')
            .attr('viewBox', '0 -5 10 10')
            .attr('refY', 0)
            .attr('refX', 1)
            .attr('markerWidth', function(d) { return 2.5*slog(d.value); })
            .attr('markerHeight', function(d) { return 2.5*slog(d.value); })
            .attr('stroke-width', 1)
            .attr('markerUnits','userSpaceOnUse')
            //.style('stroke', function(d) { return color(d.value); })
            //.style('fill', function(d) { return color(d.value); })
            .attr('orient', 'auto')
            .attr('id', function(d) { return 'arrow-'+d.index; })
            .append('svg:path')
              .attr('d', 'M0,-5L10,0L0,5')
              ; */

      // LINKS
      var gLinks = g.selectAll('g.links').data([1]);

      gLinks.enter()
          .append('g')
            .classed('links', true);

      links = gLinks.selectAll('path')
          .data(graph.edges, linkName);

      links.enter().append('svg:path')
        .classed('link', true)
        //.call(linkTooltip)
        .on('mouseover', linkTooltip.show)
        .on('mouseout', linkTooltip.hide)
        ;

      links
        .attr('id', function(d) { return 'link-'+d.index; })
        .attr('d', line)
        .style('stroke-width', function(d) { return slog(d.value); })
        //.attr('marker-mid', function(d) { return 'url(#arrow-'+d.index+')'; })
        ;

      links.exit().remove();

      // NODES
      var nodesLayer = g.selectAll('g.nodes').data([1]);

      nodesLayer.enter()
        .append('g')
          .classed('nodes', true);

      // Select
      var _nodes = graph.nodes;

      //console.log(graph.nodes);

      nodes = nodesLayer.selectAll('.node').data(_nodes, _F('name'));

      // Create
      var nodesEnter = nodes.enter().append('g')
          .classed('node', true)
          /* .call(force.drag)
          .on('mousedown',
            function() {
              container.call(zoom.on('zoom', null));
            })
          .on('mouseup',
            function() {
              container.call(zoom.on('zoom', rescale));
            }) */
          .on('dblclick', function(d) { d3.event.stopPropagation(); d.fixed = (d.fixed) ? false : true; nodeClassed.call(this, 'fixed', d.fixed); })
          .on('mouseover.highlight', function() { nodeClassed.call(this, 'hover', true); })
          .on('mouseout.highlight', function() { nodeClassed.call(this, 'hover', false); })
          .on('mouseover', nodeTooltip.show)
          .on('mouseout', nodeTooltip.hide)
          ;

      nodesEnter
        .append('circle')
          .attr('r',rsize(1));

      nodesEnter
        .append('text')
          .attr('text-anchor', 'start')
          .attr('dy', 3)
          .attr('dx', rsize(1)+3)
          .text(_F('name'));

      nodes
        .attr('id', function(d) { return 'node-'+d.index; })
        .classed('fixed', _F('fixed'))
        .attr('transform', function(d,i) {
          return 'translate(' + x(d.group) + ',' + y[d.group](d._i) + ')';
        })
        ;

      nodes
        .select('circle')
          .style('fill',ncolor);

      nodes.exit().remove();

      //force.start();

    };

    return chart;
  };

  window.treeGraph = treeGraph;

})(window.d3);