var https = require('https');
var cheerio = require('cheerio');
var jsdom = require('jsdom');
var request = require('request');

var GLOBAL = {
  filters: {
    min_song_duration: 10, // in seconds
    max_song_duration: 60 * 7, // in seconds
    include: ['theme'],
    exclude: ['super'],
  },
  yt_search_query:  "https://www.youtube.com/results?search_query="
};

var min_songs = 10;
var max_songs = 30;

function search (query, done) {
  console.log("query: " + query);
  var response = null;

  var q = query.split(/\s+/);
  var url = GLOBAL.yt_search_query + q.join('+');

  var songs = []; // found songs
  var max_loops = 5; // max amount of recursive calls
  var loops = 0;

  // page number (youtube seach query parameter)
  var page = 1;

  var next = function (page) {
    console.log("next called ["+loops+"]");
    loops++;

    findSongs(url, page, function (err, list) {
      if (err) {
        return done(err);
      } else {
        console.log("found " + list.length + " songs.");
        songs = songs.concat(list);

        if (songs.length < min_songs && list.length > 0 && loops < max_loops) {
          console.log("minimum number of songs not found -> doing another request");
          // call the function recursively until max recursive calls are reached
          // or we've a minimum required amount of songs
          next(page + 1);
        } else {
          // finish the search and return the found songs
          console.log("number of total songs found: " + songs.length);
          return done(null, songs);
        }
      }
    });
  };
  next(page);

}

function findSongs(url, page, done) {
  console.log("finding songs from: " + url);

  page = page || 1
  url += "&page=" + page;

  request(url, function (err, res, body) {
    if (err) {
      done(err);
    } else {
      parseResponse(body, done);
    }
  });
};

function shouldSkipSong (song, filters) {
  var filters = filters || GLOBAL.filters;

  var duration = song.duration.seconds || song.duration;
  var title = song.title.toUpperCase();

  var exclude = filters.exclude.find(function (val, ind, arr) {
    var str = val.toUpperCase();
    return title.indexOf(str) >= 0;
  });

  var include = !filters.include.every(function (val, ind, arr) {
    var str = val.toUpperCase();
    return title.indexOf(str) >= 0;
  });

  console.log("exclude: " + exclude);
  console.log("include: " + include);

  return (
    duration < filters.min_song_duration ||
    duration > filters.max_song_duration ||
    exclude || include
  );
};

// parse the plain text response body with jsom to pin point song information
function parseResponse (responseText, done) {
  console.log("parsing response with cheerio");

  $ = cheerio.load(responseText);

  var titles = $('.yt-lockup-title');

  console.log("titles length: " + titles.length);

  var songs = [];

  for (var i = 0; i < titles.length; i++) {
    var title = titles[i];

    var a = $('a', title);
    var span = $('span', title);
    var duration = parseDuration( span.text() );

    var href = a.attr('href');

    var song = {
      title: a.text(),
      url: href,
      duration: duration
    };

    // filter songs
    if (href.indexOf('list') >= 0 || // skip playlists
        shouldSkipSong( song )
       ) {
      // continue the loop and skip this song
      console.log("skipping song: " + song.title);
      continue;
    }

    songs.push(song);
  };

  console.log(songs[0]);

  done(null, songs);

  /*
  jsdom.env(responseText, function (err, window) {
    var document = window.document;

    if (err) {
      return done(err);
    }

    var list = [];

    var titles = document.getElementsByClassName('yt-lockup-title');
    for (var i = 0; i < titles.length; i++) {
      var title = titles[i];

      var a = title.getElementsByTagName('a')[0];
      var span = title.getElementsByTagName('span')[0];

      var duration = parseDuration( span.innerHTML );

      var song = {
        title: a.innerHTML,
        duration: duration,
        url: a.href
      };

      // filter songs
      if (a.href.indexOf('list') >= 0 || // skip playlists
          shouldSkipSong( song )
         ) {
        //console.log("skipped song: " + song.title);
        continue;
      }

      list.push(song);
    }

    console.log("parsing done");
    done(null, list);
  });
  */
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

module.exports = {
  search: search,
};
