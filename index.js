var express = require('express');
var http = require('http');
var app = express();
var port = 3000;

var yts = require('./yt-search.js');

app.use(function (req, res, next) {
	console.log("new connection!");
	next();
});

app.use( express.static(__dirname + "/client") );

var requestLimiter = {};
var requestConcatinator = {};

app.get('/search', function (req, res) {
  var query = req.query;
  var search_query = query.search_query;

  console.log("search_query: " + search_query);

  yts(search_query, function (err, songs) {
    if (err) {
      return res.status(500).end();
    } else {
      res.status(200).json(songs).end();
    }
  });
});

var downloader = require('./downloader.js');

app.get('/download', function (req, res) {
  var ip = req.ip;
  requestConcatinator[ip] = requestConcatinator[ip] || {};

  if (false && requestConcatinator[ip].res) {
    try {
      console.log("closing duplicate request from same ip");
      requestConcatinator[ip].res.end();
    } catch (err) {
      console.log("error closing duplicate request from same ip");
    }
  };
  requestConcatinator[ip].res = res;
  requestConcatinator[ip].date = Date.now();

  var video_id = req.query.v;
  var name = req.query.name || video_id;
  console.log("downloading: " + video_id);
  downloader.getSong(video_id, function (err, data) {
    if (!err) {
      var res = requestConcatinator[ip].res;
      requestConcatinator[ip].res = null;
      if (!res) {
        console.log("duplicate callback, ignoring.");
        return;
      }
       res.set({
        'Content-disposition': 'attachment; filename="' + name + '".mp3',
        'Content-type': 'audio/mp3'
      });
      console.log("sending file");
      res.sendFile(data.song);
      console.log("done.");
    } else {
      var res = res || requestConcatinator[ip].res;
      res.status(500).end("server error");
    }
  });
});

var server = http.createServer(app);
server.listen(port);
console.log("server listening on port: " + port);
