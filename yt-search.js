var cheerio = require('cheerio');
var request = require('request');

var yt_search_query_uri =  "https://www.youtube.com/results?search_query=";

var async = require('async');

// settings
var _opts = {
  min_results: 80,
  min_requests: 3,
  max_requests: 8,
  ignore_playlists: true,
  ignore_accounts: true,
  only_videos: true,
};

//var console = {
//  log: function (str) {
//    return;
//  }
//};

/**
 * Provide custom search options.
 */
function opts (opts) {
  for (key in opts) {
    _opts[key] = opts[key];
  };
};

/**
 * 
 */
function search (query, done) {
  console.log("query: " + query);
  var response = null;

  var q = query.split(/\s+/);
  var url = yt_search_query_uri + q.join('+');

  var found_videos_bucket = {};

  // page number (youtube seach query parameter)
  var page = 1;
  var page_limit = 5;

  var error = null;

  var fns = [];
  for (var i = 1; i < page_limit; i++) {
    fns.push(
      (function () {
        var pageNumber = i;
        return function (callback) {
          findVideos(url, pageNumber, function (err, videos) {
            if (err) {
              error = new Error('error in findVideos');
            } else {
              // can filter videos here (shouldSkip function)
              found_videos_bucket['page-' + pageNumber] = videos;
            }
            callback(err);
          });
        }
      })()
    );
  };

  async.parallel(fns, function () {
    var videos = [];
    for (var i = 1; i < page_limit; i++) {
      var key = 'page-' + i;
      videos = videos.concat( found_videos_bucket[key] );
    }

    console.log("async query completed ["+page_limit+"], found: " + videos.length + " songs");
    done(error, videos);
  });
}

function findVideos(url, page, done) {
  url += "&page=" + page;
  //console.log("finding songs from: " + url);

  request(url, function (err, res, body) {
    if (err) {
      done(err);
    } else {
      parseResponse(body, done);
    }
  });
};

function shouldSkip (video) {

  var ignore_playlists = _opts.ignore_playlists && video.url.indexOf('list') >= 0;
  var ignore_accounts = _opts.ignore_accounts && video.url.indexOf('user') >= 0;
  var only_videos = !(_opts.only_videos && video.url.indexOf('watch') >= 0);

  var duration = video.duration.seconds || video.duration;
  var title = video.title.toUpperCase();

  //var excludes = false;
  //if (filters.exclude.length > 0) {
  //  excludes = !!filters.exclude.find(function (val, ind, arr) {
  //    var str = val.toUpperCase();
  //    return title.indexOf(str) >= 0;
  //  });
  //}

  /* this is an && find, meaning that they ALL have to match simultaneously
   * (not very useful actually)
   var includes = filters.include.every(function (val, ind, arr) {
   var str = val.toUpperCase();
   return title.indexOf(str) >= 0;
   });
   */

  // this is an || find, meaning only one of them has to match, which makes much more sense
  //var includes = false;
  //if (filters.include.length > 0) {
  //  includes = !filters.include.find(function (val, ind, arr) {
  //    var str = val.toUpperCase();
  //    return title.indexOf(str) >= 0;
  //  });
  //}

  return (only_videos || ignore_playlists || ignore_accounts);
};

// parse the plain text response body with jsom to pin point song information
function parseResponse (responseText, done) {
  //var _time = Date.now();
  $ = cheerio.load(responseText);
  //var _delta = Date.now() - _time;
  //console.log("parsing response with cheerio, took: " + _delta + " ms");
  var titles = $('.yt-lockup-title');
  //console.log("titles length: " + titles.length);
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

    songs.push(song);
  };

  //console.log(songs[0]);

  done(null, songs);

  /* using cheerio instead of jsdom (about 8x faster)
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

// exports
module.exports = function (query, filters, done) {
  search(query, filters, done);
};
module.exports.opts = opts;
module.exports.search = search;
