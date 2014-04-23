
(function(d3) {
  'use strict';

  // Helpers
  //var _I = function(d, i) { return i; };
  //var _D = function(d) { return d; };
  var _F = function(n) { return function(d) { return d[n]; }; };
  //var _AF = function(n) { return function(d) { return [d[n]]; }; };

  // Simple vector manipulation
  /* function v(x,y) {
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
  } */

  function degrees(radians) {
    return radians / Math.PI * 180 - 90;
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
      if (d.type.match('gene'))  {return '#cc66cc';}   //  Receptor only, Very light blue
      if (d.type.match('receptor'))  {return '#99ccff';}   //  Receptor only, Very light blue
      if (d.type.match('ligand')) {return '#00cc66';} //  Ligand only, lime green
    }

    var slog = d3.scale.log().range([2,9]).clamp(true);     // Maps value to normalized edge width
    var rsize = d3.scale.linear().range([5, 10]).clamp(true);  // Maps value to size

    var groups = [0,1,2];

    var x = d3.scale.ordinal().domain(groups);
    var y = groups.map(function() { return d3.scale.ordinal().rangePoints([0, 1]); });

    var angle = d3.scale.ordinal().domain([1,2,0,3]).rangePoints([0, 2 * Math.PI]);
    var radius = d3.scale.linear();

    var line = d3.svg.diagonal().projection(function(d) { return [d.y, d.x]; });

    // Accessors
    function value(d) { return d.value; }
    function linkName(d) { return d.source.name + ':' + d.name + ':' + d.target.name; }

    function chart(selection) {
      selection.each(chart.draw);
    }

    // Tooltips
    var nodeTooltip = chart.nodeTooltip = d3.tip().attr('class', 'd3-tip node').html(_F('name'));
    var linkTooltip = chart.linkTooltip = d3.tip().attr('class', 'd3-tip link').html(_F('name'));

    nodeTooltip.offset(function() {
      return [-this.getBBox().height / 2, -rsize(value(this.__data__))];
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

      var size = Math.min(height, width)/(1+Math.cos(Math.PI/3))/1.5;
      radius.range([size/10, size]);

      //console.log(width,height);

      chart.update = function() { container.transition().call(chart); };
      chart.container = container; 

      container
        .attr('width', width)
          .attr('height', height)
          ;

      container
        .call(linkTooltip)
        .call(nodeTooltip);

      // Ranges
      var _s = d3.extent(graph.edges, _F('value'));
      slog.domain(_s);

      var _e = d3.extent(graph.nodes, _F('value'));
      rsize.domain(_e);

      var groupCounts = [0,0,0];

      graph.nodes.forEach(function(node,i) {  // Todo: use scales
        var group;
        if (node.type == 'node.ligand') { group = 0; };
        if (node.type == 'gene') { group = 1; };
        if (node.type == 'node.receptor') { group = 2; };

        node.group = group;
        node.i = groupCounts[group]++;

      });

      groupCounts.forEach(function(d,i) {
        y[i].domain(d3.range(d)).rangePoints([0,1]);
      });
    
      /* graph.nodes.forEach(function(node,i) {  // Todo: use scales
        //node.y = x(node.group);
        //node.x = y[node.group](node._i);

        node.__i = node._i/(groupCounts[node.group]-1);

        console.log(node._i, y[node.group](node._i), node.__i);

        node.x = node.__i;
        node.y = node.group;

        //console.log(node.group,  node._i, radius(node._i/(groupCounts[node.group]-1)));

        //console.log(node.x,node.y);
      }); */

      var _angle = function(d) { return angle(d.group); };
      var _radius = function(d) { return radius(y[d.group](d.i)); };

      var hiveLink = d3.hive.link()
        .angle(_angle)
        .radius(_radius)

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

      zoom.translate([width/2,height/2+(height/2-size)]);
      zoom.event(container);

      g.selectAll(".axis")
          .data(d3.range(3))
        .enter().append("line")
          .attr("class", "axis")
          .attr("transform", function(d) { return "rotate(" + degrees(angle(d)) + ")"; })
          .attr("x1", radius.range()[0])
          .attr("x2", radius.range()[1]);

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
        .style('stroke-width', function(d) { return slog(d.value); })
        .attr('d', hiveLink)
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

      var name = function(d) {  // TODO: fix this
        return d.name.split('.')[0];
      }

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
          .text(name);

      var _labelAngle = function(d) {
        if (d.group == 1) return Math.PI;
        if (d.group == 0) return 0;
        return _angle(d);
      }

      nodes
        .attr('id', function(d) { return 'node-'+d.index; })
        .classed('fixed', _F('fixed'))
        .attr('transform', function(d,i) {
          return 'rotate( '+degrees(_angle(d))+' ) translate(' + _radius(d) + ') rotate( '+degrees(_labelAngle(d))+' )';
        })
        ;

      nodes
        .select('circle')
          .attr('r',function(d) { return rsize(d.value); })
          .style('fill',ncolor);

      nodes
        .select('text')
          .attr('dx',function(d) { return rsize(d.value)+3; });

      nodes.exit().remove();

      //force.start();

    };

    return chart;
  };

  window.treeGraph = treeGraph;

})(window.d3);