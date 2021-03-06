// global variables

var dataset = {};
var dataLength = 1;
var minute;
var isPlaying = false;
var earthquakes = [];
var width,height,canvas,c;
var needsUpdate = true;




// Draw canvas background

var drawBackground = function() {
	c.beginPath();
	c.fillStyle = "rgba(28,107,160,1)";
	c.fill();
	c.rect(0,0,width,height);
	c.fill();
	c.closePath();
}

var drawCountryLines = function(data,path){

  	c.beginPath();
    path(topojson.mesh(data, data.objects.japan));
  	c.strokeStyle = 'rgba(0,0,0,0.6)';	
	c.fillStyle = 'rgba(10,20,30,1)';
	c.fill();
  	c.lineWidth = '2';
	c.closePath();
  	c.stroke();

}


// Filter data by given time

var filterData = function(data,minute){

	var filteredData = data.filter(function(item,index,array){

		return Math.floor(item.properties.Time/60) === minute; 
	
	});

	return filteredData;
}




// Earthquake constructor

var Earthquake = function(x,y,color,magnitude,depth,minute){
	this.x = x;
	this.y = y;
	this.color = color;
	this.magnitude = magnitude;
	this.depth = depth;
	this.opacity = 1;
	this.minute = minute;
}

var updateEarthquakes = function(data){

	var colorScale = d3.scale.linear();
	colorScale.domain([0,50]);
	colorScale.range([100,0]); // green to red (deepest)
	colorScale.clamp(true);
	
	var magScale = d3.scale.log();
	magScale.base(10);
	magScale.domain([minMag,maxMag]);
	magScale.range([1,30]);

	for(var i = 0; i < data.length; i++){

		var d = data[i].properties.Depth;
		var m = data[i].properties.Magnitude;
		var minute = Math.floor(data[i].properties.Time/60);

		var x = projection(data[i].geometry.coordinates)[0];
		var y = projection(data[i].geometry.coordinates)[1];
	
		var hueValue = colorScale(d);
		var color = d3.hsl(hueValue,1,0.5);

		earthquakes.push(new Earthquake(x,y,color.toString(),magScale(m)*2,d,minute));
		
	}


}

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
			if(Math.abs(eq.minute-minute) > 50){
				trash.push(i);
			}
		}

	}

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

		handleGarbage(eq);

	}

	for(var i = 0; i < trash.length; i++){
		earthquakes.splice(i, 1);
	}

}



      function getMousePos(canvas, evt) {
      	console.log(evt.clientX, evt.clientY);
      	drawDot();
		evt.preventDefault();

        return {
          x: evt.clientX,
          y: evt.clientY
       	};
       
      }

      drawDot = function (x,y) {
      	console.log("hi");
      	c.save();
      	c.globalAlpha =1;
      	c.beginPath();	
		c.arc(x, y, 50, 0, 2 * Math.PI, false);
		c.strokeStyle = "black";
		c.fillStyle = "white";
		c.stroke();
		c.fill();
		c.closePath();
	};

	drawDot2 = function () {
      	console.log("dot2");

  	c.beginPath();
    c.arc(500, 300, 50, 0, 2 * Math.PI, false);
  	c.strokeStyle = 'black';	
	c.fillStyle = 'white';
	c.fill();
  	c.lineWidth = '2';
	c.closePath();
  	c.stroke();

	};

var initMap = function(data){

	width = window.innerWidth;
	height = window.innerHeight;
	canvas = document.getElementById("myCanvas");

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

	canvas.width = width;
	canvas.height = height;


	c = canvas.getContext("2d");

	projection = d3.geo.mercator().scale(2000).center([139.6917,35.689506]).translate([width/2,height/2]); // center on tokyo

	path = d3.geo.path().projection(projection).context(c);
	
	drawDot2();


      canvas.addEventListener('mousedown', function(evt) {
        var mousePos = getMousePos(canvas, evt);
      }, false);



 	canvas.onclick = function(e){
   		transect(e, data, path);
  	};

	startMinute = Math.floor(minSec/60)-1;
	minute = startMinute;
	
	setSlider();
	setButton();
	
	animate(c,projection,path,data);
	
}

var setSlider = function(){

	slider = document.getElementById("slider");

	slider.setAttribute("min",Math.floor(minSec/60));
	slider.setAttribute("max",Math.floor(maxSec/60));
	slider.setAttribute("value",Math.floor(minSec/60));
	
	slider.onchange = function(){

		isPlaying = false;
		needsUpdate = true;
		minute = parseInt(this.value);
		
	}

}

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

	var hourString = Math.floor(minute/60) > 9 ? Math.floor(minute/60) : "0"+Math.floor(minute/60);
	var minuteString = minute % 60 > 9 ? minute % 60 : "0"+minute % 60;

	document.getElementById("time").innerHTML = hourString + ":" + minuteString;

}

var animate = function(c,projection,path,data){

	var tick = function(){

		// don't update unless something has changed
		
		if(needsUpdate){

		c.clearRect(0,0,window.innerWidth,window.innerHeight);

		drawBackground();
		drawCountryLines(data.countries,path);
		updateEarthquakes(filterData(data.earthquakes,minute));
		drawEarthquakes();
		updateTime();
		handlePlayhead();

		
		}

		requestAnimationFrame(tick)

	}

	requestAnimationFrame(tick);

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






function transect(e, data, path) {

	var mapclick = {
    startLatlng: null,
    endLatlng: null,
    currentLine: null,
    allArray: []
	};

	
    if (mapclick.currentLine) {
        c.removeLayer(mapclick.currentLine);
        c.removeLayer(mapclick.startLatlng1);
        c.removeLayer(mapclick.startLatlng2);
        mapclick.startLatlng = null;
        mapclick.endLatlng = null;
        mapclick.currentLine = null;
        mapclick.startLatlng1 = null;
        mapclick.startLatlng2 = null;
        $(mapclick.allArray).each(function () {
            c.removeLayer(this);
        });
    }
    /*if (mapclick.endLatlng === null && mapclick.startLatlng !== null) {
		mapclick.startLatlng = 1;
		c.beginPath();	
		c.arc(e.latlng , 5, 0, 2 * Math.PI, false);
		c.strokeStyle = "black";
		c.fillStyle = "black";
		c.fill();
		c.closePath();
		c.stroke();
		c.save();
		console.log("Click 2")
		//c.restore();
		}

    else */if (mapclick.startLatlng === null && mapclick.endLatlng === null) {
        	

			c.beginPath();	
			c.arc(0, 0, 10000, 0, 2 * Math.PI, false);
			c.strokeStyle = "white";
			c.stroke();
			c.fillStyle = "white";
			c.fill();
			c.save();
			c.globalAlpha = 1;
			c.closePath();
			//console.log("Click 1");
			mapclick.currentLine = [0,0];
        /*mapclick.currentLine = L.polyline([
            [mapclick.startLatlng.lat, mapclick.startLatlng.lng],
            [mapclick.endLatlng.lat, mapclick.endLatlng.lng]
        ], {
            color: 'green',
            weight: 5
        }).addTo(c);*/
    }
   }; 



window.onload = function(){

d3.json("topojapan.json",function(data){
		
		dataset.countries = data;
		if(isReady()) initMap(dataset);

});

d3.json("tohoku.json",function(data){

		dataset.earthquakes = data;
		if(isReady()) initMap(dataset);
});


}

var isReady = function(){

	return dataset.countries && dataset.earthquakes;
}
