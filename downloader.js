var ytdl = require('ytdl-core');
var fs = require('fs');

var url_template = "https://www.youtube.com/watch?v=";

var __video_directory = __dirname + "/videos/";
var __song_directory = __dirname + "/songs/";

var Store = require('jfs');
var db = new Store('data', {type: 'single', saveId: true});
if (!fs.existsSync(__video_directory)) {
  fs.mkdirSync(__video_directory);
}

if (!fs.existsSync(__song_directory)) {
  fs.mkdirSync(__song_directory);
}

var cache = {};
var progress = {};

var timeout_seconds = 1000 * 60 * 1;

function StatMessage (data) {
  var obj = {};
  Object.assign(obj, data);
  return obj;
};

function download (video_id, done) {
  var _source = __video_directory + video_id + ".mp4";
  var _destination = __song_directory + video_id + ".mp3";

  if (fs.existsSync( _destination )) {
    return done(null, {
      video_id: video_id,
      video: _source,
      song: _destination
    });
  };

  if (cache[video_id]) {
    // song is already cached
    console.log("responding from cache");
    done(null, cache[video_id].data);
    return;
  }

  var timeout = setTimeout(function () {
    if (!progress[video_id].data) {
      console.log("download timed out, no data set: " + video_id);
      delete progress[video_id];
      done("download timed out", null);
    } else {
      // do nothing
      console.log("download timed out: " + video_id + ", but data was already set");
    }
  }, timeout_seconds); // timeout after 1 minute

  if (progress[video_id]) {
    // that video is already downloading
    // add the callback to its queue, create the queue if it doesn't exist
    progress[video_id] = progress[video_id] || {};
    progress[video_id].queue = progress[video_id].queue || [];

    if (progress[video_id].data) {
      // cache should be set so we shouldn't get here
      console.log("warning: Cache is not working - reached already finished progress queue");
      return done(null, data);
    }

    progress[video_id].queue.push(function () {
      try {
        clearTimeout(progress[video_id].timeout);
        done(null, progress[video_id].data);
        console.log("timeout cleared and progress queue callback completed.");
      } catch (err) {
        console.log("error in running progress callback: " + err);
        done(err, null);
      }
    });
    var size = progress[video_id].queue.length;
    console.log("added request for [$1] into queue [$2]"
                .replace('$1', video_id).replace('$2', size));
    return;
  };

  // build the initial progress object
  progress[video_id] = {
    timeout: timeout,
    data: null,
    queue: [function () {
      try {
        clearTimeout(progress[video_id].timeout);
        done(null, progress[video_id].data);
        console.log("timeout cleared and progress queue callback completed.");
      } catch (err) {
        console.log("error in running progress callback: " + err);
        done(err, null);
      }
    }]
  };

  var destination = __video_directory + video_id + ".mp4";

  console.log("downloading youtube video...");
  ytdl( url_template + video_id )
    .pipe(fs.createWriteStream( destination ))
    .on('error', function (err) {
      progress[video_id] = null;
      clearTimeout(timeout);
      done(err, null)
    })
    .on('info', function (info) {
      console.log(">>>>>>>>>>>>> got video info <<<<<<<<<<<<<<<<<<");
    })
    .on('finish', function () {
      console.log("download finished.");
      convert( video_id, done );
    })
};

var conversionTable = {};

function convert (video_id, done) {
  if (conversionTable[video_id]) {
    return console.log("conversion already in progress - abort ["+ video_id+"]");
  };
  conversionTable[video_id] = {
    video_id: video_id
  };

  var source = __video_directory + video_id + ".mp4";
  console.log("converting video: " + source);

  var destination = __song_directory + video_id + ".mp3";
  var exec = require('child_process').exec;

  var conversionComplete = false;
  //var command = "ffmpeg -i " + source + " " + destination + " -y";
  var command = "avconv -i " + source + " -vn " + destination + " -y";

  var getSize = function () {
    fs.stat(destination, function (err, stats) {
      var fileSize;
      if (err) {
        //console.log(err);
      } else {
        fileSize = stats["size"];
        var kb = (fileSize / 1000) | 0;
        console.log( "kb: " + kb );
      }

      if (!conversionComplete) {
        setTimeout(getSize, 400);
      } else {
        var sourceSize = fs.statSync(source)["size"];
        var rate = ((fileSize / sourceSize) * 100) | 0;
        console.log("converstion rate: " + rate + " %");
      }
    });
  };
  getSize();

  var child = exec(command, function (err, stdout, stderr) {
    conversionComplete = true;
    if (err != null) {
      console.log("error converting video: " + source);
      done(err, null);
    } else {
      console.log("conversion finished: " + destination);

      var responseData = {
        video_id: video_id,
        video: source,
        song: destination
      };

      // no need to run done explicitly
      // since it is added as the first callback into
      // the progress[video_id].queue
      //done(null, responseData); 

      // wait a bit for disc so as to not instantly reading after a write
      console.log("conversion done, sending file in 3 seconds");
      setTimeout(function () {
        progress[video_id].data = responseData;
        cache[video_id] = cache[video_id] || {};
        cache[video_id].data = responseData;

        console.log("sending files to queue");
        // respond to those waiting in queue
        var p = progress[video_id];
        console.log("looping through queue, length: " + p.queue.length);
        for (var i = 0; i < p.queue.length; i++) {
          var callback = p.queue[i];
          if (typeof callback === 'function') {
            console.log("queue position: " + i);
            callback(null, responseData);
          }
        };

        // empty queue
        p.queue = [];
      }, 3000);
    }
  });
};

// debug
var vid1 = "ZcoqR9Bwx1Y";
var vid2 = "woPff-Tpkns";

module.exports = {
  getSong: function (video_id, done) {
    download(video_id, done);
  }
};
