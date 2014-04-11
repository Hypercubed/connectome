// Helpers
var _I = function(d, i) { return i; };
var _D = function(d, i) { return d; };
var _F = function(n) { return function(d) { return d[n]; }; };
var _AF = function(n) { return function(d) { return [d[n]]; }; };

// Simple vector manipulation

function v(x,y) {
  if (arguments.length < 2)
    return  { x: x[0], y: x[1]};

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

var networkGraph = function() {

  // elements
  var nodes, links;

  // private
  var width = 500,
      height = 500;

  //var start = true;

  // Private objects
  var zoom = d3.behavior.zoom();
  var force = d3.layout.force()
    .charge(-250)
    .linkDistance(400)
    .linkStrength(0.8)
    .gravity(2)
    .on("tick", tick);

  var line = d3.svg.line()
            .x(function(d) { return d.x; })
           .y(function(d) { return d.y; })
           //.interpolate("linear");
           .interpolate("basis-open");

  function tick() {

    var VC = vScale(1/2, v(force.size()));  // Center of view

    //console.log(chart.container);

    links
      //.transition().duration(50)
      .attr("d", function(d, i) {  // Clean this up

                    
        var RS = 1.2*rsize(sumValues(d.source));    // Source offset radius
          RT = 1.2*rsize(sumValues(d.target));  // Target offset radius

        var points = [];

        if (d.source !== d.target) {

          var vST = vSub(d.target, d.source);   // Vector between nodes
          //var nvST = vNorm(vST);                // Normalized

          var rvST = vRot(vST, Math.PI/180*10); // Rotate 30degrees
          var vSM = vScale(1/2, rvST);          // Source -> Arc midpoint
          var aM = vAdd(d.source, vSM);         // Arc midpoint

          //var M = vScale(1/2, vAdd(d.target, d.source));  // Midpoint

          //var S = 15;                       // Ofset distance
          //var o = vRot(nvST, Math.PI/2);    // perp vector
          //var VSO2= vScale(S, o);           // Midpoint offset vector

          //var aM =  vAdd(M, VSO2);          // Arc midpoint
          //var aM = vScale(1/2, vRot(vST, Math.PI/180*30));
          
          var nvSM = vNorm(vSM);    // Vector between source and arc midpoint
          var nvTM = vNorm(vSub(aM, d.target));   // Vector targent and midpoint

          var dT = vScale(RT, nvTM);    // Target offset
          var dS = vScale(RS, nvSM);    // Source offset

          var pS = vAdd(d.source, dS);
          var pT = vAdd(d.target, dT);

          points.push( d.source );
          points.push( pS );
          points.push( aM );
          points.push( pT );
          points.push( d.target );
          
        } else {  // Self 

          var o = vNorm(vSub(d.source, VC));

          var x = o.x;

          var S = 5*rsize(sumValues(d.source)); //+5*d.count;
          var S2 = 5*rsize(sumValues(d.source)); //+5*d.count;

          var VSO = vScale(S, o); // Perpendicular offset vector

          var dT = vScale(RT, vNorm(vRot(o, Math.PI/8)));     // Target offset
          var dS = vScale(RT, vNorm(vRot(o, -Math.PI/8)));    // Source offset

          points.push( d.source );
          //points.push( d.source );
          points.push( vAdd(d.source, dS) );
          //points.push( vAdd(d.source, dS) );
          //points.push( vAdd(d.source, vScale(d.count/4+1,dS)) );
          points.push( vAdd(d.source, VSO) );
          //points.push( vAdd(d.target, vScale(d.count/4+1,dT)) );
          //points.push( vAdd(d.target, dT) );
          points.push( vAdd(d.target, dT) );
          points.push( d.target );
          
        }

        return line(points);

    }); 

    nodes
      .attr("transform", function(d) { 
        return "translate(" + d.x + ',' + d.y + ")";
      })
      //.transition().duration(50)
      //.attr("x", function(d) { return d.x; })
      //.attr("y", function(d) { return d.y; })
      ;   
  }

  // Scales
  //var color = d3.scale.log().range(["blue", "green"]);
  var ncolor = function(d) {
    //console.log(d.values);
    if (d.values[0] > 0 && d.values[1] > 0) return "#cc33cc";   //  Both, Dark moderate magenta
    if (d.values[1] > 0) return "#99ccff";                      //  Receptor only, Very light blue
    if (d.values[0] > 0) return "#00cc66";                      //  Ligand only, lime green
  }
  //var opacity = d3.scale.log().range([1, 1]);
  var slog = d3.scale.log().range([2,9]).clamp(true);     // Maps value to normalized edge width
  var rsize = d3.scale.linear().range([20, 20]).clamp(true);  // Maps value to size
  //var nindex = d3.scale.linear().range([10, 1]);

  // Accessors
  var degree = function(d) { return d.lin.length + d.lout.length; };  // Calculates the degree based on links
  var sumValues = function(d) { return d3.sum(d.values); };
  //var produc = function(d) { return d.values[0]*d.values[1]; };
  var linkName = function(d) { return d.source.name + ':' + d.name + ':' + d.target.name; }

  // Tooltips
  var nodeTooltip = chart.nodeTooltip = riken.tooltips().getHtml(_F('name'));
  var linkTooltip = chart.linkTooltip = riken.tooltips().getHtml(_F('name'));

  function chart(selection) {
    selection.each(chart.draw);
  }

  chart.classNodesByname = function(names, name) {  // Todo: Use filters
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

  }

  function nodeClassed(name, value) {
      if (arguments.length < 2) value = true;
      name = name || 'active';

      chart.container.classed(name,value);

      var node = d3.select(this);

      node.classed(name, value);
      this.__data__[name] = value;

      links[0].forEach(function(d) {
        var link = d3.select(d);
        var found = node.datum().lout.indexOf(link.datum().index) > -1;

        if (found)
          link.classed(name, value);

      });
    
  }

  chart.draw = function draw(graph) {

    var container = d3.select(this);

    chart.update = function() { container.transition().call(chart); };
      chart.container = container;  //this;

    container
      .attr("width", width)
        .attr("height", height)
        .call(zoom)
        .on("dblclick.zoom", null)
          .append("svg:defs");

    // Ranges
    var _s = d3.extent(graph.edges, _F('value'));
    slog.domain(_s);
    //color.domain(_s);
    //opacity.domain(_s);

    var _e = d3.extent(graph.nodes, sumValues);
    rsize.domain(_e);

    //_n = d3.extent(graph.edges, _F('count'))
    //nindex.domain(_n);    

    force
      .size([width, height])
        .nodes(graph.nodes)
        .links(graph.edges);

      var g = container.selectAll('.networkGraph').data([1]);

      var gEnter = g.enter()
        .append('g')
        .attr('class', 'networkGraph')
        .each(function() {  // Only run once on enter
        zoom
          .on("zoom", function() {
              g
                .attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
            });         
        });


    // MARKERS
    container.selectAll("defs").remove();

      var markers = container.append("defs")
        .selectAll("marker")
          .data(graph.edges)
        .enter()
        .append("svg:marker")
            .attr('class', 'Triangle')
            .attr("viewBox", "0 -5 10 10")
            .attr("refY", 0)
            .attr("refX", 1)
            .attr("markerWidth", function(d) { return 2*slog(d.value); })
            .attr("markerHeight", function(d) { return 2*slog(d.value); })
            .attr("stroke-width", 1)
            .attr('markerUnits','userSpaceOnUse')
            //.style('stroke', function(d) { return color(d.value); })
            //.style('fill', function(d) { return color(d.value); })
            .attr("orient", "auto")
            .attr("id", function(d,i) { return "arrow-"+d.index; })
            .append("svg:path")
              .attr("d", "M0,-5L10,0L0,5")
              ;

    // LINKS
    var gLinks = g.selectAll('g.links').data([1]);

    gLinks.enter()
        .append('g')
          .classed('links', true);

    links = gLinks.selectAll("path")
        .data(graph.edges, linkName);

    links.enter().append("svg:path")
      .classed("link", true)
      .call(linkTooltip.bind)
      ;

    links
      .attr("id", function(d,i) { return "link-"+d.index; })
      //.style('stroke', function(d) { return color(d.value); })
      //.style('opacity', function(d) { return opacity(d.value); })
      .style("stroke-width", function(d) { return slog(d.value); })
      .attr("marker-end", function(d,i) { return "url(#arrow-"+d.index+")"; })
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

    nodes = nodesLayer.selectAll(".node").data(_nodes, _F('name'));

    // Create
    var nodesEnter = nodes.enter().append("g")
        .classed("node", true)
        .call(force.drag)
        .call(nodeTooltip.bind)
        .on('click', function(d) { d.fixed = (d.fixed) ? false : true; nodeClassed.call(this, 'fixed', d.fixed); })
        .on('mouseover.highlight', function() { nodeClassed.call(this, 'hover', true); })
        .on('mouseout.highlight', function() { nodeClassed.call(this, 'hover', false); })
        ;

    nodesEnter
      .append('circle')
        .attr("r",20);

    nodesEnter
      .append('text')
        .style('font-size', "10px")
          .attr('text-anchor', 'middle')
          .attr('dy', 3)
          .text(_F('name'));    

    nodes
      .attr("id", function(d,i) { return "node-"+d.index; })
      .classed('fixed', _F('fixed'))
      ;

    nodes
      .select('circle')
        .style('fill',ncolor);

    nodes.exit().remove();    

    force.start();

  };

  return chart;
}


