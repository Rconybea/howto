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
    ex.find_closest_ix = function(target_pt, fn_pt_v)
    {
	var best_ix = -1;
	var best_d2 = null;
	var best_pt = null;
	var i = 0;

	for(var n=fn_pt_v.length; i<n; ++i) {
	    var fn_pt = fn_pt_v[i];
	    var d2 = ex.distance_squared(target_pt, fn_pt);
	    if(best_ix === -1 || d2 < best_d2) {
		best_ix = i;
		best_d2 = d2;
		best_pt = fn_pt;
	    }
	}

	return best_ix;
    } /*find_closest_ix*/

    /* like find_closest_ix(), but returns the closest
     * point,  instead of its index in fn_pt_v.
     * 
     * Equivalent to fn_pt_v[find_closest_ix(target_pt, fn_pt_v)]
     */
    ex.find_closest = function(target_pt, fn_pt_v)
    {
	var best_ix = ex.find_closest_ix(target_pt, fn_pt_v);
	return fn_pt_v[best_ix];
    } /*find_closest*/

    /* given a line L through points pt1,pt2,
     * find the point p on the line such that the line through p,target_pt
     * is perpendicular to L
     * 
     * point = {x,y}
     * target_pt, pt1, pt2 :: point
     * return :: point
     */
    ex.find_perpendicular = function(target_pt, pt1, pt2, clip_flag)
    {
	/*
	 *                               * (x2,y2) = pt2
	 *                             /
	 *                           /
	 *                         /  L
	 *                   p   /
	 *                     *
	 *                   /   \  M
	 *                 /       \
	 * pt1 = (x1,y1) *           \
	 *                            * (x0,y0) pt0
	 *
	 * parameterise the line L through pt1,pt2:
	 *    L comprises the points L(t) = pt1 + t*(pt2-pt1)
	 * given a particular point p = L(t0),  consider the line M
	 * through L(t0) and (x0,y0)
	 *    M comprises the points M(s) = pt0 + s*(L(t0)-pt0)
	 *  
	 * we seek t such that the line M(s) through L(t) and (x0,y0)
	 * is perpendicular to L.
	 *
	 * A vector lv parallel to L is (pt2-pt1).
	 *   lv = (x2-x1,y2-y1)
	 * A vector mv parallel to the line thru L(t) 
	 *   L(t) = pt1 + t*(pt2-pt1) = (1-t)*pt1 + t*pt2
	 * and pt0 is:
	 *   mv = L(t)-pt0
	 *      = ((1-t)*x1 + t*x2) - x0,
	 *         (1-t)*y1 + t*y2) - y0)
	 * 
	 *  lv . mvT
	 *      = (x2-x1)*[(1-t)*x1 + t*x2 - x0]
	 *         + (y2-y1)*[(1-t)*y1 + t*y2 - y0]
	 * 
	 * lv. mvT is 0 when lv and mv are _|_:
	 *   (x2-x1)*[(1-t)*x1 + t*x2 - x0] = -(y2-y1)*[(1-t)*y1 + t*y2 - y0]
	 *   (x2-x1)*[-t*x1 + t*x2 + x1-x0] = -(y2-y1)*[-t*y1 + t*y2 + y1-y0]
	 *   t*(x2-x1)*[-x1 + x2] + (x2-x1)*(x1-x0) = t*[-(y2-y1)]*[-y1 + y2] + -(y2-y1)*(y1-y0)
	 *   t*(x2-x1)^2 + t*(y2-y1)^2 = -(x2-x1)*(x1-x0) - (y2-y1)*(y1-y0)
	 *   
	 *            (x2-x1)*(x1-x0) + (y2-y1)*(y1-y0)
	 *   t = -1 * ---------------------------------
	 *                 (x2-x1)^2 + (y2-y1)^2
	 *
	 *   L(t) = pt1 + t*(pt2 - pt1)
	 */
	var pt0 = target_pt;

	var dx2 = pt2.x - pt1.x;
	var dy2 = pt2.y - pt1.y;

	var dx1 = pt1.x - pt0.x;
	var dy1 = pt1.y - pt0.y;

	var t = -((dx2*dx1) + (dy2*dy1)) / (dx2*dx2 + dy2*dy2);

	/* if clip_flag is true:
	 * constrain t to [0,1]
	 */
	if(clip_flag) {
	    if(t < 0.0)
		t = 0.0;
	    if(t > 1.0)
		t = 1.0;
	}

	var xt = pt1.x + t * dx2;
	var yt = pt1.y + t * dy2;

	return {x: xt, y: yt};
    } /*find_perpendicular*/

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
	var x_scale_fn = function(d) { return box_width/2 + d*150; }
	var y_scale_fn = function(d) { return box_height/2 + d*100; }

	var v = [];
	/* target function values at a set of points */
	var target_pt_v = [];
	var n_points = 30;
	for(var i=0; i<n_points; ++i) {
	    v[i] = (i - n_points/2) * (100.0 / n_points) / 20.0;
	    target_pt_v[i] = {x: x_scale_fn(v[i]), y: y_scale_fn(ex.target_fn(v[i]))};
	}

	ex.line_fn = (d3.svg.line()
		      .x(function(d) { return x_scale_fn(d); })
		      .y(function(d) { return y_scale_fn(ex.target_fn(d)); })
		      .interpolate("linear"));
	
	var fx_path = (box.append("path")
		       .attr("d", ex.line_fn(v))
                       .attr("stroke", "navy")
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

	var hilite_line0 = box.selectAll(".hilite_line0")
	    .data([{x1: (box_width / 2), y1: (box_height / 2),
		    x2: (box_width / 2), y2: (box_height / 2)}])
	    .enter()
	    .append("svg:line")
	    .attr("class", "hilite_line0")
	    .attr("x1", function(d) { return d.x1; })
	    .attr("y1", function(d) { return d.y1; })
	    .attr("x2", function(d) { return d.x2; })
	    .attr("y2", function(d) { return d.y2; })
	    .attr("stroke", "orangered")
	    .attr("stroke-width", 2)
	    .style("visibility", "hidden");
	var hilite_line2 = box.selectAll(".hilite_line2")
	    .data([{x1: (box_width / 2), y1: (box_height / 2),
		    x2: (box_width / 2), y2: (box_height / 2)}])
	    .enter()
	    .append("svg:line")
	    .attr("class", "hilite_line2")
	    .attr("x1", function(d) { return d.x1; })
	    .attr("y1", function(d) { return d.y1; })
	    .attr("x2", function(d) { return d.x2; })
	    .attr("y2", function(d) { return d.y2; })
	    .attr("stroke", "orangered")
	    .attr("stroke-width", 2)
	    .style("visibility", "hidden");

	//var circle = null;
	var circle0 = null;
	var circle2 = null;
	
	var drag = d3.behavior.drag()
	    .on("dragstart",
		function()
		{
		    cxn_line.style("visibility", "visible");
		    hilite_line0.style("visibility", "visible");
		    hilite_line2.style("visibility", "visible");
		    //circle.style("fill", "orange");
		    circle0.style("visibility", "visible");
		    //circle2.style("visibility", "visible");
		})
	    .on("drag",
		function()
		{
		    var best_fn_pt_ix = ex.find_closest_ix(d3.event, target_pt_v);
		    if(best_fn_pt_ix == 0)
			best_fn_pt_ix = 1;
		    if(best_fn_pt_ix == n_points - 1)
			best_fn_pt_ix = n_points - 1;

		    var best_fn_pt0 = target_pt_v[best_fn_pt_ix - 1];
		    var best_fn_pt1 = target_pt_v[best_fn_pt_ix];
		    var best_fn_pt2 = target_pt_v[best_fn_pt_ix + 1];
		    //console.log("best_fn_pt_ix=", best_fn_pt_ix, ", best_fn_pt=", best_fn_pt);

		    var perp_pt0 = ex.find_perpendicular(d3.event, best_fn_pt0, best_fn_pt1, true /*clip_flag*/);
		    var perp_pt2 = ex.find_perpendicular(d3.event, best_fn_pt1, best_fn_pt2, true /*clip_flag*/);
		    /* choose best of perp_pt0, perp_pt2 (nearest to d3.event) */
		    var perp_pt = ex.find_closest(d3.event, [perp_pt0, perp_pt2]);

		    cxn_line
			.attr("x1", perp_pt.x)
			.attr("y1", perp_pt.y)
			.attr("x2", d3.event.x)
			.attr("y2", d3.event.y);
		    hilite_line0
			.attr("x1", best_fn_pt0.x)
			.attr("y1", best_fn_pt0.y)
			.attr("x2", best_fn_pt1.x)
			.attr("y2", best_fn_pt1.y);
		    hilite_line2
			.attr("x1", best_fn_pt1.x)
			.attr("y1", best_fn_pt1.y)
			.attr("x2", best_fn_pt2.x)
			.attr("y2", best_fn_pt2.y);
/*
		    circle
			.attr("cx", best_fn_pt1.x)
			.attr("cy", best_fn_pt1.y);
*/
		    circle0
			.attr("cx", perp_pt.x)
			.attr("cy", perp_pt.y);
/*
		    circle2
			.attr("cx", perp_pt2.x)
			.attr("cy", perp_pt2.y);
*/
		})
	    .on("dragend",
		function() {
		    cxn_line.style("visibility", "hidden");
		    hilite_line0.style("visibility", "hidden");
		    hilite_line2.style("visibility", "hidden");
		    //circle.style("fill", "orangered")
		    //circle0.style("visibility", "hidden")
		    //circle2.style("visibility", "hidden");
		});
	
/*
	circle = box.selectAll(".draggableCircle")
	    .data([{x: (box_width / 2), y: (box_height / 2), r: 4}])
	    .enter()
	    .append("svg:circle")
	    .attr("class", "draggableCircle")
	    .attr("cx", function(d) { return d.x; })
	    .attr("cy", function(d) { return d.y; })
	    .attr("r", function(d) { return d.r; })
	    .call(drag)
	    .style("fill", "orangered");
*/
	circle0 = box.selectAll(".circle0")
	    .data([{x: (box_width / 2), y: (box_height / 2), r: 4}])
	    .enter()
	    .append("svg:circle")
	    .attr("class", "circle0")
	    .attr("cx", function(d) { return d.x; })
	    .attr("cy", function(d) { return d.y; })
	    .attr("r", function(d) { return d.r; })
	    .call(drag)
	    .style("stroke", "orangered")
	    .style("stroke-width", 2)
	    .style("fill", "orange");
/*
	circle2 = box.selectAll(".circle2")
	    .data([{x: (box_width / 2), y: (box_height / 2), r: 4}])
	    .enter()
	    .append("svg:circle")
	    .attr("class", "circle2")
	    .attr("cx", function(d) { return d.x; })
	    .attr("cy", function(d) { return d.y; })
	    .attr("r", function(d) { return d.r; })
	    .call(drag)
	    .style("stroke", "orangered")
	    .style("stroke-width", 2)
	    .style("fill", "none")
	    .style("visibility", "hidden");
*/

	//console.log("w=", w, ",this=", this);
    }

    this.ex = ex;
}();
