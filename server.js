var express = require('express');
var app = express();
var path = require('path');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var GoogleMapsAPI = require('googlemaps');
app.use(express.static('.'));

var Twitter = require('twitter');

//maybe make these like
//not plain text lol
//what like env variables? 
//oh good idea
//TODO: that before you push
var client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_SECRET
});

var publicConfig = {
  key: process.env.MAPS_KEY,
  encode_polylines:   false,
  secure:             true, // use https
};
var gmAPI = new GoogleMapsAPI(publicConfig);

io.on('connection', function(socket){
	
	
  var trackby = "cubs";
  var inaccurate = false;
	
  var stream;
  stream = setup(stream, trackby, inaccurate);
  
  socket.on('set', function(msg){
    trackby = msg;
	console.log(msg);
	stream.destroy();
	stream = setup(stream, trackby, inaccurate);
  });
  
  socket.on('acc', function(check) {
	inaccurate=check; 
	stream.destroy();
	stream = setup(stream, trackby, inaccurate);
  });
  
});
 
function setup(stream, trackby, inaccurate) {
	stream = client.stream('statuses/filter', {track: trackby});
    stream.on('data', function(event) {
    //console.log(event && event.text);
    //console.log(event.user.location);
    //event.user.location gives a very low fidelity user input loc
    //event.place gives a boudning box
	//event.coordinates gives the best, so start with that
	//io.emit('tweet', event.text);
	if(event.coordinates) {
		console.log(event.coordinates);
		io.emit('tweet', [event.coordinates.coordinates[1], event.coordinates.coordinates[0], event.text]);
	}
	else if(event.place!=null) {
		//console.log(event);
		var geocodeParams = {
		  "address":    event.place.full_name,
		  "components": "components=country"+event.place.country_code,
		  "language":   "en",
		};

		gmAPI.geocode(geocodeParams, function(err, result){
		  //console.log(result);
		  //console.log(result.results[0].geometry);
		  if(result && result.results.length!=0) {
			//console.log(result.results[0].geometry, "two");
			loc = result.results[0].geometry.location
			console.log(loc.lat,loc.lng);
			io.emit('tweet', [loc.lat,loc.lng,event.text]);
		  }
		});
	}
	else if(inaccurate && event.user && event.user.location!=null) {
		var geocodeParams = {
		  "address":    event.user.location,
		};

		gmAPI.geocode(geocodeParams, function(err, result){
		  console.log(result);
		  if(result && result.results.length!=0) {
			//console.log(result.results[0].geometry, "three");
			loc = result.results[0].geometry.location
			console.log(loc.lat,loc.lng);
			io.emit('tweet', [loc.lat,loc.lng,event.text]);		  }
		});
	}
  });
  stream.on('error', function(error) {
	console.log(error)
	throw error;
  });
  return stream;
	
}


// viewed at http://localhost:8080
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});

http.listen(8080, "127.0.0.1");