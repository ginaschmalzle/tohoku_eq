// global variables
//*******************************************
var dataset = {};
var dataLength = 1;
var minute;
var isPlaying = false;
var earthquakes = [];
var width,height,canvas,c;
var needsUpdate = false;
//var startX=null;
//var startY=null;
var endX=null;
var endY=null;

var top_pad = 20;
var left_pad = 100;
var xscale;
var yscale;
var x2scale;
var y2scale;

var x2min = 5;
var x2max = 10;
var y2min = 4;
var y2max = 8;

// 0: for time vs. magnetude graphs
// 1: for depth vs. distance 
var state = 0;


// Radio Buttons
// The radio buttons 
// determine the 'state' of the graphs -- i.e., different plots 
// are displayed depending on if you choose one radio button or the
// other

var createRadioButtons = function(data){
	radio1 = document.getElementById('r1');
	radio2 = document.getElementById('r2');

	//console.log(dataset);
	radio1.onclick = function(e){

		if (document.getElementById('r1').checked) {

			state = 0;
	//		reDraw();
	//		colorBar();
		}
		else {
			state = 1;
		}
		reDraw(data);
		colorBar();
		drawGraph(data);
	//	resetSlider();
	};

	radio2.onclick = function(e){
		startX = null;
		startY = null;
		if (document.getElementById('r2').checked) {
			state = 1;
			alert("To use this feature choose two points on the map to define your profile, choose your profile width, which will plot earthquakes within that distance of the profile line.  Then press play!")
		}
		else {
			state = 0;
			reDraw();
			colorBar();
		}
		reDraw(data);
		colorBar();
		drawGraph(data);
	//	resetSlider();
	};

}


var createWidth = function(data){
	prof_width = document.getElementById('prof_width');
	//console.log("in CreateWidth");

	prof_width.onchange = function(data, minute){
		resetSlider();
		drawGraph(data);
		plotGraphAxes(filterData(data.earthquakes, minute, selector));
		//console.log("in CreateWidth onchange");
	};
}




// Function for drawing Canvas basemap
//*******************************************


// Load in Data Sets
// Old way

/* var loadData = function () {
	d3.json("topojapan.json",function(data){
		
		dataset.countries = data;
		if(isReady()) initMap(dataset);

	});

	d3.json("tohoku.json",function(data){

		dataset.earthquakes = data;
		if(isReady()) initMap(dataset);


	});

}  */


var loadData = function(fn, items, callback) {

  var itemResults = [];  

  var runFn = function(fn, item) {
  	fn(item, function(itemResult) {   //fn in this case is d3.json; item is file name, itemResult is the content.
  		done([item, itemResult]);  
  		//console.log ([item, itemResult]);  
  	});
  };


  var done = function(itemResult) {
    itemResults.push(itemResult);     /// itemResult is [ "file.json", "Obj"] where Obj is the contents
    //console.log(itemResult);         
    if (itemResults.length === items.length) {  // this if statement ensures that the callback only happens when the browser read the entire file
      callback(itemResults);   // callback is a function that is called when load data is called.
    }
  };
  
  for (var i = 0; i < items.length; i++) {    /// This is the meat of the program that calls runFn which calls done
    runFn(fn, items[i]);
  }
};




//This function draws and redraws the canvas map with background and country lines
var reDraw = function (data,path) {
	//console.log ("reDraw");
	//width = window.innerWidth;
	width = (window.innerWidth)/3;
	height = window.innerHeight;
	canvas = document.getElementById("myCanvas");
	form = document.getElementById("table");

	canvas.width = width;
	canvas.height = height;

	c = canvas.getContext("2d");

	projection = d3.geo.mercator().scale(1000).center([140.6917,35.689506]).translate([width/2,(height/2)-28]); // center on tokyo

	path = d3.geo.path().projection(projection).context(c);
	drawBackground();
	drawCountryLines(data.countries, path);


};

// Defines Background look
var drawBackground = function() {
	c.beginPath();
	c.fillStyle = "rgba(28,107,160,1)";
	c.fill();
	c.rect(0,0,width,height);
	c.fill();
	c.closePath();
}

// Draws country lines
var drawCountryLines = function(countries,path){
  	c.beginPath();
  	//console.log(countries);
    path(topojson.mesh(countries, countries.objects.japan));
  	c.strokeStyle = 'rgba(0,0,0,0.6)';	
	c.fillStyle = 'rgba(10,20,30,1)';
	c.fill();
  	c.lineWidth = '2';
	c.closePath();
  	c.stroke();
  	c.restore();
}

//Plot colorbar
var colorBar = function() {
	c.font="18px Georgia";
	c.fillText("Depth (km)",20,15);
	c.fillText("0",45,30);
	var barheight = 200;
	c.fillText("25",45,20+(barheight/2));
	c.fillText("50",45,20+barheight);

	var my_gradient=c.createLinearGradient(0,0,0,200);
	var maxHue = 100;
	var minHue = 0;
	for(var i = 0; i < 10; i++){
		var step = i/10;
		var thisHue = maxHue*step;
		my_gradient.addColorStop(step,"hsl("+thisHue+",100%,50%)");
		}
		c.fillStyle=my_gradient;
		c.fillRect(20,20,25,barheight);
}





// Functions for Drawing earthquakes on Canvas
//*****************************************************************

// Filter data by given time

var filterData = function(data, minute){

	var filteredData = data.filter(function(item,index,array){

		return Math.floor(item.properties.Time/60) === minute; 
	
	});

	return filteredData;
}


// Earthquake Circle maker -- defines color and size
var Earthquake = function(x,y,color,magnitude,depth,minute){
	this.x = x;
	this.y = y;
	this.color = color;
	this.magnitude = magnitude;
	this.depth = depth;
	this.opacity = 1;
	this.minute = minute;
}


// Defines earthquake color scale and its properties for the canvas map
var updateEarthquakes = function(data){

	var colorScale = d3.scale.linear();
	colorScale.domain([0,50]);
	colorScale.range([0,100]); // green to red (deepest)
	colorScale.clamp(true);
	
	var magScale = d3.scale.log();
	magScale.base(10);
	magScale.domain([minMag,maxMag]);
	magScale.range([1,30]);

	for(var i = 0; i < data.length; i++){

		var d = data[i].properties.Depth;
		var m = data[i].properties.Magnitude;
		var minute = Math.floor(data[i].properties.Time/60);

		var x = projection(data[i].geometry.coordinates)[0];  //longitude
		var y = projection(data[i].geometry.coordinates)[1];  //latitude
	
		var hueValue = colorScale(d);
		var color = d3.hsl(hueValue,1,0.5);

		// Define earthquake array


			earthquakes.push(new Earthquake(x,y,color.toString(),magScale(m)*2,d,minute));  

	}


}

// This function draws earthquakes as more transparent over time on the 
// canvas while the movie is playing.
// If the opacity is less than -.01 than push it to the trash.  
// 
// If the movie is NOT playing,  and the user is changing the play 
// time, the remove dots if the eq time does not equal the movie time. 


var drawEarthquakes = function(){

	var trash = [];

	var handleGarbage = function(eq){

		if(isPlaying){
			eq.opacity = eq.opacity * 0.95;
			eq.magnitude = eq.magnitude * 0.99;
		
		if(eq.opacity < 0.01){
			trash.push(i);
		}

		}
		else{
			if(eq.minute !== minute){
				trash.push(i);
			}
		}

	}



// Draw earthquakes to Canvas Map
	for(var i = 0; i < earthquakes.length; i++ ){

		var eq = earthquakes[i];


		c.save();
		c.globalAlpha = eq.opacity;
		c.beginPath();	
		c.arc(eq.x, eq.y, eq.magnitude, 0, 2 * Math.PI, false);
		c.strokeStyle = eq.color;
		c.fillStyle = eq.color;
		c.fill();
		c.closePath();
		c.stroke();
		c.restore();

		//Calculate opacity and remove if need be
		handleGarbage(eq);

	}

	for(var i = 0; i < trash.length; i++){
		// Add earthquakes to array
		earthquakes.splice(i, 1);
	}

}




// Functions for Drawing earthquakes on SVG Elements
//*****************************************************************


// Defines color and properties of plotted data for plotting onto the SVG div elements
var updateEarthquakesTable = function(data){

	var colorScale = d3.scale.linear();
	colorScale.domain([50,0]);
	colorScale.range([100,0]); // green to red (deepest)
	colorScale.clamp(true);
	
	var colorScale2 = d3.scale.linear();
	colorScale2.domain([10,4]);
	colorScale2.range([100,0]); // green to red (deepest)
	colorScale2.clamp(true);


	for(var i = 0; i < data.length; i++){

		var d = data[i].properties.Depth;
		var m = data[i].properties.Magnitude;
		var minute = Math.floor(data[i].properties.Time/60);


	
		var hueValue = colorScale(d);
		var color = d3.hsl(hueValue,1,0.5);

		var hueValue2 = colorScale2(m);
		var color2 = d3.hsl(hueValue2,1,0.5);
	
		if (state  === 0) {
			addPoint(color,data[i],"#mySVG");
			addPoint(color,data[i],"#mySVG2");
		}
		else {
			addPoint(color,data[i],"#mySVG");	
		}
	}


}

// Adds points on SVG elements
var addPoint = function (color,data,selector) {

	var svg = d3.select(selector);
	
	if (state === 0){


		var minute = Math.floor(data.properties.Time/60);
		var m = data.properties.Magnitude;
			
		if(selector === "#mySVG"){
			svg.append("circle")
				.attr("cx", xscale(minute/60))
				.attr("cy", yscale(parseFloat(m)))
				.attr("fill", color)
				.attr("r",5);
		}
		else {

			if (x2min < minute/60 && x2max > minute/60 && y2min < parseFloat(m) && y2max > parseFloat(m)) {
				svg.append("circle")
				.attr("cx", x2scale(minute/60))
				.attr("cy", y2scale(parseFloat(m)))
				.attr("fill", color)
				.attr("r",5);	
			}
		}
	}
	else {

		var depth = data.properties.Depth;
		var longitude = alpha*111;

			
		svg.append("circle")
			.attr("cx", xscale(longitude))
			.attr("cy", yscale(depth))
			.attr("fill", color)
			.attr("r",5);
	}
	
		
}

// Remove points from SVG elements
var RemovePoint = function (minute, selector) {
//	console.log(selector)
	hour = minute/60;
	var circles = $(selector);

	if (selector === "#mySVG>circle") {
		for(var i = 0; i < circles.length; i++){
	
			if (circles[i].getAttribute("cx") > xscale(hour))
				circles[i].parentNode.removeChild(circles[i]);
		}
	}
	else 
	{
		for(var i = 0; i < circles.length; i++){
	
			if (circles[i].getAttribute("cx") > x2scale(hour))
				circles[i].parentNode.removeChild(circles[i]);
		}
	} 
}



// Plots axes for graphs
var plotGraphAxes = function(data, endMag){

	var plotw = 600;
	var ploth = 300;


	var svg = d3.select(selector)
		.attr("width", plotw)
		.attr("height", ploth);


		if (state === 0){
			if (selector === '#mySVG'){
					xscale = d3.scale.linear().domain([0,24]).range([left_pad,plotw-top_pad]).clamp(true);
					yscale = d3.scale.linear().domain([10,3]).range([top_pad, ploth-top_pad*2]).clamp(true);

					var xAxis = d3.svg.axis().scale(xscale).orient("bottom")
						.ticks(10);

					var yAxis = d3.svg.axis().scale(yscale).orient("left");
			}
			else {


				x2scale = d3.scale.linear().domain([x2min,x2max]).range([left_pad,plotw-top_pad]).clamp(true);
	            y2scale = d3.scale.linear().domain([y2max,y2min]).range([top_pad, ploth-top_pad*2]).clamp(true);


	            var xAxis = d3.svg.axis().scale(x2scale).orient("bottom")
					.ticks(10);

				var yAxis = d3.svg.axis().scale(y2scale).orient("left");	
			}

			svg.append("text")
	    		.attr("x", plotw/1.8 )
	    		.attr("y", ploth - top_pad+15 )
	    		.style("text-anchor","middle")
				.text("Time referenced to UTC, March 11, 2011 (hours of day)");

			svg.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0, "+(ploth-2*top_pad)+")")
				.call(xAxis);

			svg.append("text")
				.attr("transform", "rotate(-90)")
				.attr("y", ploth/5.5)
				.attr("x",-left_pad*1.2)
				.attr("dy", "1em")
				.style("text-anchor","middle")
				.text("Magnitude");

			svg.append("g")
				.attr("class", "y axis")
				.attr("transform", "translate("+(left_pad)+",0)")
				.call(yAxis);
		}
		else{

			startcoord = projection.invert([startX,startY]);
			endcoord = projection.invert([endX,endY]);
			endMag = Math.sqrt(((endcoord[1]-startcoord[1])*(endcoord[1]-startcoord[1])) + ((endcoord[0]-startcoord[0])*(endcoord[0]-startcoord[0])) )
			//console.log (startX, startY, endX, endY, startcoord, endcoord, endMag);
			xscale = d3.scale.linear().domain([0,endMag*111]).range([left_pad,plotw-top_pad]).clamp(true);
			yscale = d3.scale.linear().domain([100,3]).range([top_pad, ploth-top_pad*2]).clamp(true);

			var xAxis = d3.svg.axis().scale(xscale).orient("bottom")
				.ticks(10);

			var yAxis = d3.svg.axis().scale(yscale).orient("left");
			
			svg.append("text")
	    		.attr("x", plotw/1.8 )
	    		.attr("y", ploth - top_pad+15 )
	    		.style("text-anchor","middle")
				.text("Degrees Longitude");

			svg.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0, "+(ploth-2*top_pad)+")")
				.call(xAxis);

			svg.append("text")
				.attr("transform", "rotate(-90)")
				.attr("y", ploth/5.5)
				.attr("x",-left_pad*1.2)
				.attr("dy", "1em")
				.style("text-anchor","middle")
				.text("Depth (km)");

			svg.append("g")
				.attr("class", "y axis")
				.attr("transform", "translate("+(left_pad)+",0)")
				.call(yAxis);
		}
}


// Removes axes and circles from SVG elements
var cleanGraph = function(selector){
	children = $(selector).children()
	for(var i = 0; i < children.length; i++){
		children[i].parentNode.removeChild(children[i]);
	}
}


//Calls cleanGraph, figures out what state you are in, then plots new axes on SVG elements
var drawGraph = function(data){
	// clean svgs
	cleanGraph('#mySVG');
	cleanGraph('#mySVG2'); 

	if (state === 0){
		/* if ($("#mySVG2").length === 0 ){

			rsvg=$("#SVGcontainer");
			svgContainer = rsvg[0];
			var svg = document.createElement('svg');
			svg.setAttribute("id","mySVG2");
			svgContainer.appendChild(svg);
		}*/
		selector = '#mySVG';
		plotGraphAxes(filterData(data.earthquakes, minute, selector));
		selector = '#mySVG2';
		plotGraphAxes(filterData(data.earthquakes, minute, selector));
	}
	else
	{
		 /*if ($("#mySVG2").length === 1 ){
			var rsvg=$("#mySVG2");
			console.log (rsvg);
			rsvg[0].parentNode.removeChild(rsvg[0]);
			} */
		
		selector = '#mySVG';
		//plotGraphAxes(filterData(dataset.earthquakes, minute, selector));

	
	}
}


// Functions for the Player
//*****************************************************************

// Set slider characteristics -- if user changes slider, stop it from playing.
// Set the min and max values, as will has the increment
var setSlider = function(){

	slider = document.getElementById("slider");

	slider.setAttribute("min",Math.floor(minSec/60));
	slider.setAttribute("max",Math.floor(maxSec/60));
	slider.setAttribute("value",Math.floor(minSec/60));
	
	slider.onchange = function(){
		//console.log("hi");
		isPlaying = false;
		needsUpdate = true;
		minute = parseInt(this.value);

		selector = "#mySVG>circle";
		RemovePoint(minute, selector);
		selector = "#mySVG2>circle";
		RemovePoint(minute, selector);
	}

}


var resetSlider = function(){

	slider = document.getElementById("slider");

	slider.setAttribute("min",Math.floor(minSec/60));
	slider.setAttribute("max",Math.floor(maxSec/60));
	slider.setAttribute("value",Math.floor(minSec/60));
	
	slider.value = 0;
	//console.log("hi");
	isPlaying = false;
	needsUpdate = false;
	minute = 0;

	selector = "#mySVG>circle";
	RemovePoint(minute, selector);

	

}



// Figure out what the play button is doing on click
// First define what the play button is from HTML file
// Define play and stop 
// If player is playing and button is clicked, then stop it
// else make it play.

var setButton = function(){

	var playbtn = document.getElementById("playbtn");

	playbtn.onclick = function(){

		minute = parseInt(slider.value);
		
		var play = function(){
			isPlaying = true;
			needsUpdate = true;
		}

		var stop = function(){
			isPlaying = false;
			needsUpdate = false;
		}

		if(isPlaying){stop()} else {play()};

	}

}



var updateTime = function(){

// This is a nice little formatting trick implemented by Ville.  It basically says that if either 
// the hour or minute floor has only 1 digit, then print one way, else, print the other way into a 
// string.  Time in the JSON file is represented in seconds of the day.

	var hourString = Math.floor(minute/60) > 9 ? Math.floor(minute/60) : "0"+Math.floor(minute/60);
	var minuteString = minute % 60 > 9 ? minute % 60 : "0"+minute % 60;

	document.getElementById("time").innerHTML = hourString + ":" + minuteString;

}


var handlePlayhead = function(){

	if(isPlaying){

			minute += 1;
			slider.value = minute;

		}

		if(slider.value >= Math.floor(maxSec/60) && isPlaying === true){
			isPlaying = false;
			minute = startMinute;
			slider.value = startMinute;
			needsUpdate = false;

		}
}

// This functions clears the canvas, redraws the background, country lines and the colorbar, 
// then if updates the earthquakes on the map as well as on the plots.  It updates the player
// and handles the play head.   
var animate = function(c,projection,path,data){

	var tick = function(){

		// don't update unless something has changed
		
		if(needsUpdate){


			c.clearRect(0,0,window.innerWidth,window.innerHeight);

			drawBackground();
			//console.log(data.countries);
			drawCountryLines(data.countries,path);
			colorBar();

			if (state === 0){
				updateEarthquakes(filterData(data.earthquakes,minute));
				//console.log("hi",filterData(data.earthquakes,minute));
				updateEarthquakesTable(filterData(data.earthquakes,minute));
			}


			else if (endX){
				drawDot(startX,startY);
				drawDot(endX,endY);
				drawLine(startX,startY,endX,endY);
				extractDots(startX,startY,endX,endY,filterData(data.earthquakes, minute));

			}
			drawEarthquakes();
			updateTime();
			handlePlayhead();
		}  

// The window.requestAnimationFrame() is a method that tells the browser you wish 
// to perform an animation and requests that the browser call a specified function 
// to update an animation before the next repaint.
		requestAnimationFrame(tick)

	} 

	requestAnimationFrame(tick);

}




// Functions for Drawing Transects
//*****************************************************************

// Draws dots for transects
var drawDot = function (dotx,doty) {
	console.log(dotx, doty);

	c.beginPath();	
	c.arc(dotx, doty, 10, 0, 2 * Math.PI, false);
	c.strokeStyle = "red";
	c.fillStyle = "red";
	c.fill();
	c.stroke();
	c.restore();
	c.closePath();
}

// Draws Transect lines
var drawLine = function (startX,startY,endX,endY){
		//Draw line
		c.moveTo(startX,startY);
		c.lineTo(endX, endY);
		c.strokeStyle = "red";
		c.lineWidth = 3;
		c.stroke();
}

// This function figures out are within the width value supplied by the user
var extractDots = function(startX,startY,endX,endY,data, minute){


	var prof_width = document.getElementById("prof_width").value;

	for(var i = 0; i < data.length; i++){

		dataX = data[i].geometry.coordinates[0];
		dataY = data[i].geometry.coordinates[1];
		minute = parseInt(data[i].properties.Time)/60
		pdataX = projection(data[i].geometry.coordinates)[0];
		pdataY = projection(data[i].geometry.coordinates)[1];



		theta = Math.atan((endcoord[1]-startcoord[1])/(endcoord[0]-startcoord[0]));
		phi = Math.atan((dataY-startcoord[1])/(dataX-startcoord[0]));
		fork = phi - theta; 

		Rmag = Math.sqrt(((dataY-startcoord[1])*(dataY-startcoord[1])) + ((dataX-startcoord[0]) * (dataX-startcoord[0])));
		dline = (Math.abs(Rmag * Math.sin(fork)))*111; 
		alpha = Rmag*Math.cos(fork);

		gamma = (90*(3.14159/180)) - theta;
		dpy = dline * Math.sin (gamma);
		dpx = dline * Math.cos (gamma);
		px = (dataX + dpx);
		py = (dataY + dpy);


		if (dline < prof_width){
		//  console.log(data, minute);
			updateEarthquakesTable(data, minute, endMag);
			updateEarthquakes(data,minute);
		}



	}


}


// Defines start and end dots of the transect line, the transect line, 
// or cleans them up if more than two points are clicked.
var drawUserDot = function(e, data){
	console.log('hi');
	console.log(e);
	var offset = 28;
	//console.log (data);
	if(startX === null && endX === null) {
	//	console.log(e.clientX, e.clientY);

		startX=e.clientX;
		startY=e.clientY-offset;
		//console.log("First Dot", startX, startY);	
		drawDot(startX,startY);


	}
	else if (startX !== null && endX === null) {
		
	// Draw 2nd Dot
		endX=e.clientX;
		endY=e.clientY-offset;

		//console.log(startX, startY, endX, endY);
		drawDot(endX,endY);
		drawLine(startX,startY,endX,endY);
		startcoord = projection.invert([startX,startY]);
		endcoord = projection.invert([endX,endY]);
		endMag = Math.sqrt(((endcoord[1]-startcoord[1])*(endcoord[1]-startcoord[1])) + ((endcoord[0]-startcoord[0])*(endcoord[0]-startcoord[0])) )
		plotGraphAxes(filterData(data.earthquakes, minute, selector));
		//plotGraphAxes(filterData(data.earthquakes, minute, selector, endMag));
		//extractDots(startX,startY,endX,endY,dataset.earthquakes,minute);
	}
	else {
	// Clear start and end points	
		cleanGraph('#mySVG');
		reDraw(data);
		colorBar();
		startX=e.clientX;
		startY=e.clientY-offset;
		drawDot(startX, startY);

		endX=null;
		endY=null;
	}
};



// Main Function 
//*****************************************************************


var initMap = function(data){
	//console.log(data);
// Draw canvas background and country lines
	reDraw(data);
	colorBar();

// Define some variables
	minMag = d3.min(data.earthquakes, function(d){
		return d.properties.Magnitude;
	});

	maxMag = d3.max(data.earthquakes, function(d){
		return d.properties.Magnitude;
	});

	maxSec = d3.max(data.earthquakes, function(d){
		return d.properties.Time;
	});

	minSec = d3.min(data.earthquakes, function(d){
		return d.properties.Time;
	});

// Project geographical coordinates into canvas coordinates for a mercator projection
	projection = d3.geo.mercator().scale(1000).center([140.6917,35.689506]).translate([width/2,(height/2)-28]); // center on tokyo

// draw lines wrt projection
	path = d3.geo.path().projection(projection).context(c);


// Draw svg graphs
	drawGraph(data);

	canvas.onclick = function(e){
		//console.log(e, data);
		if (state === 1) { 

			drawUserDot(e, data);

		}
	}

	//plotDepthvTime(filterData(data.earthquakes, minute));

//Define the Radio Button function 
	createRadioButtons(data);
	createWidth(data); 	



 // Initialize the player
	startMinute = Math.floor(minSec/60)-1;
	minute = startMinute;
	
	setSlider();
	setButton();
	
// Set up the animation
	//console.log(data);
	animate(c,projection,path,data);

	
}





var keys = function (dataset) {
	var keys = [];
	for (var i in dataset) {
		keys.push(i); 
	}

	return keys;
};


// On page load, load the Data 

window.onload = function () {
	var humanDataNames = {
		'tohoku.json': 'earthquakes',
		'topojapan.json': 'countries'
	};
	//console.log (dataset['tohoku.json']);
	var files = keys(humanDataNames);  /// keys(dataset)  == ["tohoku.json", "topojapan.json"] 

	loadData(d3.json, files, function (resultDataset) {      //resultDataset is an array of arrays where the first is the json file name, and the second is the data for both json files
		// console.log (resultDataset);
		var dataset = {};   /// Initialize new object 
		for (var i = 0; i < resultDataset.length; i++) {   //resultDataset is an array
			//console.log (resultDataset[i][0]);
			var humanDataName = humanDataNames[resultDataset[i][0]];   // call the value of the key value pair and name it humanDataName, so humanDataName = earthquakes or countries
			dataset[humanDataName] = resultDataset[i][1];  // assign humanDataName to the dataset
		}
	//	console.log(dataset);
		initMap(dataset);    // datset is noe an object where {earthquakes: Array, countries: object}
	});
};


// Define an isReady function that returns the data

var isReady = function(){

	return dataset.countries && dataset.earthquakes;
}
