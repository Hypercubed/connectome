 /** == FANTOM 5 d3.js reusable heatmap chart ==
 * @license Copyright (c) 2012, RIKEN OSC
 * 
 * @fileoverview FANTOM 5 reusable d3js charts 
 * @purpose: Renders various d3js charts for FANTM5 datasets. 
 *
 * @description: Code and conventions adopted from http://bost.ocks.org/mike/chart/.
 *
 * @author jayson.harshbarger@riken.jp (Jayson Harshbarger)
 * @date: Dec. 21, 2012
*/


	
riken = function() {

	var DEBUG = false;
	
	/* Namespace */
	var riken = { version: 1.0 };
	riken.charts = riken.charts || {};

	riken.debug = function(_) {
		if (!arguments.length) return DEBUG;
		DEBUG = _;
		DEBUG && console.log("In debugging mode.");
		return window.riken;
	};
	riken.debug(false);
	
	/* Global Defaults */
	var defaults = {
		animated : true,
		showLegend : true,
		showTooltips : true,
		margin : {top: 20, right: 20, bottom: 20, left: 20},
		width : 900,
		height : 500,
		tooltipStyle: {
					'position': 'absolute',
					'z-index': 10,
					'visibility': 'hidden',
					'color': 'white',
					'font-size': '14px',
					'background': 'rgba(0, 0, 0, 0.5)',
					'padding': '5px 10px 5px 10px',
					'-moz-border-radius': '5px 5px',
					'border-radius': '5px 5px'
				}
		}

	    
	riken.charts.heatmapChart = function() {

	  // Public
	  var rows, orders, update;
	  
	  var m,n;
	  
	  // Public with defaults
	  var zRange = ['red', '#eee', 'blue'],
		animated = defaults.animated,
		cw=12, ch=12,  // Height and width of each cell
		theta = 30,
		showLegend = defaults.showLegend,
		showTooltips = defaults.showTooltips,
		showOrders = true,
		enableZoom = true,
		axisNames = ['Row','Column'],
		cols = function(d,i) {
			return (m == 0) ? colName + " " + i : d.slice(0,m).join(",");
		},
		rows = function(d,i) {
			return (n == 0) ? rowName + " " + i : d.slice(0,n).join(",");
		},
		valueFormat = d3.format('.04f'),
		tooltipStyle = defaults.tooltipStyle,
		filter = null,
		renderRate = 1000,
		isTable = true
		;
	
	  // Accesors
	  var getCol = function(d,i) { return d.col; }
	  var getRow = function(d,i) { return d.row; }
	  var getColLabel = function(d,i) { return cols[getCol(d,i)]; }
	  var getRowLabel = function(d,i) { return rows[getRow(d,i)]; }
	  var getValue = function(d,i) { return d.value; }
	  var getFormattedValue = function(d,i) { return valueFormat(getValue(d)); }
	  var getScaledX = function(d,i) { return xScale(getCol(d,i)); }
	  var getScaledY = function(d,i) { return yScale(getRow(d,i)); }
	  var getFill = function(d,i) { return zScale(getValue(d,i)); }
	  var tooltipHtml = function(d) { return getColLabel(d) + '<br />' + getRowLabel(d) +'<br />'+getFormattedValue(d) }
	  
	  // Sub componets
	  var legend = riken.charts.heatmapLegend();
	  var tooltips;
		
	  //Private
	  var margin = defaults.margin,
		  width = defaults.width,
		  height = defaults.height,
		  xScale = d3.scale.ordinal(),
		  yScale = d3.scale.ordinal(),
		  zScale = d3.scale.linear().nice(),
		  lw=2*cw, lh=2*ch		// Legend cell size
		  fc = 10, fr = 10,  // Font size
		  fontStyle = { 'font-size': 10, 'font-family': 'monospace' }
		  ca = 30,  //?   ??
		  cstep = 10,
		  rr = 200000;  // Maximum number of elements before forceing render mode
		  
	  var dd;
		  
	  //var rows_order = []; cols_order = [];
	  
	  var orders_data = [ [], [] ];
	  
	  function chart(selection) {
		selection.each(chart.draw);
	  }
	  
	  chart.draw = function(data) {
			var client = d3.select(this);
			client.style('position', 'relative');
			//chart.update = function() { chart(selection); };
			// Convert data to standard representation greedily;
			// this is needed for nondeterministic accessors.
			
			var zDomain;
			
			function checkData(data) {
			
			  if ( !data || !data.length ) {
				var noDataText = client.selectAll('.noData').data(['No Data Available.']);

				noDataText.enter().append('text')
				  .attr('class', 'nvd3 nv-noData')
				  .attr('dy', '-.7em')
				  .style('text-anchor', 'middle')

				noDataText
				  .attr('x', margin.left + width / 2)
				  .attr('y', margin.top + height / 2)
				  .text(function(d) { return d });

				return chart;
			  } else {
				client.selectAll('.noData').remove();
			  }
			};			
			
			function processTableData() {
				
				DEBUG && 
					console.log("Processing data as table...");
					
				//DEBUG && console.log(unparsedData);
				
				if (typeof data == "string")
					data = d3.tsv.parseRows(data);
				
				//var m, n;  // indecies of first numeric element
				

				
				checkData(data);

				for (m in data) {  // Find first numeric point
					var b = false;
					for (n in data[m]) {
						b = IsNumeric(data[m][n]);
						if (b) break;
					};
					if (b) break;
				};
				DEBUG && console.log("First numeric value at: ", m, n);
				
				//DEBUG && console.log(typeof cols == "function");
				
				if (typeof cols == "function") {
					d = d3.transpose(data);
					d.splice(0,n);  // Cut out row names
					
					cols = d.map(cols);
				}
				data.splice(0,m);  // Remove column names

				if (typeof rows == "function") {
					rows = data.map(rows);
				}
				
				data.forEach(function(d) { // For each row
						d.splice(0,n);				// remove row names
					});
			
				// scale = row
				/* data = data.map(function(r) { 
					median = d3.median(r);
					max = d3.max(r);
					return r.map(function(d) {
						d = parseFloat(d);
						return d/max;
					});
				}); */
			
				zDomain = [0, 0, 0];
				dd = [];
				
				var zc = 0, cc = 0;
				for (var i in data) {  // Main data processing loop
					for (var j in data[i]) {
						d = data[i][j];
						d = parseFloat(d);

						cc++;
						if (d == 0) zc++;
						
						if (filter == null || filter(d,i,j)) {
							dd.push({value: d, row: i, col: j});
							if (d < zDomain[0]) zDomain[0] = d;
							if (d > zDomain[2]) zDomain[2] = d;							
						}
						//if (d != 0 || showZero)
							
					};
				};
				
				DEBUG && console.log("Min: ",zDomain[0]);
				DEBUG && console.log("Max: ",zDomain[2]);
				
				//data = dd;
				
				DEBUG && console.log('Values found: ', cc);
				DEBUG && console.log('Values found after filter: ', dd.length);
				DEBUG && console.log('Zeros: ', zc);
				DEBUG && console.log('Columns: ', cols.length);
				DEBUG && console.log('Rows: ', rows.length);
				
				if (dd.length > rr) {
					DEBUG && console.log('More that '+rr+' elemnts found.');
					animated = false;
					if (renderRate == null) renderRate = 1000;
				}

				checkData(dd);
			
			}
			
			function processData() {
				
				DEBUG && console.log("Processing data...");

				if (typeof data == "string")
					data = d3.tsv.parseRows(data);
					
				//console.log(data);
	
				checkData(data);

				zDomain = [0, 0, 0];
				
				/* dd = [];
				
				var zc=0, cc=0;
				
				var c = [], r = [];
				
				//var colLabels = d3.scale.ordinal();
				//var rowLabels = d3.scale.ordinal();
				
				for (var di in data) {  // Main data processing loop
					var d = data[di];
					var v = parseFloat(getValue(d));
					//console.log(d);

					cc++;
					if (v == 0) zc++;

					var i = c.indexOf(cols(d));
					var j = r.indexOf(rows(d));
					
					if( i == -1) { 
						c.push(cols(d)); i = c.length-1;
						}
					if( j == -1) { 
						r.push(rows(d)); j = r.length-1;
						}
						
					//var i = colLabels(cols(d));
					//var j = rowLabels(rows(d));
					
					//console.log(d,i,j);
					
					if (filter == null || filter(d,i,j)) {
						dd.push({value: v, row: j, col: i});
						if (v < zDomain[0]) zDomain[0] = v;
						if (v > zDomain[2]) zDomain[2] = v;							
					}
				};
				
				//colLabels.rangeBands([0,colLabels.domain().length]);
				//console.log(colLabels.domain()[3]);
				//console.log(colLabels(colLabels.domain()[6]));
				
				cols = c;
				rows = r;
				getValue = function(d,i) { return d.value; }; */
				
				dd = data;
				
				zDomain[0] = d3.min(dd,getValue);
				zDomain[2] = d3.max(dd,getValue);
				
				DEBUG && console.log("Min: ",zDomain[0]);
				DEBUG && console.log("Max: ",zDomain[2]);
				
				//data = dd;
				
				DEBUG && console.log('Values found: ', dd.length);
				//DEBUG && console.log('Values found after filter: ', dd.length);
				//DEBUG && console.log('Zeros: ', zc);
				DEBUG && console.log('Columns: ', cols.length);
				DEBUG && console.log('Rows: ', rows.length);
				
				//console.log(dd);
				//console.log(rows);
				//console.log(cols);
				
				if (dd.length > rr) {
					DEBUG && console.log('More that '+rr+' elemnts found.');
					animated = false;
					if (renderRate == null) renderRate = 1000;
				}

				checkData(dd);
				
			}
			
			if (isTable) { processTableData(); } else { processData(); };
			
			colMargin = d3.max(cols.map(function(d) {
				return textWidth(d, fontStyle);
			  }));
			  
			rowMargin = d3.max(rows.map(function(d) {
				return textWidth(d, fontStyle);
			  }));

			if (showOrders) margin.top = Math.max(margin.top, 90);
			margin.right = Math.max(margin.right, colMargin*Math.sin(theta*Math.PI/180));
			margin.bottom = Math.max(margin.bottom, colMargin*Math.cos(theta*Math.PI/180));
			margin.left = Math.max(margin.left, rowMargin);
			
				width = cols.length*cw;// - margin.left - margin.right,
				height = rows.length*ch;// - margin.top - margin.bottom;

				
			xScale.rangeBands([0, width])
				.domain(d3.range(cols.length));
					
			yScale.rangeBands([0, height])
				.domain(d3.range(rows.length));
			
			zScale.range(zRange).domain(zDomain).nice();
			
			if (this.clientWidth && this.clientHeight) {
				var cWidth = this.clientWidth;
				var cHeight = this.clientHeight;		
				var z = 
					(!enableZoom) ? 1 
					: Math.min(cWidth / (width + margin.left + margin.right), cHeight / (height + margin.top + margin.bottom));
			} else {
				var z = 1;
			}

			DEBUG && console.log("Drawing heatmap...");
			
			client.selectAll("svg").remove();
	
			var g = client.append('div')
					.append("svg")
						.attr("class", ".heatmap")
						.attr("width", '100%')
						.attr("height", '100%')
						.attr("pointer-events", "all")
						.style({
							  'font': '12px sans-serif',
							  'shape-rendering': 'crispEdges'
							})
					.append("svg:g")
						.attr("transform", "translate(" + margin.left*z + "," + (margin.top*z) + ")scale("+z+")");
			
			if (enableZoom)
				g.call(d3.behavior.zoom().on("zoom", function() {
							svg
							  .attr("transform",
								  "translate(" + d3.event.translate + ")"
								  + " scale(" + d3.event.scale + ")");
						}));

						
			var svg = g.append("svg:g");

			var bg = svg.append("svg:rect")
					.attr("class", "background")
					.attr("width", width+margin.left+margin.right)
					.attr("height", height+margin.top+margin.bottom)
					.attr("transform", "translate(" + -margin.left + "," + -margin.top + ")")
					.style("fill", 'white' );
					
			if (!enableZoom)
				client
					//.style('width', width+margin.left+margin.right+'px')
					.style('height', (height+margin.top+margin.bottom)+'px');
					
			var row = svg.selectAll(".row")
					.data(rows)
					.enter().append("g")
					.attr("class", "row")
					.attr("transform", function(d, i) {
					  return "translate(0," + yScale(i) + ")";
				   });
			
			row
				  .append("text")
				  .attr("text-anchor", "end")	
				  .text(function(d, i) {
					 return rows[i];
				  })
				  .style("font-size", fr)
				  .style('font-family', 'monospace')
				  .attr("transform", function(d, i) {
					  return "translate("+ -cw +"," + (cw+fr/2)/2 + ")";
				   });
				   
			var column = svg.selectAll(".column")
				   .data(cols)
				   .enter().append("g")
				   .attr("class", "column")
				   .attr("transform", function(d, i) {
					 return "translate(" + (xScale(i)) + ","+(height+ch)+")rotate(90)";
				   });
				   
			column
				  .append("text")
				  .attr("text-anchor", "start")
				  .text(function(d, i) {
					return cols[i];
				  })
				  .style("font-size", fc)
				  .style('font-family', 'monospace')
				  .attr("transform", function(d, i) {
					 return "translate(0,0)rotate(-"+theta+")";
				   });

			if (showTooltips) {
				tooltips = riken.tooltips()
					.style(tooltipStyle)
					.getHtml(tooltipHtml); 
			}

			function drawCells() {
				DEBUG && console.log("Drawing "+dd.length+" cells...");
				
				//var cells = [];
				
				function dot(d) {
					//DEBUG && console.log(d);

					var c = svg.append("svg:rect").datum(d)
						.attr("class", "cell")
						.attr("x", getScaledX)
						 .attr("y", getScaledY)
						 .attr("width", cw)
						 .attr("height", ch)
						 .style("fill", getFill)
						 //.on("mouseover", tooltips.show)
						//.on("mousemove", tooltips.move)
						//.on("mouseout", tooltips.hide);
						 ;
					
					
					if (showTooltips) tooltips.bind(c);	 

					//c = c[0][0];
					//c.__data__ = d;
					
					//DEBUG && console.log(c[0][0]);
					
					//cells.push(c);
				}
				
				//dd.forEach(dot);
				
				if (renderRate) {
					var render = renderQueue(dot).rate(renderRate);
					render(dd);				
				} else {
				
					dd.forEach(dot)
						
					/* cells = svg
						.selectAll(".cell")
						.data(dd)
						.enter().append("svg:rect")
							.attr("class", "cell")
							.attr("x", function(d) { return xScale(d.col) })
							 .attr("y", function(d) { return yScale(d.row) })
							 .attr("width", cw)
							 .attr("height", ch)
							 .style("fill", function(d) { return zScale(d.value) })
							 .on("mouseover", cellMouseover)
							.on("mousemove", cellMousemove)
							.on("mouseout", cellMouseout); */
					
					//DEBUG && console.log(cells);

				}
				

				

				
				//DEBUG && console.log(cells);
				
				/* cells = svg
					.selectAll(".cell")
					.data(dd)
					.enter()
						.append("svg:rect")
						.attr("class", "cell")
						.attr("x", function(d, i) { return xScale(d.col); })
						 .attr("y", function(d, i) { return yScale(d.row); })
						 .attr("width", cw)
						 .attr("height", ch)
						 .style("fill", function(d) { return zScale(d.value); }); */
				
				//DEBUG && console.log(cells);
				
				/* var cells = svg
					.selectAll(".cell").data(dd).enter()
						.append("svg:rect")
						 .attr("class", "cell");
						 
				//cells.exit().remove();		 
						 
				cells 
						 .attr("x", function(d, i) { return xScale(d.col); })
						 .attr("y", function(d, i) { return yScale(d.row); })
						 .attr("width", cw)
						 .attr("height", ch)
						 .style("fill", function(d) { return zScale(d.value); })
						 ; */
						 
				/* cells = svg
					.selectAll(".cell");
				
				cells
					.on("mouseover", cellMouseover)
					.on("mousemove", cellMousemove)
					.on("mouseout", cellMouseout); */
					
			}
			
			/* function updateFilter(_) {
				if (arguments.length) filter = _;
				
				if (filter)
					//client.transition().duration(250).selectAll(".cell")
					//	.delay(function(d, i) { return xScale(i); })
					cells	
						.style("fill-opacity", function(d) { return filter(d) ? 1 : 0.2; })				
			} */
			
			//updateFilter();
			//chart.updateFilter = updateFilter;
			
			function updateOrders() {
			
				//DEBUG && console.log('test');
	  
				var orders = client.selectAll('select')
					.data(orders_data);
					
				orders.selectAll('.option')
					.data(function(d, i) {  return Object.keys(d); })
					.enter().append("option")
						.attr('class', 'option')
						.attr('value', function(d){ return d; })
						.text(function(d){ return d; })
						
			};
			
			chart.updateOrders = updateOrders;
			
			chart.readOrder = function(file, name, dim) {
				DEBUG && console.log('Reading order: '+name);
				
				d3.text(file, function (unparsedData) {
				
					//DEBUG && console.log(unparsedData);
				

					orders_data[dim][name] = d3.tsv.parseRows(unparsedData)
						.map(function(r) { 
							//DEBUG && console.log(r);
							return parseFloat(r[0])-1; 
						});
						
					//DEBUG && console.log(obj[name]);
						
					chart.updateOrders();
				});

			}
			
			function drawOrders() {
			
				orders_data[1]['original'] = d3.range(cols.length);
				orders_data[1]['alpha'] = d3.range(cols.length).sort(function(a, b) { return d3.ascending(cols[a], cols[b]) });
				  
				orders_data[0]['original'] = d3.range(rows.length);
				orders_data[0]['alpha'] = d3.range(rows.length).sort(function(a, b) { return d3.ascending(rows[a], rows[b]); });
				
				var t = client.selectAll('select')
					.data(orders_data)
					.enter();
					
				orders = t.append('div')
						.style('position','absolute')
						//.style('border','1px solid red')
						.style('top',function(d,i) { return 10+20*i+"px"; })
						.style('right','10px')
					.text(function(d,i) { return axisNames[i]+": "; })
					.append('select')
						.on('change',function(d,i) {
							chartOrder(this.value,i);
						});
					
				orders.selectAll('.option')
					.data(function(d, i) {  return Object.keys(d); })
					.enter().append("option")
						.attr('class', 'option')
						.attr('value', function(d){ return d; })
						.text(function(d){ return d; });
					
				/* orders = client
					.append('select')
					.attr('id','orders')
					.style('position','absolute')
					.style('top',10)
					.style('right',10)
					.on('change',function() {
						chartOrder(this.value,this.value);
					});

				cols_order['original'] = d3.range(cols.length);
				cols_order['alpha'] = d3.range(cols.length).sort(function(a, b) { return d3.ascending(cols[a], cols[b]) });
				  
				rows_order['original'] = d3.range(rows.length);
				rows_order['alpha'] = d3.range(rows.length).sort(function(a, b) { return d3.ascending(rows[a], rows[b]); });

				updateOrders(); */
			
			}
			
			function chartOrder(name, dim) {
					DEBUG && console.log('Reordering:',axisNames[dim],name);
					
					var c = (animated) ? client.transition().duration(1000) : client;

					if (dim == 0) {  // Rows
					
						yScale.domain(orders_data[0][name]);
						
						var t = c.selectAll(".row");
						( (animated) ? t.delay(function(d, i) { return yScale(i)/10; }) : t )
							.attr("transform", function(d, i) { return "translate(0," + yScale(i) + ")"; });

						var t = c.selectAll(".cell");
						( (animated) ? t.delay(function(d, i) { return yScale(d.row)/10; }) : t )
							.attr("y", getScaledY);
							
					} else {
						xScale.domain(orders_data[1][name]);
						
						var t = c.selectAll(".column");
						( (animated) ? t.delay(function(d, i) { return xScale(i)/10; }) : t )
							.attr("transform", function(d, i) { return "translate(" + (xScale(i)) + ","+(height+ch)+")rotate(90)"; });
						
						var t = c.selectAll(".cell");				
						( (animated) ? t.delay(function(d, i) { return xScale(d.col)/10; }) : t )
							.attr("x", getScaledX);						
					}

			}
			
			drawCells();
			if (showOrders) drawOrders();
			
			if (showLegend) {
			
				//var wrap = client.append('g').attr('class','legend');

				legend.colorScale(zScale)(client);
				
				var cd = zScale.ticks(cstep);
				dcd = cd[2]-cd[1];				

				function rectOnclick(d,i) {
						console.log(d);
						
						var rects = legend.rects();
						var cells = client.selectAll('.cell');
				   
						var fc = 0, cc = 0;
						rects.each(function(d) {
							cc++;
							if (d3.select(this).classed('faded')) fc++;
						});
						
						if (fc == 0) {  // None are faded, fade all
							rects
								.classed('faded', true)
								.style('opacity',0.2);
							cells
								.classed('faded', true)
								.style('opacity',0.2);
						}
					
						var b = d3.select(this).classed('faded');
						var o = b ? 1 : 0.2;
						
						if (fc == cc-1 & !b) {  // Unfaded last faded rect
							rects
								.classed('faded', false)
								.style('opacity',1);
							cells
								.classed('faded', false)
								.style('opacity',1);
						} else {
							d3.select(this)
								.classed('faded', !b)
								.style('opacity', o);
								
							d3.selectAll(".cell")
								.filter(function(e, j) {
									if (e.value >= d.min && e.value < (d.max) ) {
										return e;
									}
								})
								.classed('faded', !b)
								.style({ 'opacity': o });

						}
						
					} 
						
				//console.log(legend.rects);		
				legend.rects().on('click', rectOnclick);
	  
			};	
			
			chart.update = function() {
				//processData();
				
				drawCells();
				//chartOrder();
			}

		}

	  chart.enableZoom = function(_) {
		if (!arguments.length) return enableZoom;
		enableZoom = _;
		return chart;
	  };
		
	  chart.colLabels = function(_) {
		if (!arguments.length) return cols;
		cols = _;
		return chart;
	  };

	  chart.rowLabels = function(_) {
		if (!arguments.length) return rows;
		rows = _;
		return chart;
	  };
	  
	  chart.getValue = function(_) {
		if (!arguments.length) return getValue;
		getValue = _;
		return chart;
	  };
	  
	  chart.colLabelAngle = function(_) {
		if (!arguments.length) return theta;
		theta = _;
		return chart;
	  };
	  
	  /* chart.data = function(_) {
		if (!arguments.length) return data;
		data = _;
		return chart;
	  }; */
	  
	  chart.cellWidth = function(_) {
		if (!arguments.length) return cw;
		cw = _;
		return chart;
	  };
	  
	  chart.cellHeight = function(_) {
		if (!arguments.length) return ch;
		ch = _;
		return chart;
	  };
	  
	  chart.animated = function(_) {
		if (!arguments.length) return animated;
		animated = _;
		return chart;
	  };
	  
	  chart.zRange = function(_) {
		if (!arguments.length) return zRange;
		zRange = _;
		return chart;
	  };

	  
	  chart.ticksCount = function(_) {
		if (!arguments.length) return cstep;
		cstep = _;
		return chart;
	  };
	  
	  chart.showLegend = function(_) {
		if (!arguments.length) return showLegend;
		showLegend = _;
		return chart;
	  };
	  
	  chart.showOrders = function(_) {
		if (!arguments.length) return showOrders;
		showOrders = _;
		return chart;
	  };
	  
	  chart.axisNames = function(_) {
		if (!arguments.length) return axisNames;
		axisNames = _;
		return chart;
	  };
	  
	  chart.valueFormat = function(_) {
		if (!arguments.length) return valueFormat;
		valueFormat = _;
		return chart;
	  };
	  
	  chart.tooltipHtml = function(_) {
		if (!arguments.length) return tooltipHtml;
		tooltipHtml = _;
		return chart;
	  };
	  
	  chart.filter = function(_) {
		if (!arguments.length) return filter;
		filter = _;
		//chart.update();
		return chart;
	  };
	  
	  chart.renderRate = function(_) {
		if (!arguments.length) return renderRate;
		renderRate = _;
		return chart;
	  };
	  
	  chart.isTable = function(_) {
		if (!arguments.length) return isTable;
		isTable = _;
		return chart;
	  };
	  
	  chart.margin = function(_) {
			if (!arguments.length) return margin;
			margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
			margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
			margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
			margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
			return chart;
	  };
	  
	  /* chart.tooltipStyle = function(_) {
		if (!arguments.length) return tooltipStyle;
		tooltipStyle = _;
		return chart;
	  }; */
	  
	  // Sub-components
	  //chart.legend = legend;
	  chart.legend = function(_) {
		if (!arguments.length) return legend;
		for(var p in _) {
			legend[p] = _[p];
		}
	  }
	  
	  chart.tooltips = function(_) {
		if (!arguments.length) return tooltips;
		for(var p in _) {
			tooltips[p] = _[p];
		}
	  }
	  
	  chart.table = function() {
		//console.log(dd);
		var r = rows.length+1;
		var c = cols.length+1;
		
		var M = new Array(r);
		for (var i = 0; i < r; i++) {
			M[i] = new Array(c);
			for (var j = 0; j < c; j++) {
				M[i][j] = valueFormat(0);
			}
		}
		
		M[0][0] = axisNames[0];
		
		for (var i = 0; i < cols.length; i++) {
			var x = xScale(i)/xScale.rangeBand();
			M[0][x+1] = cols[i];
		}
		
		for (var i = 0; i < rows.length; i++) {
			var y = yScale(i)/yScale.rangeBand();
			M[y+1][0] = rows[i];
		}
		
		for (var i = 0; i < dd.length; i++) {
			var d = dd[i];

			var x = getScaledX(d)/xScale.rangeBand();
			var y = getScaledY(d)/yScale.rangeBand();
			var v = getValue(d);
			
			M[y+1][x+1] = getFormattedValue(d);
		}
		
		return M;
	  }
	  
	  return chart;
	}

	riken.charts.heatmapLegend = function(scale) {
	
		DEBUG && console.log("Drawing legend...");
		
		var margin = {top: 10, right: 15, bottom: 30, left: 15};
		var height = 90;
		var cellSize = [30,10];
		var steps = 10;
		var colorScale = scale;
		var tickFormat = d3.format('.01f');
		var legendText = '';
		

		// Sub-components
		var rects;
		
		var im = 10;
		
		function chart(selection) {
			selection.each(chart.draw);
		}
		
		chart.draw = function(data) {
				//console.log(data);
				container = d3.select(this);
				
				var ticks = colorScale.nice().ticks(steps);
				var colors = ticks.map(colorScale);
				
				var min = ticks[0];
				var max = ticks[ticks.length-1];
				
				var width = cellSize[0]*steps;
				var height = cellSize[1];

				/* var threshold = d3.scale.threshold()
					.domain(ticks)
					.range(colors); */
				
				// A position encoding for the key only.
				var x = d3.scale.linear()
					.domain([min, max])
					.range([0, width])
					.clamp(true);
					
				var data = colors.map(function(d, i) {
					  
					  var min_ = i ? ticks[i-1] : min;
					  var max_ = ticks[i];
					  
					  return {
						x0: x(min_),
						x1: x(max_),
						z: d,
						min: min_,
						max: max_
					  };
					});
					
				var xAxis = d3.svg.axis()
					.scale(x)
					.orient("bottom")
					.tickSize(cellSize[1]*1.5)
					.tickValues(ticks)
					.tickFormat(tickFormat);
					
				var legend = container.append("svg")
					.attr("width", width + margin.left + margin.right)
					.attr("height",  height + margin.top + margin.bottom)
					.style('position','absolute')
					.style('top',0)
					.style('left',0);
					
				var g = legend.append("g")
					.attr("class", "key")
					.attr("transform", "translate("+margin.left+","+margin.top+")");
					
				rects = g.selectAll("rect")
					.data(data)
				  .enter().append("rect")
					.attr("height", cellSize[1])
					.attr("x", function(d) { return d.x0; })
					.attr("width", function(d) { return d.x1 - d.x0; })
					.style("fill", function(d) { return d.z; });
					
				g.call(xAxis).append("text")
					.attr("class", "caption")
					.attr("y", -6)
					.text(legendText);
				
				g.selectAll('.key line')
					.style('stroke', 'black')
					.style('stroke-width', 1);
					
				g.selectAll('text')
					.style('font-size', 10);
					
				g.select('.key path.domain').remove();
			}
		
		// Sub-components
		chart.rects = function() {
			//console.log(rects);
			return rects;
		};
		
		chart.colorScale = function(_) {
			if (!arguments.length) return colorScale;
			colorScale = _;
			return chart;
		};
		
		chart.margin = function(_) {
			if (!arguments.length) return margin;
			margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
			margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
			margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
			margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
			return chart;
		};
		
		chart.tickFormat = function(x) {
			if (!arguments.length) return tickFormat;
			tickFormat = x;
			return chart;
		  };
						  
		return chart;
	}
	
		
	riken.charts.scatterChart = function() {

	  // Private var
	  	  //Private
	  var width = defaults.width,
		  height = defaults.height,
		  xScale = d3.scale.linear().range([0, width]),
		  yScale = d3.scale.linear().range([height, 0]),
		  lcellSize = cellSize		// Legend cell size
		  ;
		  
	  var colors = [
		  "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
		  "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"
		];
			
	  var shapes = ["circle", "cross", "diamond", "square", "triangle-down", "triangle-up"];
			
	  // Public vars with defaults
	  var colorScale = d3.scale.ordinal().range(colors),
	    shapeScale = d3.scale.ordinal().range(shapes),
	    margin = {top: 20, right: 20, bottom: 20, left: 20},
		animated = true,
		cellSize = 10,  // Height and width of each dot
		showLegend = defaults.showLegend,
		showTooltips = defaults.showTooltips,
		valueFormat = d3.format('.04f'),
		tooltipHtml = function(d) { 
			var html = getId(d);
			xComp.forEach(function(c) {
				html += '<br />';
				html += c+": ";
				html += valueFormat(d[c]);
			});
			return html;
			},
		//tooltipStyle = {},
		getX = function(d) { return d[xComp[xi]]; },
		getY = function(d) { return d[yComp[yi]]; },
		getScaleX = function(d,i) { return xScale(getX(d,i)); },
		getScaleY = function(d,i) { return yScale(getY(d,i)); },
		getTransform = function(d,i) { return 'translate(' + getScaleX(d,i) + ',' + getScaleY(d,i) + ')'},
		getId = function(d,i) { return d.id; },
		getColor = function(d,i) { return colorScale(getId(d)); }
		getShape = function(d,i) { return shapeScale(getId(d)); }
		getSymbol = function(d,i) { return d3.svg.symbol().type(getShape(d))(d); }
		//renderRate = 1000
		;
	
	  // Sub components
	  var legend = riken.charts.scatterLegend();
	  var tooltips = riken.tooltips();	  
		
	  var xComp = ["x"];
	  var yComp = ["y"];	  
		
	  var xi = 0;
	  var yi = 0;

	  //var xs = xComp[xi];
	  //var ys = yComp[yi];
		  
	  function chart(selection) {
		selection.each(function(data) {
		
			var client = d3.select(this);
			client.style('position', 'relative');

			var zDomain, dd;
			
			(function processData() {
			  DEBUG && console.log("Processing data...");
			  data.forEach(function(d) {
				xComp.forEach(function(c) {
					d[c] = +d[c];
				});
				yComp.forEach(function(c) {
					d[c] = +d[c];
				});
			  });
			})();

			var cWidth = width;
			var cHeight = height;
				
			if (this.clientWidth && this.clientHeight) {
			    DEBUG && console.log('client width');
				cWidth = this.clientWidth;
				cHeight = this.clientHeight;
				width = cWidth - margin.right - margin.left;
				height = cHeight - margin.top - margin.bottom;
				xScale = d3.scale.linear().range([0, width]);
				yScale = d3.scale.linear().range([height, 0]);
			}
			
			xScale.domain(d3.extent(data, getX)).nice();
			yScale.domain(d3.extent(data, getY)).nice();
			
			DEBUG && console.log("Drawing scatterplot...");
			
			var xAxis = d3.svg.axis()
				.scale(xScale)
				.orient("bottom");

			var yAxis = d3.svg.axis()
				.scale(yScale)
				.orient("left");
			
			var svg = client.append("svg")
				.attr("width", width+margin.right)
				.attr("height", height+margin.bottom)
			  .append("g")
				.attr("transform", "translate(" + (margin.left) + "," + (margin.top) + ")");

			  var xAxis_ = svg.append("g")
					.attr("class", "x axis")
				  .attr("transform", "translate(0," + height + ")")
				  .call(xAxis);

			  var xText = xAxis_.append("text")
				  .attr("class", "label")
				  .attr("x", width)
				  .attr("y", -6)
				  .style("text-anchor", "end")
				  .text(xComp[xi]);

			  var yAxis_ = svg.append("g")
				  .attr("class", "y axis")
				  .call(yAxis);
				  
				  
			  var yText = yAxis_.append("text")
				  .attr("class", "label")
				  .attr("transform", "rotate(-90)")
				  .attr("y", 6)
				  .attr("dy", ".71em")
				  .style("text-anchor", "end")
				  .text(yComp[yi]);
				  
			  function Trans() {

				xScale.domain(d3.extent(data, getX)).nice();
				yScale.domain(d3.extent(data, getY)).nice();
				
				xText.text(xComp[xi])
				yText.text(yComp[yi])
				
				//(animated ? svg.select(".x").transition().duration(750) : svg.select(".x"))
				svg.select(".x").transition().duration(750)
				  .call(xAxis);	

				//(animated ? svg.select(".y").transition().duration(750) : svg.select(".y"))
				svg.select(".y").transition().duration(750)
				 .call(yAxis);				  
				
				(animated ? dots.transition().duration(750) : dots)
						.attr('transform', getTransform );

			  }
			  
			  if (xComp.length > 0) {
				  xAxis_.on('click', function() { 
					xi = (xi < xComp.length-1) ? ++xi : 0;
					Trans();
				  });
			  }
			  
			  if (yComp.length > 0) {
				  yAxis_.on('click', function() { 
					yi = (yi < yComp.length-1) ? ++yi : 0;
					Trans();
				  });
			  }

			  /* var dots = svg.selectAll(".dot")
				  .data(data)
				.enter().append("circle")
				  .attr("class", "dot")
				  .attr("r", 3.5)
				  //.attr("width", 3.5)
				  //.attr("height", 3.5)
				  .attr("cx", getScaleX)
				  .attr("cy", getScaleY)
				  //.attr("x", function(d) { return x(d.PC1); })
				  //.attr("y", function(d) { return y(d.PC2); })
				  .style("fill", getColor)
				  .style("stroke", "#000"); */
				  
			  var dots = svg.selectAll('.dot')
				.data(data)
				.enter().append('path')
				    .attr("class", "dot")
					//.attr("cx", 100)
					//.attr("cy", 200)
					.attr('transform', getTransform )
					.attr('d', getSymbol )
					.style("fill", getColor)
					.style("stroke", "#000")
					.style('fill-opacity',0)
					.style('stroke-opacity',0);
					
			   (animated ? dots.transition()
					.duration(750)
					.delay(function(d,i) { return 30*i; }) : dots)
						.style('fill-opacity',1)
						.style('stroke-opacity',1);

			if (showTooltips) {

				tooltips.getHtml(tooltipHtml).bind(dots); //.bind(dots);
				
			}
			
			if (showLegend) {
				legend
					.width(margin.right > 40 ? margin.right-20 : 200)
					.height(height)
					.colorScale(colorScale)
					.shapeScale(shapeScale);
					
				client
				  .call(legend);
			};

		});
	  }
	  
	  chart.margin = function(_) {
			if (!arguments.length) return margin;
			margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
			margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
			margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
			margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
			return chart;
	  };
	  
	  chart.width = function(_) {
		if (!arguments.length) return width;
		width = _;
		return chart;
	  };

	  chart.height = function(_) {
		if (!arguments.length) return height;
		height = _;
		return chart;
	  };

	  chart.cellSize = function(_) {
		if (!arguments.length) return cellSize;
		cellSize = _;
		return chart;
	  };
	  
	  chart.animated = function(_) {
		if (!arguments.length) return animated;
		animated = _;
		legend.animated(animated);
		return chart;
	  };

	  chart.showLegend = function(_) {
		if (!arguments.length) return showLegend;
		showLegend = _;
		return chart;
	  };
	  
	  chart.axisNames = function(_) {
		if (!arguments.length) return axisNames;
		axisNames = _;
		return chart;
	  };
	  
	  chart.valueFormat = function(_) {
		if (!arguments.length) return valueFormat;
		valueFormat = _;
		return chart;
	  };
	  
	  /* chart.tooltipHtml = function(_) {
		if (!arguments.length) return tooltipHtml;
		tooltipHtml = d3.functor(_);
		return chart;
	  }; */

	  chart.id = function(_) {
		if (!arguments.length) return getId;
		getId = d3.functor(_);
		return chart;
	  };
	  
	  chart.x = function(_) {
		if (!arguments.length) return getX;
		getX = d3.functor(_);
		return chart;
	  };
	  
	  chart.y = function(_) {
		if (!arguments.length) return getY;
		getY = d3.functor(_);
		return chart;
	  };
	  
	  chart.xComp = function(_) {
		if (!arguments.length) return xComp;
		xComp = _;
		return chart;
	  };
	  
	  chart.yComp = function(_) {
		if (!arguments.length) return yComp;
		yComp = _;
		return chart;
	  };
	  
	   chart.xIndex = function(_) {
        if (!arguments.length) return xi;
        xi = _;
        return chart;
      };
      
      chart.yIndex = function(_) {
        if (!arguments.length) return yi;
        yi = _;
        return chart;
      };
	  
	  chart.colors = function(_) {
		if (!arguments.length) return colors;
		colors = _;
		colorScale.range(colors);
		return chart;
	  };
	  
	  chart.shapes = function(_) {
		if (!arguments.length) return shapes;
		shapes = _;
		shapeScale.range(shapes);
		return chart;
	  };
	  
	  // Sub-components
	  chart.legend = legend;
	  chart.tooltips = tooltips;
	  
	  return chart;
	}
	
	riken.charts.scatterLegend = function(scale) {
	
		DEBUG && console.log("Drawing Scatter Plot legend...");
		
		var margin = {top: 10, right: 10, bottom: 10, left: 10};
		var width = 200;
		var cellSize = 10;
		var animated = true;
		var colorScale = scale;
		var shapeScale = null;
		//var tickFormat = d3.format('.01f');
		var getId = function(d) { return d; },
			getColor = function(d) { return colorScale(getId(d)); },
			getShape = function(d) { return shapeScale(getId(d)); },
			getSymbol = function(d) { return d3.svg.symbol().type(getShape(d))(d); }
			
		var getY = function(d,i) { return i * 14 + 2; };

		// Sub-components
		var cells;
		
		//var im = 5;
		
		function chart(selection) {

			selection.each(function(data) {
				//console.log(data);
				container = d3.select(this);
				
				//var cd = colorScale.ticks(steps);
				//cd.splice(-1);
				
				//var delta = cd[1]-cd[0];
				var svg = container.append("svg")
					.style('position','absolute')
					.style('width',width)
					.style('height',height)
					.style('top',margin.top)
					.style('right',margin.right)
					.append("g");				
				
				var legend = svg.selectAll(".legend")
				  .data(colorScale.domain())
				.enter().append("g")
				  .attr("class", "legend")
				  //.attr("transform", function(d, i) { return "translate(0," + getY(d,i) + ")"; })
				  .style('opacity',0);
					
				/* cells = legend.append('circle')
				  .attr('class', 'dot')
				  .attr("cx", width-18)
				  .attr("cy", cellSize/2)
				  .attr("r", cellSize/2)
				  //.attr("height", 12)
				  .style("fill", function(d) { return colorScale(d); })
				  .style("stroke", "#000"); */
				  
				var cells = legend.append('path')
						.attr("class", "dot")
						.attr("transform", function(d, i) { return "translate("+(width-18)+",5)"; })
						.attr('d', getSymbol )
						.style("fill", getColor )
						.style("stroke", "#000");
						  
				legend.append("text")
				  .attr("x", width-28)
				  .attr("y", cellSize-2)
				  .attr("dy", "0")
				  .style("text-anchor", "end")
				  .text(getId);
				  
				(animated ? legend.transition().duration(750).delay(function(d,i) { return 70*i; }) : legend)
					.attr("transform", function(d, i) { return "translate(0," + getY(d,i) + ")"; })
					.style('opacity',1);
			});
		}
		
		// Sub-components
		chart.cells = function() {
			//console.log(rects);
			return cells;
		};
		
		chart.colorScale = function(_) {
			if (!arguments.length) return colorScale;
			colorScale = _;
			return chart;
		};
		
		chart.shapeScale = function(_) {
			if (!arguments.length) return shapeScale;
			shapeScale = _;
			return chart;
		};
		
		chart.width = function(_) {
			if (!arguments.length) return width;
			width = _;
			return chart;
		};
		
		chart.height = function(_) {
			if (!arguments.length) return height;
			height = _;
			return chart;
		};
		
		chart.animated = function(_) {
			if (!arguments.length) return animated;
			animated = _;
			return chart;
		};
		
		chart.margin = function(_) {
			if (!arguments.length) return margin;
			margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
			margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
			margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
			margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
			return chart;
		};
					  
		return chart;
	}
	
	riken.htmlTable = function(rows) {
		
		function formatRows(row) {
			var output = "<tr><td>";
			output += row.join("</td><td>");
			output += "</td></tr>";
			return output;
		}
		
		var output = "<table>";
		output += rows.map(formatRows).join("\n");
		output += "</table>";
		return output;
		
	}
	
	riken.charts.table = function() {
	
		DEBUG && console.log("Creating table object...");
		
		var getValue = function(d,i) { return d; };
		var getRow = getValue;
		var getText = function(d,i) { return d.value; };
		var color = null;
		var tooltipHtml = null;
		
		var container;
		var tooltips;

		var chart = function(selection) {

			if (tooltipHtml) {
				tooltips = riken.tooltips()
					.getHtml(tooltipHtml);	 
			}		
		
			selection.each(function(data) {
				container = d3.select(this);
				
				chart.clear();
				
				var table = container.append("table");
				
				//console.log(getTDStyle);
				
				var c = table
					.selectAll("tr")
					.data(data)
					.enter().append("tr")
						.selectAll("td")
						.data(getRow)
						.enter().append("td")
							.style('background-color',color);
							
							
				c.text(getText);
							
				if (tooltipHtml) tooltips.bind(c);

			});
			
		}
		
		chart.color = function(_) {
			if (!arguments.length) return color;
			color = _;
			return chart;
		}
		
		chart.text = function(_) {
			if (!arguments.length) return getText;
			getText = _;
			return chart;
		}
		
		chart.clear = function() {
			container
				.selectAll("*").remove();
		}
		
		chart.tooltipHtml = function(_) {
			if (!arguments.length) return tooltipHtml;
			tooltipHtml = _;
			return chart;
		};

		return chart;
	}

	riken.tooltips = function() {  // Creates a new tooltip and returnes reference.
		var dist = [10,10];
		var getHtml = function(d) { return d.value; };
		var container = d3.select('body');
		
		var tooltip = container  // Create tooltip
			.append("div")
			.attr('class','tooltip')
			.style(defaults.tooltipStyle)
			.text('');
			
		//console.log(tooltip.style());
			
		tooltip.show = function() {
			//console.log(getHtml(this.__data__));
			tooltip.html(getHtml(this.__data__));
			return tooltip.style("visibility", "visible");
		}
		
		tooltip.move = function() {
			var m = d3.mouse(container.node());
			//console.log(m);
			
			var style = {"top": (m[1]+dist[1])+"px", "left": (m[0]+dist[0])+"px"};

			if (event) tooltip.style(style);
			return tooltip.style("visibility", "visible");
		}
		
		tooltip.hide = function() {
			return tooltip.style("visibility", "hidden");
		}
		
		tooltip.dist = function(_) {
			if (!arguments.length) return dist;
			dist = _;
			return tooltip;
		};
		
		tooltip.bind = function(selection) {
			selection.on("mouseover", tooltip.show)
				.on("mousemove", tooltip.move)
				.on("mouseout", tooltip.hide);
		}
		
		tooltip.getHtml = function(_) {
			if (!arguments.length) return getHtml;
			getHtml = _;
			return tooltip;
		};
			
		return tooltip;
	};
	riken.sparse = function() {
		var data;  // Sparse matrix
		
		var row = function(d) { return d.row; };
		var col = function(d) { return d.col; };
		var val = function(d) { return d.value; };
		
		var me = function(_) {  // Todo: Convert matrix to sparse matrix
			//data = _;
		}
		
		function _matrix(nrows, ncols) {
			var M = [];

			for (var r = 0; r < nrows; r++) {
				M[r] = [];
				for (var c = 0; c < ncols; c++) {
					M[r][c] = { row: r, col: c, value: 0 };
				}
			}

			return M;
		}

		me.toMatrix = function(_) {
			if (!arguments.length) _ = data;

			var nrows = d3.max(_,row)+1;
			var ncols = d3.max(_,col)+1;
			
			//debug && console.log("init matrix");
			var M = _matrix(nrows, ncols);
			
			_.forEach(function (d) {
				var r = +row(d);
				var c = +col(d);
				var v = +val(d);

				M[r][c] = d;
			});

			return M;
		};

		return me;
	
	};

	function textWidth(t, s) {
		d3.select("body").append("div")
			.attr("id","textWidth")
			.style(s)
			.style("position","absolute")
			.text(t);
			
		var e = document.getElementById("textWidth");
		
		var w = (!e) ? f*t.length : e.clientWidth;
		
		e.parentNode.removeChild(e);
		
		return w;
	}

	function IsNumeric(x) { 
		if (typeof x == 'number') return true;
	  return x != "" && x != null && !isNaN(x);
	}


  return riken;
  
}();
var renderQueue = (function(func) {
  var _queue = [],                  // data to be rendered
      _rate = 1000,                 // number of calls per frame
      _invalidate = function() {},  // invalidate last render queue
      _clear = function() {};       // clearing function

  var rq = function(data) {
    if (data) rq.data(data);
    _invalidate();
    _clear();
    rq.render();
  };

  rq.render = function() {
    var valid = true;
    _invalidate = rq.invalidate = function() {
      valid = false;
    };

    function doFrame() {
      if (!valid) return true;
      var chunk = _queue.splice(0,_rate);
      chunk.map(func);
      timer_frame(doFrame);
    }

    doFrame();
  };

  rq.data = function(data) {
    _invalidate();
    _queue = data.slice(0);   // creates a copy of the data
    return rq;
  };

  rq.add = function(data) {
    _queue = _queue.concat(data);
  };

  rq.rate = function(value) {
    if (!arguments.length) return _rate;
    _rate = value;
    return rq;
  };

  rq.remaining = function() {
    return _queue.length;
  };

  // clear the canvas
  rq.clear = function(func) {
    if (!arguments.length) {
      _clear();
      return rq;
    }
    _clear = func;
    return rq;
  };

  rq.invalidate = _invalidate;

  var timer_frame = window.requestAnimationFrame
    || window.webkitRequestAnimationFrame
    || window.mozRequestAnimationFrame
    || window.oRequestAnimationFrame
    || window.msRequestAnimationFrame
    || function(callback) { setTimeout(callback, 17); };

  return rq;
});
