var express = require('express');
var http = require('http');
var app = express();

var songsonar = require('./api.js');

app.use( express.static(__dirname + "/client") );

app.get('/results', function (req, res) {
  var search_query = req.query.search_query;
  console.log("search_query : " + search_query);

  songsonar.search(search_query, function (list) {
    res.status(200).json(list).end();
  });
});

var port = 3000;
var server = http.createServer(app);
server.listen(port);
console.log("server listening on port: " + port);
