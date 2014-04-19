var keys = function (dataset) {
	var keys = [];
	for (var i in dataset) {
		keys.push(i); 
	}

	return keys;
};


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



var initMap = function(data){
	//console.log(data);
// Draw canvas background and country lines
	reDraw(data);
	colorBar();

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


