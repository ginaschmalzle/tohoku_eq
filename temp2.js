// global variables

var dataset = {};
var dataLength = 1;
var minute;
var isPlaying = false;
var earthquakes = [];
var width,height,canvas,c;
var needsUpdate = true;

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

var drawDot = function(data,path){

		c.beginPath();	
		c.arc(500, 200, 10, 0, 2 * Math.PI, false);
		c.strokeStyle = "red";
		c.fillStyle = "red";
		c.fill();
		c.stroke();
		c.closePath();
		
}


var initMap = function(data){
	width = window.innerWidth;
	height = window.innerHeight;
	canvas = document.getElementById("myCanvas");
	canvas.width = width;
	canvas.height = height;

	c = canvas.getContext("2d");

	projection = d3.geo.mercator().scale(2000).center([139.6917,35.689506]).translate([width/2,height/2]); // center on tokyo

	path = d3.geo.path().projection(projection).context(c);
	

		drawCountryLines(data.countries,path);
		drawDot();

	};


window.onload = function(){

d3.json("topojapan.json",function(data){
		
		dataset.countries = data;
		if(isReady()) initMap(dataset);

});


var isReady = function(){

	return dataset.countries ;
}
};



