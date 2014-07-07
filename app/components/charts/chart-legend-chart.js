/* global _F */
/* global d3 */

(function(root) {
  'use strict';

  var chartLegend = function() {

    var colorScale;

    var dispatch = d3.dispatch('mouseover','mouseout');


    function chart(selection) {
      selection.each(chart.draw);
    }

    chart.draw = function draw(data) {
      var container = d3.select(this);

      var labels = container.selectAll('.label').data(data).enter().append('g')
        .attr('class', 'label')
        .on('mouseover', function(d) {
          labels.style('opacity', function(_d) { return _d === d ? 1 : 0.2; });
          dispatch.mouseover.apply(this,arguments);
        })
        .on('mouseout', function() {
          labels.style('opacity', 1);
          dispatch.mouseout.apply(this,arguments);
        })
        .attr('transform', function(d,i) { return 'translate(0,'+((i+1)*20)+')'; });

      var _rx = function rx(d) { return (d.group.match(/gene/)) ? 0 : 15; };  // todo: look at this...

      labels.append('rect')
        .style({'stroke-width': '1px', 'stroke': 'rgb(51, 51, 51)'})
        .attr('width', 15)
        .attr('height', 15)
        .attr('rx',_rx)
        .attr('ry',_rx)
        .style('fill', colorScale)
        ;

      labels.append('text')
        .style({'stroke': 'none','fill': '#333','stroke-width': '1px','font-size': '10px'})
        .attr('x', 20)
        .attr('dy', '1.2em')
        .text(_F('name'));

    };

    chart.colors = function(_) {
      if (arguments.length < 1) {return colorScale;}
      colorScale = _;
      return chart;
    };

    //d3.rebind(chart, dispatch, 'on');
    return d3.rebind(chart, dispatch, 'on');
  };

  root.models.legend  = chartLegend;

})(window.lrd3);

/* (function(root) {
  'use strict';

  root.models.node = function() {
    var size = 15,
        radius = 15,
        colors = d3.scale.category10(),
        nodeStyle = {'stroke-width': '1px', 'stroke': 'rgb(51, 51, 51)'},
        textStyle = {'stroke': 'none','fill': '#333','stroke-width': '1px','font-size': '10px'},
        text = _F('name');

    function chart(selection) {
      selection.each(function() {
        var container = d3.select(this);

        container.append('rect')
          .style(nodeStyle)
          .attr('width', size)
          .attr('height', size)
          .attr('rx',radius)
          .attr('ry',radius)
          .style('fill', colors);

        container.append('text')
          .style(textStyle)
          .attr('x', 20)
          .attr('dy', '1.2em')
          .text(text);

      });
    }

    chart.size = function(x) {
      if (!arguments.length) {return size;}
      size = x;
      return chart;
    };

    chart.radius = function(x) {
      if (!arguments.length) {return radius;}
      radius = x;
      return chart;
    };

    chart.colors = function(_) {
      if (arguments.length < 1) {return colors;}
      colors = _;
      return chart;
    };

    chart.text = function(_) {
      if (arguments.length < 1) {return text;}
      text = _;
      return chart;
    };

    return chart;

  };

})(window.lrd3); */
