!function() {
    var ex = {};

    var box_width = 600;
    var box_height = 400;

    /* make point {x,f(x)} 
     *  point = {x,y}
     *  f :: (num -> num)
     *  x :: num
     *  returns :: point
     */
    ex.eval_fn = function(f, x) {
	return {x: x, y: f(x)};
    } /*eval_fn*/

    /* target function f(x) */
    ex.target_fn = function(x) {
	return x * x * (x - 0.6);
    } /*target_fn*/

    /* derivative f'(x) of target function */
    ex.target_deriv_fn = function(x) {
	return x * (3 * x - 1.2);
    } /*target_deriv_fn*/

    /* tangent to f(x0), evaluated at x 
     * this is the function f(x0) + (x - x0) * f'(x0)
     */
    ex.make_target_tangent_fn = function(x0) {
	var fx0 = ex.target_fn(x0);
	var dfx0 = ex.target_deriv_fn(x0);

	return function(x) { return fx0 + (x - x0) * dfx0; }
    } /*make_target_tangent_fn*/

    /* secant function through two points
     * point = {x,y}
     * pt1, pt2 :: point
     * return :: (number -> number)
     */
    ex.make_secant_fn = function(pt1, pt2)
    {
	/* secant function is
	 *         pt2.y - pt1.y
	 *     m = -------------
	 *         pt2.x - pt1.x
	 *
	 *   f(x) = pt1.y + m * (x - pt1.x)
	 */
	var m = (pt2.y - pt1.y) / (pt2.x - pt1.x);

	return function(x) { return pt1.y + m * (x - pt1.x); }
    } /*make_secant_fn*/

    /* minimum value for ex.dx */
    ex.min_dx = 0.05;
    /* small x-coord distance,  used to drive derivative approximation */
    ex.dx = 0.3;

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

    /* set x1,y1,x2,y2 attributes on an svg line object l,
     * (actually on d3 selection representing that object)
     * to pt1.x,pt1.y,pt2.x,pt2.y respectively
     */
    ex.svg_line_redraw = function(line, pt1, pt2)
    {
	line
	    .attr("x1", pt1.x)
	    .attr("y1", pt1.y)
	    .attr("x2", pt2.x)
	    .attr("y2", pt2.y);
    } /*svg_line_redraw*/

    /* set cx,cy attributes on an svg circle attribute c
     * (actually on d3 selection representing that object
     * to center_pt1.x, center_pt1.y)
     */
    ex.svg_circle_recenter = function(circle, center_pt)
    {
	circle
	    .attr("cx", center_pt.x)
	    .attr("cy", center_pt.y);
    } /*svg_circle_recenter*/

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
	var x_scale_fn = function(d) { return box_width/2 + d*150.0; }
	var y_scale_fn = function(d) { return box_height/2 + d*100.0; }
	/* map from screen coordinates */
	var x_unscale_fn = function(px) { return (px - box_width/2) / 150.0; }
	var y_unscale_fn = function(px) { return (px - box_height/2) / 100.0; }

	var scale_point = function(pt) { return {x: x_scale_fn(pt.x), y: y_scale_fn(pt.y)}; }
	var unscale_point = function(pt) { return {x: x_unscale_fn(pt.x), y: y_unscale_fn(pt.y)}; }

	var v = [];
	/* target function values at a set of points */
	var target_pt_v = [];
	var n_points = 90;
	for(var i=0; i<n_points; ++i) {
	    v[i] = (i - n_points/2) * (100.0 / n_points) / 20.0;
	    target_pt_v[i] = scale_point({x: v[i], y: ex.target_fn(v[i])});
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

	var tangent_fn = ex.make_target_tangent_fn(0.0);
	var secant_fn = ex.make_secant_fn({x: 0.0, y: ex.target_fn(0.0)},
					  {x: ex.dx, y: ex.target_fn(ex.dx)});

	var svg_line_create
	    = function(box, css_class, pt_v)
	{
	    return box.selectAll("." + css_class)
		.data(pt_v)
		.enter()
		.append("svg:line")
		.attr("class", css_class)
		.attr("x1", function(d) { return d.pt1.x; })
		.attr("y1", function(d) { return d.pt1.y; })
		.attr("x2", function(d) { return d.pt2.x; })
		.attr("y2", function(d) { return d.pt2.y; });
	} /*svg_line_create*/

	/* line for true derivative of ex.target_fn() 
	 * at selected point
	 */
	var dfx = svg_line_create(box, "dfxline",
				  [{pt1: scale_point(ex.eval_fn(tangent_fn, -10.0)),
				    pt2: scale_point(ex.eval_fn(tangent_fn, +10.0))}])
	    .attr("stroke", "gray")
	    .attr("stroke-width", 1);
	var fwd_diff_fx = svg_line_create(box, "fwdline",
					  [{pt1: scale_point(ex.eval_fn(secant_fn, -10.0)),
					    pt2: scale_point(ex.eval_fn(secant_fn, +10.0))}])
	    .attr("stroke", "orangered")
	    .attr("stroke-width", 1);

	var circle_lo = null;
	var circle_m = null;
	var circle_hi = null;
	
	var poly_find_perpendicular = function(target_pt, pt_v)
	{
	    var best_fn_pt_ix = ex.find_closest_ix(target_pt, pt_v);
	    if(best_fn_pt_ix == 0)
		best_fn_pt_ix = 1;
	    if(best_fn_pt_ix == n_points - 1)
		best_fn_pt_ix = n_points - 1;

	    var best_fn_pt0 = pt_v[best_fn_pt_ix - 1];
	    var best_fn_pt1 = pt_v[best_fn_pt_ix];
	    var best_fn_pt2 = pt_v[best_fn_pt_ix + 1];
	    //console.log("best_fn_pt_ix=", best_fn_pt_ix, ", best_fn_pt=", best_fn_pt);

	    var perp_pt0 = ex.find_perpendicular(target_pt, best_fn_pt0, best_fn_pt1, true /*clip_flag*/);
	    var perp_pt2 = ex.find_perpendicular(target_pt, best_fn_pt1, best_fn_pt2, true /*clip_flag*/);
	    /* choose best of perp_pt0, perp_pt2 (nearest to d3.event) */
	    var perp_pt = ex.find_closest(d3.event, [perp_pt0, perp_pt2]);

	    return perp_pt;
	} /*poly_find_perpendicular*/

	/* update secant function after changing state */
	var secant_fn_update = function()
	{
	    secant_fn = ex.make_secant_fn(ex.eval_fn(ex.target_fn, center.x),
					  ex.eval_fn(ex.target_fn, hi_x));
	} /*secant_fn_update*/

	/* update state after moving center point */
	var center_update = function(new_center_pt)
	{
	    center_pt = new_center_pt;
	    center = unscale_point(center_pt);
	    lo_x = center.x - ex.dx;
	    lo_pt = scale_point(ex.eval_fn(ex.target_fn, lo_x)); 
	    hi_x = center.x + ex.dx;
	    hi_pt = scale_point(ex.eval_fn(ex.target_fn, hi_x));
	    tangent_fn = ex.make_target_tangent_fn(center.x);
	    secant_fn_update();
	} /*center_update*/

	/* update state after moving lo point */
	var lo_update = function(new_lo_pt)
	{
	    lo_pt = new_lo_pt;
	    lo_x = unscale_point(lo_pt).x;
	    /* nudge center away from hi_x if necessary */
	    var center_moved = false;
	    if(center.x < lo_x + ex.min_dx) {
		center_moved = true;
		center = ex.eval_fn(ex.target_fn, lo_x + ex.min_dx);
		center_pt = scale_point(center);
	    }
	    /* new ex.dx - affects lo point */
	    ex.dx = center.x - lo_x;
	    //console.log("hi_update: hi_pt=", hi_pt, ", hi_x=", hi_x, ", center=", center, ", dx=", ex.dx);
	    hi_x = center.x + ex.dx;
	    hi_pt = scale_point(ex.eval_fn(ex.target_fn, hi_x));
	    if(center_moved) {
		tangent_fn = ex.make_target_tangent_fn(center.x);
	    }
	    /* secant moves, because hi_x changed.  doh! */
	    secant_fn_update();
	    //secant_fn = ex.make_secant_fn(ex.eval_fn(ex.target_fn, center.x), ex.eval_fn(ex.target_fn, hi_x));
	} /*lo_update*/

	/* update state after moving hi point */
	var hi_update = function(new_hi_pt)
	{
	    hi_pt = new_hi_pt;
	    hi_x = unscale_point(hi_pt).x;
	    /* nudge center away from hi_x if necessary */
	    var center_moved = false;
	    if(center.x > hi_x - ex.min_dx) {
		center_moved = true;
		center = ex.eval_fn(ex.target_fn, hi_x - ex.min_dx);
		center_pt = scale_point(center);
	    }
	    /* new ex.dx - affects lo point */
	    ex.dx = hi_x - center.x;
	    //console.log("hi_update: hi_pt=", hi_pt, ", hi_x=", hi_x, ", center=", center, ", dx=", ex.dx);
	    lo_x = center.x - ex.dx;
	    lo_pt = scale_point(ex.eval_fn(ex.target_fn, lo_x));
	    if(center_moved) {
		tangent_fn = ex.make_target_tangent_fn(center.x);
	    }
	    secant_fn_update();
	    //secant_fn = ex.make_secant_fn(ex.eval_fn(ex.target_fn, center.x), ex.eval_fn(ex.target_fn, hi_x));
	} /*hi_update*/

	/* redraw after moving center point */
	var center_redraw = function() {
	    /* line from center point to mouse coords */
	    ex.svg_line_redraw(cxn_line_center, center_pt, d3.event);
	    ex.svg_line_redraw(cxn_line_lo, lo_pt, d3.event);
	    ex.svg_line_redraw(cxn_line_hi, hi_pt, d3.event);
	    ex.svg_line_redraw(dfx,
			       scale_point(ex.eval_fn(tangent_fn, center.x - 10.0)),
			       scale_point(ex.eval_fn(tangent_fn, center.x + 10.0)));
	    ex.svg_line_redraw(fwd_diff_fx,
			       scale_point(ex.eval_fn(secant_fn, center.x - 10.0)),
			       scale_point(ex.eval_fn(secant_fn, center.x + 10.0)));
	    ex.svg_circle_recenter(circle_lo, lo_pt);
	    ex.svg_circle_recenter(circle_m, center_pt);
	    ex.svg_circle_recenter(circle_hi, hi_pt);
	} /*center_redraw*/

	/* three points where we'll measure differences */
	var center = ex.eval_fn(ex.target_fn, 0.0);
	var center_pt = scale_point(center);
	var lo_x = null;
	var lo_pt = null; 
	var hi_x = null;
	var hi_pt = null;

	/* tangent and secant functions involving central point */
	var tangent_fn = null;
	var secant_fn = null;

	/* establish initial values for lo_x, lo_pt, hi_x, hi_pt, tangent_fn, secant_fn */
	center_update(center_pt);

	/* drawing stuff -- these are d3 svg selections */
	var cxn_line_center = svg_line_create(box, "cxnline_center",
					      [{pt1: center_pt, pt2: center_pt}])
	    .attr("stroke", "lightgray")
	    .attr("stroke-width", 1)
	    .style("visibility", "hidden");
	var cxn_line_lo = svg_line_create(box, "cxnline_lo",
					  [{pt1: lo_pt, pt2: lo_pt}])
	    .attr("stroke", "lightgray")
	    .attr("stroke-width", 1)
	    .style("visibility", "hidden");
	var cxn_line_hi = svg_line_create(box, "cxnline_hi",
					  [{pt1: hi_pt, pt2: hi_pt}])
	    .attr("stroke", "lightgray")
	    .attr("stroke-width", 1)
	    .style("visibility", "hidden");

	var drag = d3.behavior.drag()
	    .on("dragstart",
		function() { /*cxn_line_center.style("visibility", "visible");*/ })
	    .on("drag",
		function()
		{
		    var perp_pt = poly_find_perpendicular(d3.event, target_pt_v);

		    center_update(perp_pt);
		    center_redraw();
		    cxn_line_center.style("visibility", "visible");
		})
	    .on("dragend",
		function() { cxn_line_center.style("visibility", "hidden"); });
	
	var drag_lo = d3.behavior.drag()
	    .on("dragstart",
		function() { /*cxn_line_lo.style("visibility", "visible");*/ })
	    .on("drag",
		function()
		{
		    var perp_pt = poly_find_perpendicular(d3.event, target_pt_v);

		    lo_update(perp_pt);
		    center_redraw();
		    cxn_line_lo.style("visibility", "visible"); 
		})
	    .on("dragend",
		function() { cxn_line_lo.style("visibility", "hidden"); });
	
	var drag_hi = d3.behavior.drag()
	    .on("dragstart",
		function() { /*cxn_line_hi.style("visibility", "visible");*/ })
	    .on("drag",
		function()
		{
		    var perp_pt = poly_find_perpendicular(d3.event, target_pt_v);

		    hi_update(perp_pt);
		    center_redraw();
		    cxn_line_hi.style("visibility", "visible");
		})
	    .on("dragend",
		function() { cxn_line_hi.style("visibility", "hidden"); });
	
	circle_lo = box.selectAll(".circle_lo")
	    .data([{x: x_scale_fn(-ex.dx), y: y_scale_fn(ex.target_fn(- ex.dx)), r: 4}])
	    .enter()
	    .append("svg:circle")
	    .attr("class", "circle_lo")
	    .attr("cx", function(d) { return d.x; })
	    .attr("cy", function(d) { return d.y; })
	    .attr("r", function(d) { return d.r; })
	    .call(drag_lo)
	    .style("stroke", "orangered")
	    .style("stroke-width", 2)
	    .style("fill", "orange");
	circle_m = box.selectAll(".circle_m")
	    .data([{x: x_scale_fn(0.0), y: y_scale_fn(ex.target_fn(0.0)), r: 4}])
	    .enter()
	    .append("svg:circle")
	    .attr("class", "circle_m")
	    .attr("cx", function(d) { return d.x; })
	    .attr("cy", function(d) { return d.y; })
	    .attr("r", function(d) { return d.r; })
	    .call(drag)
	    .style("stroke", "orangered")
	    .style("stroke-width", 2)
	    .style("fill", "orange");
	circle_hi = box.selectAll(".circle_hi")
	    .data([{x: x_scale_fn(+ex.dx), y: y_scale_fn(ex.target_fn(+ex.dx)), r: 4}])
	    .enter()
	    .append("svg:circle")
	    .attr("class", "circle_hi")
	    .attr("cx", function(d) { return d.x; })
	    .attr("cy", function(d) { return d.y; })
	    .attr("r", function(d) { return d.r; })
	    .call(drag_hi)
	    .style("stroke", "orangered")
	    .style("stroke-width", 2)
	    .style("fill", "orange");

	//console.log("w=", w, ",this=", this);
    }

    this.ex = ex;
}();
