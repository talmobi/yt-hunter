var https = require('https');
var jsdom = require('jsdom');

var yt_search_query = "https://www.youtube.com/results?search_query=";

function search (query, done) {
  var q = query.split(" ");
  var url = yt_search_query + q.join('+');
  // + "&page=2";
  var req = https.request(url, function (res) {
    console.log("statusCode: " + res.statusCode);

    var responseText = "";
    res.on('data', function (chunk) {
      responseText += chunk;
    });
    res.on('end', function () {
      parseResponse( responseText, done );
    });
  });
  req.end(); // send request
}

function parseResponse (responseText, done) {
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
          duration.seconds < 10 ||
          duration.seconds > (60 * 12))
        continue; // skip playlist and short sounds

      list.push({
        title: a.innerHTML,
        duration: duration,
        url: a.href
      });
    }

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
