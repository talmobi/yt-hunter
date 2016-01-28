var express = require('express');
var http = require('http');
var app = express();

var ytf = require('yt-filter');

app.use( express.static(__dirname + "/client") );

var requestLimiter = {};
var requestConcatinator = {};

app.get('/results', function (req, res) {
  var search_query = req.query.search_query;
  console.log("search_query :" + search_query);

  var filters = {
    min_duration: req.query.min_duration, // in seconds
    max_duration: req.query.max_duration, // in seconds
    include: req.query.include,
    exclude: req.query.exclude
  };

  ytf(search_query, filters, function (err, songs) {
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
      res.status(500).end("server error");
    }
  });
});

var port = 3000;
var server = http.createServer(app);
server.listen(port);
console.log("server listening on port: " + port);
