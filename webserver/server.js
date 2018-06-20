var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var SonyCamera = require("../index.js");

var redis = require("redis");
var sub = redis.createClient();

var cam = new SonyCamera();

cam.on('update', function(param, value) {
	io.emit('update', param, value);
});
cam.on('liveviewJpeg', function(image) {
	if(image) io.emit('image', image.toString('base64'));
});

cam.connect();

app.get('/', function(req, res){
  res.sendFile(__dirname + '/static/index.html');
});
app.get('/jquery.js', function(req, res){
  res.sendFile(__dirname + '/static/jquery.js');
});

io.on('connection', function(socket){
  io.emit('params', cam.params);
  socket.on('capture', function(){
  	cam.capture(true, function(err, name, image) {
  		if(err) {
  			return io.emit("status", "Error: " + err);
  		}
  		if(image) io.emit('image', image.toString('base64'));
  		if(name && !image) io.emit('status', "new photo: " + name);
  	});
  });
  socket.on('startViewfinder', function(){
  	console.log("starting liveview");
  	cam.startViewfinder();
  });
  socket.on('stopViewfinder', function(){
  	cam.stopViewfinder();
  });
  socket.on('set', function(param, value){
  	cam.set(param, value);
  });
    socket.on('halfPress', function(param, value){
    cam.halfPressShutter(function(){
        setTimeout(function(){
            cam.capture(true, function(err, name, image) {
                if(err) {
                    return io.emit("status", "Error: " + err);
                }
                if(image) io.emit('image', image.toString('base64'));
                if(name && !image) io.emit('status', "new photo: " + name);
            });
        },1500);
    });
    });

});


sub.on("message", function (channel, msg) {
    if(channel=="c_connect"){
        console.log("connect camera here");
        cam.connect();
    }
    else if(channel=="c_disconnect"){
        console.log("disconnect");
        cam.disconnect();
    }
    else if(channel=="c_zoomin"){
        console.log("zoom in");
        cam.zoomIn();
    }
    else if(channel=="c_zoomout"){
        console.log("zoom out");
        cam.zoomOut();
    }
    else if(channel=="c_capture"){
        console.log("capture for id:" + msg);
        cam.capture(true, function(err, name, image) {
            if(err) {
                //return io.emit("status", "Error: " + err);
                console.log('error when capture');
            }
            if(image)
            {
                //io.emit('image', image.toString('base64'));

            }
            if(name && !image)
            {
                // io.emit('status', "new photo: " + name);
                console.log(name);
            }
        });
    }
    else{
    }

});
sub.subscribe("c_connect");
sub.subscribe("c_disconnect");
sub.subscribe("c_capture");
sub.subscribe("c_zoomin");
sub.subscribe("c_zoomout");


http.listen(4000, function(){
  console.log('listening on *:4000');
});