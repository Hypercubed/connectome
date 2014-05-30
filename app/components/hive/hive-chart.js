/* global _F */

(function(d3) {
  'use strict';

  function degrees(radians) {
    return radians / Math.PI * 180-90;
  }

  var hiveGraph = function() {
    var width = 500, height = 500;
    var margin = { top: 120, right: 300, bottom: 240, left: 240};
    //var padding = { top: 60, right: 100, bottom: 60, left: 60};

    function chart(selection) {
      selection.each(chart.draw);
    }

    // elements
    var nodes, links;

    // Private objects
    var zoom = d3.behavior.zoom();

    var groups = ['gene.ligand','gene.receptor','node'];

    // Scales
    var ncolor = d3.scale.ordinal().domain(['ligand','both','receptor']).range(['#ed1940','yellow','#3349ff']); // ['#ed1940','#a650e2','#3349ff']
    var slog = d3.scale.log().range([2,9]).clamp(true);     // Maps value to normalized edge width
    var rsize = d3.scale.linear().range([3, 12]).clamp(true);  // Maps value to size
    var angle = d3.scale.ordinal().domain(groups).range([-Math.PI/4+Math.PI, Math.PI/4+Math.PI, 0]);  // maps type to angle
    var radius = d3.scale.linear();  // maps position to radius

    var _y = {};  // maps index to position
    groups.forEach(function(d) {
      _y[d] = d3.scale.ordinal().rangePoints([0, 1]);
    });

    // Value accessors
    var _type = _F('type');
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
    var _angle = _F('type', angle); //function(d) { return angle(d.type); };
    var _radius = function(d) { return radius(_y[d.type](d.i)); };
    var _ncolor = _F('class', ncolor); //function(d) {  return ncolor(d.class); };
    var _slog = _F(_value, slog);

    // Tooltips
    var nodeLabelTooltip = chart.nodeLabelTooltip = d3.tip().attr('class', 'd3-tip node').html(_name).direction('w');
    var nodeTooltip = chart.nodeTooltip = d3.tip().attr('class', 'd3-tip node').html(_name).direction('w');
    var linkTooltip = chart.linkTooltip = d3.tip().attr('class', 'd3-tip link').html(_name);

    nodeLabelTooltip.offset(function() {
      //console.log(this.getBBox().width);
      return [0, -40]; //-2*this.getBBox().height
    });

    nodeTooltip.offset(function() {
      //console.log(this.getBBox().width);
      return [0, -20]; //-2*this.getBBox().height
    });

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
        .call(nodeTooltip)
        .call(nodeLabelTooltip)
        ;

      // Ranges
      var _e = d3.extent(graph.edges, _value);  // Edge values
      slog.domain(_e);

      var _n = d3.extent(graph.nodes, _value);  // Node values
      rsize.domain(_n);

      var nodesByType = d3.nest()   // Nest nodes by type
        .key(_type)
        .sortKeys(d3.ascending)
        .entries(graph.nodes);

      //console.log(nodesByType);

      nodesByType.forEach(function(type) { // Setup domain for position range
        //var group = groups.indexOf(type.key);  // TODO: eliminte y and node.group?
        _y[type.key].domain(d3.range(type.values.length));

        type.values.forEach(function(node,i) {
          node.i = i;
          //node.group = group;
        });
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
          .style({ stroke: '#000', 'stroke-width': '1.5px'})
          .attr('transform', function(d) { return 'rotate(' + degrees(angle(d)) + ')'; })
          .attr('x1', radius.range()[0])
          .attr('x2', radius.range()[1]);

      container.select('defs').remove();

      var defs = container.append('defs')
        .selectAll('marker').data(graph.edges).enter()
        .append('svg:marker')
            .attr('class', 'Triangle')
            .attr('viewBox', '0 -5 10 10')
            .attr('refY', 0)
            .attr('refX', 20)
            .attr('markerWidth', 10)
            .attr('markerHeight', 10)
            .attr('stroke-width', 1)
            //.style('stroke', 'black')
            //.style('fill', 'black')
            .attr('markerUnits','userSpaceOnUse')
            .attr('orient', 'auto')
            .attr('id', function(d,i) { return 'arrow-'+i; });

      defs.append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5');

      // LINKS
      var gLinks = g.selectAll('g.links').data([graph.edges]);

      gLinks.enter()
          .append('g')
            .classed('links', true);

      links = gLinks.selectAll('path')
          .data(_F(), linkName);

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
        .style('stroke-width', _slog)
        .attr('d', hiveLink)
        .attr('marker-end', function(d,i) {
          return d.type === 'pair' ? 'url(#arrow-'+i+')' : '';
        })
        ;

      links.exit().remove();

      links.each(function(d, i) {
        if (d.type !== 'pair') {return;}

        var def = d3.select(defs[0][i]);
        var dy = def.attr('refX');

        var l = this.getTotalLength();
        var p0 = this.getPointAtLength(l);
        var pm1 = this.getPointAtLength(l-dy);

        var a = Math.atan((pm1.y-p0.y)/(pm1.x-p0.x));

        def
          .attr('orient', degrees(a-Math.PI/2));
      });

      // NODES
      var nodesLayer = g.selectAll('g.nodes').data([graph.nodes]);

      nodesLayer.enter()
        .append('g')
          .classed('nodes', true);

      // Select

      nodesLayer.selectAll('.node').remove();  // TODO: not this, hack to ensure nodes are stacked

      nodes = nodesLayer.selectAll('.node').data(_F(), _name);

      function sign(x) { return x > 0 ? 1 : x < 0 ? -1 : 0; }

      function _mout(d, dir, key, value) {  // Abstract this into helper link d3.drag

        var _dir = (dir <= 0) ? 'lin' : 'lout';
        var _tgt = (dir <= 0) ? 'source' : 'target';

        d[_dir]
          .forEach(function(index) {
            var d = graph.edges[index];
            if(d) {
              d[key] = value;
              d[_tgt][key] = value;
              if (Math.abs(dir) > 1) {
                //d[_tgt][key] = value;
                _mout(d[_tgt], dir - sign(dir), key, value);
              }
            }
          });

      }

      function classLinks(dir, key, value) {  // Later us dir as recursion limit
        if (arguments.length < 3) { value = true; }

        return function(d) {
          _mout(d, dir, key, value);
        };
      }

      var mouseoverHighlight = function mouseoverHighlight(d) {
        var node = d3.select(this);

        d.hover = true;

        if (d.type === 'node') {
          node.each(classLinks(3, 'hover'));
        } else {
          var _l = d.class === 'ligand';
          node.each(classLinks(_l ? -1 : -2, 'hover'));
          node.each(classLinks(_l ? +2 : +1, 'hover'));
        }
        
        chart.container.classed('hover',true);
        nodes.classed('hover', _hover);
        links.classed('hover', _hover);
      };

      var _hoff = function(d) {d.hover = false; };
      function mouseoutHighlight() {
        chart.container.classed('hover',false);

        nodes
          .each(_hoff)
          .classed('hover',false);

        links
          .each(_hoff)
          .classed('hover',false);
      }

      // Create
      var nodesEnter = nodes.enter().append('g')
          .classed('node', true)
          .style({fill: '#ccc','fill-opacity': 1,stroke: '#333','stroke-width': '1px'})
          .on('dblclick', function(d) {
            d3.event.stopPropagation();
            //var node = d3.select(this);
            d.fixed = (d.fixed) ? false : true;

            nodes.classed('fixed', _fixed);
            links.classed('fixed', _edgeFixed); //function(d) { return d.source.fixed && d.target.fixed; });
          })
          .on('mouseover.highlight', mouseoverHighlight) //function() { nodeClassed.call(this, 'hover', true); })
          .on('mouseout.highlight', mouseoutHighlight) //function() { nodeClassed.call(this, 'hover', false); })
          //.on('mouseover', nodeTooltip.show)
          //.on('mouseout', nodeTooltip.hide)
          ;

      nodesEnter
        .append('rect')
          .on('mouseover', nodeTooltip.show)
          .on('mouseout', nodeTooltip.hide);

      nodesEnter
        .append('text')
          .style({'stroke': 'none','fill': '#333','stroke-width': '1px','font-size': '10px'})
          .attr('text-anchor', 'start')
          .attr('dy', 3)
          .attr('dx', 15)
          .on('mouseover', nodeLabelTooltip.show)
          .on('mouseout', nodeLabelTooltip.hide)
          ;

      nodes
        .attr('id', function(d) { return 'node-'+d.index; })
        .classed('fixed', _fixed)
        .attr('transform', function(d) {
          return 'rotate( '+degrees(_angle(d))+' ) translate(' + _radius(d) + ') rotate( '+degrees(_labelAngle(d))+' )';
        });

      nodes.each(function(d) {  // Store the x-y position for output
        var b = this.getBoundingClientRect();
        d.x = b.left;
        d.y = b.top;
      });

      function _r(d) { return (d.type.match(/gene/)) ? 5 : rsize(d.value); }
      function __r(d) { return -_r(d); }
      function _2r(d) { return 2*_r(d); }
      function rx(d) { return (d.type.match(/gene/)) ? 0 : _r(d); }

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
          .attr('dy',function(d) { return (d.type.match(/gene/)) ? 0 : 3; })
          .attr('dx',function(d) { return (d.type.match(/gene/)) ? 10 : 15; })
          ;

      nodes.exit().remove();

      function highlight(d) {

        if (d === null) {
          container.classed('hover', false);
          nodes.style('opacity', 1).classed('hover', false);
          labels.style('opacity', 1).classed('hover', false);
          return;
        }

        var h = _type.eq(d.type).and(_class.eq(d.class));
        //function o(n) { return h(n) ? 1 : 0.2; };

        nodes
          //.style('opacity', o)
          .classed('hover', h);

        labels
          //.style('opacity', o)
          .classed('hover', h);

        container.classed('hover', true);

      }

      var _l = [
        { name: 'Ligand expressing sample', class: 'ligand', type: 'node' },
        { name: 'Receptor expressing sample', class: 'receptor', type: 'node' },
        { name: 'Ligand and receptor expressing sample', class: 'both', type: 'node' },
        { name: 'Ligand gene', class: 'ligand', type: 'gene.ligand' },
        { name: 'Receptor gene', class: 'receptor', type: 'gene.receptor' }
      ];

      container.selectAll('.caxis').remove();  // TODO: not this

      var labels = container.selectAll('.caxis').data([_l]).enter().append('g')
        .attr('class', 'axis caxis')
        .attr('transform', 'translate('+(width-margin.right)+','+margin.top+')')
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
              .text(_F('name'));

    };

    return chart;
  };

  window.hiveGraph = hiveGraph;

})(window.d3);
