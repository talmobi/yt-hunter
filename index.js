var express = require('express');
var http = require('http');
var app = express();
var port = 3000;

var bodyParser = require('body-parser');
var ytf = require('yt-filter');

app.use( express.static(__dirname + "/client") );
app.use(bodyParser.json());

var requestLimiter = {};
var requestConcatinator = {};

app.post('/search', function (req, res) {
  var data = req.body;
  console.log("search:" + data.query);

  var search_query = data.query;
  var filters = data.filters || {};

  console.log("search_query: " + search_query);
  console.log("filters: ");
  console.log(filters);

  /*
  var filters = {
    min_duration: json.filters.min_duration, // in seconds
    max_duration: json.filters.max_duration, // in seconds
    include: json.filters.include,
    exclude: json.filters.exclude
  };
  */

  ytf(search_query, filters, function (err, songs) {
    if (err) {
      return res.status(500).end();
    } else {
      res.status(200).json(songs).end();
    }
  });
});

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

var server = http.createServer(app);
server.listen(port);
console.log("server listening on port: " + port);
