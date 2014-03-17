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

var drawdots = function(){

	

		c.save();
		c.globalAlpha = 1;
		c.beginPath();	
		c.arc(139.6917,35.689506, 10, 0, 2 * Math.PI, false);
		c.strokeStyle = "white";
		c.stroke();
		c.fillStyle = "white";
		c.fill();
		c.closePath();
		c.stroke();



	}









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
	



 	canvas.onclick = function(e){
   		drawdots();
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
