
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

  var forceGraph = function() {

    // elements
    var nodes, links;

    // private
    var width = 500,
        height = 500;

    //var start = true;

    // Private objects
    var zoom = d3.behavior.zoom();

    var line = d3.svg.line()
      .x(function(d) { return d.x; })
      .y(function(d) { return d.y; })
      .interpolate('cardinal')
      .tension(0.3)
      //.interpolate('basis-open')
      ;

    /* function arc(d) {
      var dx = d.target.x - d.source.x,
          dy = d.target.y - d.source.y,
          dr = 300;  //linknum is defined above
      return 'M' + d.source.x + ',' + d.source.y + 'A' + dr + ',' + dr + ' 0 0,1 ' + d.target.x + ',' + d.target.y;
    } */

    function tick() {

      var VC = vScale(1/2, v(force.size()));  // Center of view

      //console.log(chart.container);

      links
        //.transition().duration(50)
        .attr('d', function(d) {  // Clean this up
        
          //var RS = 1*rsize(sumValues(d.source));    // Source offset radius
          var RT = 1*rsize(sumValues(d.target));  // Target offset radius

          var points = [];

          if (d.source !== d.target) {

            var vST = vSub(d.target, d.source);   // Vector between nodes
            var rvST = vRot(vST, Math.PI/180*10); // Rotate 30degrees
            var vSM = vScale(1/2, rvST);          // Source -> Arc midpoint
            var aM = vAdd(d.source, vSM);         // Arc midpoint

            points.push( d.source );
            points.push( aM );
            points.push( d.target );
            
          } else {  // Self 

            var o = vNorm(vSub(d.source, VC));

            //var x = o.x;

            //var S = 2.5*rsize(sumValues(d.source)); //+5*d.count;
            //var S2 = 5*rsize(sumValues(d.source)); //+5*d.count;

            //var VSO = vScale(S, o); // Perpendicular offset vector

            var dT = vScale(RT, vNorm(vRot(o, Math.PI/4)));     // Target offset
            var dS = vScale(RT, vNorm(vRot(o, -Math.PI/4)));    // Source offset

            var dT2 = vScale(2*RT, vNorm(vRot(o, Math.PI/8)));     // Target offset
            var dS2 = vScale(2*RT, vNorm(vRot(o, -Math.PI/8)));    // Source offset

            //points.push( d.source );
            //points.push( d.source );
            points.push( vAdd(d.source, dS) );
            points.push( vAdd(d.source, dS2) );
            //points.push( vAdd(d.source, vScale(d.count/4+1,dS)) );
            //points.push( vAdd(d.source, VSO) );
            //points.push( vAdd(d.target, vScale(d.count/4+1,dT)) );
            points.push( vAdd(d.target, dT2) );
            points.push( vAdd(d.target, dT) );
            //points.push( d.target );
            
          }

          return line(points);
          //return arc(d);

        });

      nodes
        .attr('transform', function(d) {
          return 'translate(' + d.x + ',' + d.y + ')';
        })
        //.transition().duration(50)
        //.attr('x', function(d) { return d.x; })
        //.attr('y', function(d) { return d.y; })
        ;
    }


    var force = d3.layout.force()
      .charge(-8000)
      .linkDistance(800)
      .linkStrength(0.1)
      .gravity(1)
      .on('tick', tick);

    var groups = ['ligand','both','receptor'];
    var ncolor = d3.scale.ordinal().domain(groups).range(['#ed1940','#a650e2','#3349ff']);

    // Scales
    //var color = d3.scale.log().range(['blue', 'green']);
    /* function ncolor(d) {
      var type = d.type;
      if (!type) {  // Get rid of this
        if (d.lout.length > 0) {type='ligand';}
        if (d.lin.length > 0) {type='receptor';}
        if (d.lout.length > 0 && d.lin.length > 0) {type='both';}
      }
      
      if (type==='both') {return '#a650e2';}   //  Both, purple
      if (type==='receptor')  {return '#3349ff';}   //  Receptor only, blue
      if (type==='ligand') {return '#ed1940';} //  Ligand only, red
    } */

    //var opacity = d3.scale.log().range([1, 1]);
    var ewidth = d3.scale.linear().range([1,10]).clamp(true);     // Maps value to normalized edge width
    var eopac = d3.scale.linear().range([0.2,0.8]).clamp(true);     // Maps value to normalized edge width
    var ecolor = d3.scale.linear().range(['black','black']);     // Maps value to normalized edge width
    var rsize = d3.scale.linear().range([10, 10]).clamp(true);  // Maps value to size
    //var nindex = d3.scale.linear().range([10, 1]);

    // Accessors
    //function degree(d) { return d.lin.length + d.lout.length; }  // Calculates the degree based on links
    function sumValues(d) { return d3.sum(d.values); }
    function linkName(d) { return d.source.name + ':' + d.name + ':' + d.target.name; }

    function chart(selection) {
      selection.each(chart.draw);
    }

    // Tooltips
    
    var nodeTooltip = chart.nodeTooltip = d3.tip().attr('class', 'd3-tip node').html(_F('name'));
    var linkTooltip = chart.linkTooltip = d3.tip().attr('class', 'd3-tip link').html(_F('name'));

    linkTooltip.offset(function() {
      return [this.getBBox().height / 2, 0];
    });

    //var nodeTooltip = chart.nodeTooltip = riken.tooltips().getHtml(_F('name'));
    //var linkTooltip = chart.linkTooltip = riken.tooltips().getHtml(_F('name'));

    /* chart.classNodesByname = function(names, name) {  // Todo: Use filters
      //console.log(names, name, value);

      value = (names.length > 0);
      name = name || 'selected';

      //var _nodes = nodes.filter(function(d) { 
      //  console.log(d); 
      //  return names.indexOf(d.name) > -1; 
      //});

      //console.log(_nodes);

      nodes[0].forEach(function(d) {
        var node = d3.select(d);
        var found = names.indexOf(node.datum().name) > -1;

        nodeClassed.call(d, name, found);

      });

      //console.log(name,value);

      chart.container.classed(name,value);

    } */

    var nodeClassed = function nodeClassed(name, value) {

      if (arguments.length < 2) {value = true;}
      name = name || 'active';

      chart.container.classed(name,value);

      var node = d3.select(this);

      node.classed(name, value);
      this.__data__[name] = value;

      links[0].forEach(function(d) {
        var link = d3.select(d);
        var found = node.datum().lout.indexOf(link.datum().index) > -1;

        if (found) {
          link.classed(name, value);
        }

      });
      
    };

    chart.draw = function draw(graph) {

      var container = d3.select(this);

      width = parseInt(container.style('width'));
      height = parseInt(container.style('height'));

      //console.log(parseInt(container.style('width')),parseInt(container.style('height')));

      chart.update = function() { container.transition().call(chart); };
      chart.container = container;  //this;

      container
        .attr('width', width)
          .attr('height', height)
          //.call(zoom.on('zoom', rescale))
          //.on('dblclick.zoom', null)
            .append('svg:defs');

      container
        .call(linkTooltip)
        .call(nodeTooltip);

      // Ranges
      var _s = d3.extent(graph.edges, _F('value'));
      ewidth.domain(_s);
      ecolor.domain(_s);
      eopac.domain(_s);

      var _e = d3.extent(graph.nodes, sumValues);
      rsize.domain(_e);

      //_n = d3.extent(graph.edges, _F('count'))
      //nindex.domain(_n);    

      force
        .size([width, height])
          .nodes(graph.nodes)
          .links(graph.edges);

      //force.drag.on("dragstart", function() { d3.event.sourceEvent.stopPropagation(); });

      var g = container.selectAll('.forceGraph').data([1]);

      g.enter()
        .append('g')
        .attr('class', 'forceGraph');

      // rescale g
      function rescale() {
        var trans=d3.event.translate;
        var scale=d3.event.scale;
       
        g.attr('transform',
            'translate(' + trans + ') scale(' + scale + ')');
      }

      container.call(zoom.on('zoom', rescale));

      // MARKERS
      container.selectAll('defs').remove();

      container.append('defs')
        .selectAll('marker')
          .data(graph.edges)
        .enter()
        .append('svg:marker')
            .attr('class', 'Triangle')
            .attr('viewBox', '0 -5 10 10')
            .attr('refY', 0)
            .attr('refX', 1)
            .attr('markerWidth', function(d) { return 2.5*ewidth(d.value); })
            .attr('markerHeight', function(d) { return 2.5*ewidth(d.value); })
            .attr('stroke-width', 1)
            .attr('markerUnits','userSpaceOnUse')
            //.style('stroke', function(d) { return color(d.value); })
            //.style('fill', function(d) { return color(d.value); })
            .attr('orient', 'auto')
            .attr('id', function(d) { return 'arrow-'+d.index; })
            .append('svg:path')
              .attr('d', 'M0,-5L10,0L0,5')
              ;

      // LINKS
      var gLinks = g.selectAll('g.links').data([1]);

      gLinks.enter()
          .append('g')
            .classed('links', true);

      links = gLinks.selectAll('path')
          .data(graph.edges, linkName);

      links.enter().append('svg:path')
        .classed('link', true)
        .style({
          fill: 'none',
          stroke: '#666',
          'stroke-width': '1.5px',
          opacity: '0.6',
        })
        .on('mouseover', linkTooltip.show)
        .on('mouseout', linkTooltip.hide)
        ;

      links
        .attr('id', function(d) { return 'link-'+d.index; })
        .style('stroke', function(d) { return ecolor(d.value); })
        .style('opacity', function(d) { return eopac(d.value); })
        .style('stroke-width', function(d) { return ewidth(d.value); })
        .attr('marker-mid', function(d) { return 'url(#arrow-'+d.index+')'; })
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
          .call(force.drag)
          .on('mousedown',
            function() {
              container.call(zoom.on('zoom', null));
            })
          .on('mouseup',
            function() {
              container.call(zoom.on('zoom', rescale));
            })
          .on('dblclick', function(d) { d3.event.stopPropagation(); d.fixed = (d.fixed) ? false : true; nodeClassed.call(this, 'fixed', d.fixed); })
          .on('mouseover.highlight', function() { nodeClassed.call(this, 'hover', true); })
          .on('mouseout.highlight', function() { nodeClassed.call(this, 'hover', false); })
          .on('mouseover', nodeTooltip.show)
          .on('mouseout', nodeTooltip.hide)
          ;

      nodesEnter
        .append('circle')
          .style({'fill': '#ccc','fill-opacity': 1,'stroke': '#333','stroke-width': '1px'})
          .attr('r',rsize(1));

      //nodesEnter
      //  .append('rect')
      //    .attr({'x':0, 'y':-10, 'width': 200, 'height': 20,'fill': '#ccc'})
       //   .style({'stroke': 'none'});

      nodesEnter
        .append('text')
          .style({'stroke': 'none','fill': '#333','stroke-width': '0.5px','font-size': '10px','font-variant':'small-caps','font-weight':'bold','text-shadow': '2px 2px 1px #fff, -1px -1px 1px #fff'})
          .attr('text-anchor', 'start')
          .attr('dy', '0.5em')
          .attr('dx', rsize(1)+3)
          .text(_F('name'));

      nodes
        .attr('id', function(d) { return 'node-'+d.index; })
        .classed('fixed', _F('fixed'))
        ;

      function _ncolor(d) {  return ncolor(d.type); }
      
      nodes
        .select('circle')
          .style('fill',_ncolor);

      //nodes
       // .select('rect')
      //    .style('fill',ncolor);

      nodes.exit().remove();

      force.start();

    };

    return chart;
  };

  window.forceGraph = forceGraph;

})(window.d3);