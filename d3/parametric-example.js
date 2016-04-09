!function() {
    var ex = {};

    var box_width = 600;
    var box_height = 400;

    /* target function f(x) */
    ex.target_fn = function(x) {
	return x * x * (x - 0.6);
    } /*target_fn*/

    ex.line_fn = null;

    /* find squared distance between two points 
     * 
     * point = {x,y}
     * pt1, pt2 :: point
     */
    ex.distance_squared = function(pt1, pt2)
    {
	var dx = pt1.x - pt2.x;
	var dy = pt1.y - pt2.y;

	return dx*dx + dy*dy;
    } /*distance_squared*/

    /* given a set of points, 
     * find the point that's closest to a particular target point.
     * O(n) in n=fn_pt_v.length
     * 
     * point = {x,y}
     * fn_pt_v :: array(point)
     * target_fn :: point
     * return :: point | null
     */
    ex.find_closest = function(target_pt, fn_pt_v)
    {
	var best_d2 = null;
	var best_pt = null;

	for(var i=0, n=fn_pt_v.length; i<n; ++i) {
	    var fn_pt = fn_pt_v[i];
	    var d2 = ex.distance_squared(target_pt, fn_pt);
	    if(best_d2 === null || d2 < best_d2) {
		best_d2 = d2;
		best_pt = fn_pt;
	    }
	}

	return best_pt;
    } /*find_closest*/

    ex.start = function(w)
    {
	"use strict";

	var box = (d3.select("body")
		   .append("svg")
		   .attr("class", "box")
		   .attr("width", box_width)
		   .attr("height", box_height)
		  );

	/* map to screen coordinates */
	var x_scale_fn = function(d) { return box_width/2 + d*100; }
	var y_scale_fn = function(d) { return box_height/2 + d*100; }

	var v = [];
	/* target function values at a set of points */
	var target_pt_v = [];
	for(var i=0; i<100; ++i) {
	    v[i] = (i - 50) / 20.0;
	    target_pt_v[i] = {x: x_scale_fn(v[i]), y: y_scale_fn(ex.target_fn(v[i]))};
	}

	ex.line_fn = (d3.svg.line()
		      .x(function(d) { return x_scale_fn(d); })
		      .y(function(d) { return y_scale_fn(ex.target_fn(d)); })
		      .interpolate("linear"));
	
	var fx_path = (box.append("path")
		       .attr("d", ex.line_fn(v))
                       .attr("stroke", "blue")
                       .attr("stroke-width", 2)
                       .attr("fill", "none"));

	var cxn_line = box.selectAll(".cxnline")
	    .data([{x1: (box_width / 2), y1: (box_height / 2),
		    x2: (box_width / 2), y2: (box_height / 2)
		   }])
	    .enter()
	    .append("svg:line")
	    .attr("class", "cxnline")
	    .attr("x1", function(d) { return d.x1; })
	    .attr("y1", function(d) { return d.y1; })
	    .attr("x2", function(d) { return d.x2; })
	    .attr("y2", function(d) { return d.y2; })
	    .attr("stroke", "lightgray")
	    .attr("stroke-width", 1);
	;

	var circle = null;

	var drag = d3.behavior.drag()
	    .on("dragstart",
		function()
		{
		    cxn_line.style("visibility", "visible");
		    circle.style("fill", "red"); })
	    .on("drag",
		function()
		{
		    var best_fn_pt = ex.find_closest(d3.event, target_pt_v);
		    //console.log("best_fn_pt=", best_fn_pt);

		    cxn_line
			.attr("x1", best_fn_pt.x)
			.attr("y1", best_fn_pt.y)
			.attr("x2", d3.event.x)
			.attr("y2", d3.event.y);
		    circle
			.attr("cx", best_fn_pt.x)
			.attr("cy", best_fn_pt.y);
		})
	    .on("dragend",
		function() {
		    cxn_line.style("visibility", "hidden");
		    circle.style("fill", "black")
		});
	
	circle = box.selectAll(".draggableCircle")
	    .data([{x: (box_width / 2), y: (box_height / 2), r: 4}])
	    .enter()
	    .append("svg:circle")
	    .attr("class", "draggableCircle")
	    .attr("cx", function(d) { return d.x; })
	    .attr("cy", function(d) { return d.y; })
	    .attr("r", function(d) { return d.r; })
	    .call(drag)
	    .style("fill", "black");

	console.log("w=", w, ",this=", this);
    }

    this.ex = ex;
}();
