/* global _F */

(function(d3) {
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

      var _rx = function rx(d) { return (d.name.match(/gene/)) ? 0 : 15; };  // todo: look at this...

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

  window.chartLegend  = chartLegend;

})(window.d3);
