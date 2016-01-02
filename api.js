var https = require('https');
var jsdom = require('jsdom');

var yt_search_query = "https://www.youtube.com/results?search_query=";

var filters = {
  min_length: 10, // in seconds
  max_length: 60 * 7, // in seconds
};
var min_songs = 10;

function search (query, done) {
  var response = null;

  var q = query.split(" ");
  var url = yt_search_query + q.join('+');

  var songs = [];
  var max_loops = 5;

  var page = 1;
  var loops = 0;

  var next = function (page) {
    console.log("next called ["+loops+"]");
    loops++;

    findSongs(url, page, function (list) {
      console.log("found " + list.length + " songs.");
      songs = songs.concat(list);

      if (songs.length < min_songs && list.length > 0 && loops < max_loops) {
        console.log("minimum number of songs not found -> doing another request");
        next(page + 1);
      } else {
        // finish the search and return the found songs
        console.log("number of total songs found: " + songs.length);
        return done(songs);
      }
    });
  };
  next(page);

}

function findSongs(url, page, done) {
  console.log("finding songs");

  page = page || 1
  url += "&page=" + page;

  console.log("url: " + url);
  var req = https.request(url, function (res) {
    console.log("http request established...");
    console.log("statusCode: " + res.statusCode);

    var responseText = "";
    res.on('data', function (chunk) {
      responseText += chunk;
    });
    res.on('end', function () {
      console.log("http request done!");
      parseResponse( responseText, done );
    });
  });
  req.end(); // send the request
};

function parseResponse (responseText, done) {
  console.log("parsing response");
  jsdom.env(responseText, function (err, window) {
    var document = window.document;

    if (err) {
      return console.log("Error parsing responseText with jsdom");
    }

    var list = [];

    var titles = document.getElementsByClassName('yt-lockup-title');
    for (var i = 0; i < titles.length; i++) {
      var title = titles[i];
      var a = title.getElementsByTagName('a')[0];
      var span = title.getElementsByTagName('span')[0];

      var duration = parseDuration( span.innerHTML );

      //console.log(a.innerHTML + " : " + duration);
      //console.log("---------------");

      if (a.href.indexOf('list') >= 0 ||
          duration.seconds < filters.min_length ||
          duration.seconds > (filters.max_length))
        continue; // skip playlist and short sounds

      list.push({
        title: a.innerHTML,
        duration: duration,
        url: a.href
      });
    }

    console.log("parsing done");
    done(list);
  });
};

function parseDuration (timestampText) {
  var a = timestampText.split(" ");
  var timestamp =  a[a.length - 1].replace(/[^:\d]/g,'');

  var t = timestamp.split(":");

  var seconds = 0;
  var exp = 0;
  for (var i = t.length - 1; i >= 0; i--) {
    if (t[i].length <= 0) continue;
    var number = t[i].replace(/\D/g,'');
    //var exp = (t.length - 1) - i;
    seconds += parseInt( number ) * (exp > 0 ? Math.pow(60, exp) : 1);
    exp++;
    if (exp > 2) break;
  };

  return {
    toString: function () { return seconds + " seconds (" + timestamp + ")" },
    seconds: seconds,
    timestamp: timestamp
  };
};

function listSearch (query) {
  console.log("doing list search");
  search(query, function (list) {
    for (var i = 0; i < list.length; i++) {
      var song = list[i];
      console.log(song.title + " : " + song.duration);
      console.log("---------------");
    }
  });
};

// test
//listSearch("ccr");

module.exports = {
  search: search
};
