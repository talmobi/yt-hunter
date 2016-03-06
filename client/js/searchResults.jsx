var React = require('react');
var ReactDOM = require('react-dom');

// yt-player
var YT_PLAYER = null;
var __last_video_id = null;

var api = require('./api.js');

var inputWatermarkText = "";
var __max_title_width = 284;

var previousRequest = null;
var previousSearch = null;

var DEBUG = (
    window.location.host.indexOf('local') >= 0 ||
    window.location.host.indexOf('192') >= 0
);

function secondsToTimestamp (seconds) {
  var minutes = (seconds / 60) | 0;
  var hours = (minutes / 60) | 0;
  var seconds = seconds % 60;
  var stamp = "";
  if (hours > 0) {
    stamp += hours + ":";
  }
  stamp += minutes + ":";
  if (seconds < 10) {
    stamp += "0";
  }
  stamp += seconds;
  return stamp;
};

function timeFilter (songs) {
  // song.duration.seconds
  return songs.filter(function (val, ind, arr) {
    var song = val;
    var seconds = song.duration.seconds;
    var min = 60 * 1;
    var max = 60 * 9;
    return (seconds >= min && seconds <= max);
  });
};

function sortSongs (search_query, songs) {
  // sort for search words
  var splits = search_query.split(/\s+/);
  for (var i = 0; i < splits.length; i++) {
    var sortWord = splits[i];
    songs.sort(function (a, b) {
      var at = a.title.toLowerCase();
      if (at.indexOf( sortWord ) >= 0) {
        //console.log("found ost: " + at);
        return 1;
      }
      var bt = b.title.toLowerCase();
      if (bt.indexOf( sortWord ) >= 0) {
        //console.log("found ost: " + bt);
        return -1;
      }
      return 0;
    });
  }
  songs.reverse();
};

function toSearchQuery (query) {
  var q = [];
  var strings = query.split(/\s+/);
  for (var i = 0; i < strings.length; i++) {
    var string = strings[i];
    var c = string[0];
    if (c == '!') {
      continue; // dont add exclusions to query
    }
    q.push( toAlphaNumeric( string ) );
  }
  return q.join(' ');
};

function grabExcludes (query) {
  var excludes = [];
  var strings = query.split(/\s+/);
  for (var i = 0; i < strings.length; i++) {
    var string = strings[i];
    if (string[0] == '!' && !string[1] != '!') {
      var exclusion = string.slice(1);
      excludes.push( exclusion );
    }
  }
  return excludes;
};

function toAlphaNumeric (string) {
  return string.replace(/\W/g, '');
};

function grabIncludes (query) {
  var includes = [];
  var strings = query.split(/\s+/);
  for (var i = 0; i < strings.length; i++) {
    var string = strings[i];
    if (string[0] == "'" || string[0] == '"') {
      includes.push( toAlphaNumeric( string.slice(1) ) );
    }
  }
  return includes;
};

function shouldFilterSong (filters, song) {
  var title = song.title.toUpperCase();

  var excludes_test = false;
  if (filters.exclude.length > 0) {
    excludes_test = !!filters.exclude.find(function (val, ind, arr) {
      var str = val.toUpperCase();
      return title.indexOf(str) >= 0;
    });
  }

  var includes_test = false;
  if (filters.include.length > 0) {
    includes_test = !filters.include.find(function (val, ind, arr) {
      var str = val.toUpperCase();
      return title.indexOf(str) >= 0;
    });
  }

  return (excludes_test || includes_test);
};

var SearchView = React.createClass({
  getInitialState: function () {
    return {
      list: [],
      includes: [],
      excludes: []
    };
  },
  componentDidMount: function () {
    var self = this;

    var inputEl = self.refs.inputEl;
    inputEl.value = inputWatermarkText;

    inputEl.onblur = function () {
      if (inputEl.value.length < 1) {
        inputEl.value = inputWatermarkText;
      }
    };
    inputEl.onfocus = function () {
      inputEl.value = "";
    }

    var includesEl = self.refs.includesEl;
    includesEl.oninput = includesEl.onchange = function () {
      self.setState({
        includes: includesEl.value.split(/\s+/)
      });
    };

    var excludesEl = self.refs.excludesEl;
    excludesEl.oninput = excludesEl.onchange = function () {
      self.setState({
        excludes: excludesEl.value.split(/\s+/)
      });
    };

    var submit_timeout = null;
    inputEl.oninput = inputEl.onchange = function () {
      console.log("submit_timeout triggered");
      if (submit_timeout) {
        clearTimeout(submit_timeout);
      }

      if (inputEl.value.length <= 0) {
        return; // no reason to search empty strings
      }

      submit_timeout = setTimeout(function () {
        if (inputEl.value.length < 1) {
          // show message? TODO
          return;
        }

        var includesEl = self.refs.includesEl;
        var excludesEl = self.refs.excludesEl;

        var i = includesEl.value.split(/\s+/).filter(function (val) {
          return !!val;
        });
        var e = excludesEl.value.split(/\s+/).filter(function (val) {
          return !!val;
        });

        var filters = {
          include: i,
          exclude: e
        };

        self.submit_search( inputEl.value, filters );
      }, 400);
    };

    // debug search
    if (DEBUG) {
      window.document.addEventListener("DOMContentLoaded", function () {
        console.log(" >>>> DOCUMENT READY <<<< ");
        setTimeout(function () {
          self.submit_search( "popcorn mix" );
        }, 400);
      })
    }
  },
  submit_search: function (query, filters) {
    console.log("searching... ["+query+"]");
    var self = this;

    if (previousSearch == query) {
      return false;
    };
    previousSearch = query;

    //var inputEl = self.refs.inputEl;
    //inputEl.value = "";

    if (previousRequest) {
      previousRequest.abort();
      previousRequest = null;
    };

    //opts.filters = {include: [], exclude: []};
    var post_excludes = grabExcludes( query );
    var post_includes = grabIncludes( query );
    var post_filters = {
      include: post_includes,
      exclude: post_excludes
    }
    console.log(post_excludes);

    var search_query = toSearchQuery( query );

    previousRequest = api.search(search_query, function (err, songs) {
      if (err) {
        console.log("search failed: " + err);
      } else {
        console.log("search success!");

        // filter for song length, min/max
        songs = timeFilter(songs);


        // TODO stricter filters based on input
        songs = songs.filter(function (val, ind, arr) {
          var song = val;
          return !shouldFilterSong(post_filters, song);
        })

        // do basic sorting based on title relevance and likeness to search_query
        sortSongs(search_query, songs);

        self.setState({
          list: songs
        });
      }
    });
  },
  onSubmit: function (evt) {
    evt.preventDefault();
    console.log("Form Submit Event Triggered.");
  },
  render: function () {
    var self = this;
    var filteredList = self.state.list;

    if (self.state.includes.length > 0 && self.state.includes[0].length > 0) {
      filteredList = filteredList.filter(function (val, ind, arr) {
        var title = val.title.toUpperCase();
        return self.state.includes.find(function (val) {
          var str = val.toUpperCase();
          return title.indexOf(str) >= 0;
        });
      });
    }

    if (self.state.excludes.length > 0 && self.state.excludes[0].length > 0) {
      filteredList = filteredList.filter(function (val, ind, arr) {
        var title = val.title.toUpperCase();
        return !self.state.excludes.find(function (val) {
          var str = val.toUpperCase();
          return title.indexOf(str) >= 0;
        });
      });
    }

    //var filteredList = self.state.list;

    return (
      <div className="search-view">
        <form onSubmit={self.onSubmit}>
          <div id="main-input">
            <icon className="icon-search" />
            <input type="text" ref="inputEl"></input>
            <button className="icon-search" id="main-search-button" type="submit">
              Search
            </button>
          </div>

          <div style={{display: 'none'}}>
            <div>
              <div>Includes</div>
              <input type="text" ref="includesEl" />
            </div>
            <div>
              <div>Excludes</div>
              <input type="text" ref="excludesEl" />
            </div>
          </div>

        </form>
        <List list={filteredList} />
      </div>
    );
  }
});

var Embed = React.createClass({
  componentDidMount: function () {
    console.log("compnent mounted, document.body was: " + document.body);
    var scriptEl = document.createElement('script');
    scriptEl.src = "https://www.youtube.com/iframe_api"

    var element = ReactDOM.findDOMNode(this);
    //var element = document.getElementById('hidden');
    element.appendChild(scriptEl);

    console.log("element was:" + element);

    window.onYouTubeIframeAPIReady = function () {
      YT_PLAYER = new YT.Player('embed-id', {
        height: '300',
        width: '200',
        videoId: null,
        events: {
          'onReady': onPlayerReady,
          'onStateChange': onPlayerStateChange
        }
      });
    };

     window.onPlayerReady = function (evt) {
      evt.target.playVideo();
    };

    window.onPlayerStateChange = function (evt) {
      console.log("readyStateChange: ----------------------------");
      console.log(evt);

      if (evt.data == YT.PlayerState.PLAYING) {
        if (__last_item) {
          __last_item.setIconState(PLAYER_STATES.pause);
        }
      }

      if (evt.data == 0) { // ended
        if (__last_item) {
          __last_item.setIconState(PLAYER_STATES.replay);
          __last_item.setState({
            current_position: __last_item.props.duration.seconds
          });
        }
      }

      if (evt.data == 1) {
        //setTimeout(function () {
        //  YT_PLAYER.stopVideo();
        //}, 5000);
      }
    };
  },
  shouldComponentUpdate: function () {
    // turn React updates off for this element -> handle manually
    return false;
  },
  render: function () {
    var styles = {
      display: "none"
    };

    return (
      <div style={styles} id="embed-id">
      </div>
    );
  }
});

var Player = React.createClass({
  render: function () {
    return (
      <div className="player-view">
        <button className="btn">Play</button>
        <button className="btn">Pause</button>
        <button className="btn">Stop</button>
      </div>
    );
  }
});

var PLAYER_STATES = {
  play: "icon-play",
  stop: "icon-stop",
  pause: "icon-pause",
  loading: "icon-spin3",
  replay: "icon-cw",
};
var ListItemPlayer = React.createClass({
  getDefaultProps: function () {
    return {
      class_name: PLAYER_STATES.stop
    }
  },
  render: function () {
    var self = this;

    var keys = Object.keys(PLAYER_STATES);
    //var class_name = PLAYER_STATES[keys[keys.length * Math.random() | 0]];
    var class_name = this.props.class_name;
    if (class_name === PLAYER_STATES.loading) {
      class_name += " animate-spin";
    }


    return (
      <icon className={class_name}></icon>
    );
  }
});

var ListItemButtons = React.createClass({
  downloadClick: function (evt) {
    console.log("Download button clicked");
    evt.preventDefault();

    var url = this.props.url;
    var video_id = url.slice( url.indexOf('v=') + 2 );
    console.log("video id: " + video_id);

    var name = this.props.name;
    var path = "/download?v=" + video_id;
    if (name) {
      path += "&name=" + name;
    }
    var url = location.protocol + location.host + path;

    location.href = path
    /*
    var req = new XMLHttpRequest();
    req.open('GET', path, true);
    req.onload = function () {
      if (req.status >= 200 && req.status <= 400) {
        // Success!
        self.setState({
          list: JSON.parse(req.responseText)
        });
      } else {
        error();
      }
    };
    req.onerror = error;
    req.send();

    var error = function () {
      console.log("error making search request: " + req.status);
    };
    */
  },
  render: function () {
    return (
      <div className="list-item-buttons">
        <i className="icon-menu" onClick={this.downloadClick} url={this.props.url}></i>
      </div>
    );
  }
});

var List = React.createClass({
  render: function () {
    var list = this.props.list.map(function (val, ind, arr) {
      var song = val;
      return (
        <div className="list-item-container">
          <ListItem title={song.title}
                    duration={song.duration}
                    url={song.url}
                    key={song.title + ind} />
        </div>
      )
    })

    return (
      <ul>
        {list}
      </ul>
    )
  }
});

var SongTitle = React.createClass({
  getInitialState: function () {
    return {
      shortCounter: 0,
      width_was: 0
    }
  },
  componentWillReceiveProps: function () {
    this.state.shortCounter = 0;
  },
  componentDidMount: function () {
    this.shortenTitleLength();
  },
  componentDidUpdate: function () {
    this.shortenTitleLength()
  },
  shortenTitleLength: function () {
    var self = this;
    var el = ReactDOM.findDOMNode(self);
    var size = el.getBoundingClientRect();
    if (size.width > __max_title_width) {
      self.setState({
        shortCounter: self.state.shortCounter + 1,
        width_was: size.width
      });
    }
  },
  handleClick: function () {
    // TODO select or play from parent
  },
  render: function () {
    var self = this;

    var title = self.props.title.trim();

    if (self.state.shortCounter > 1 && title.length > 20) {
      var n = Math.pow(.92, self.state.shortCounter);
      title = title.slice(0, Math.floor(title.length * (n) - 1)).trim();
      self.state.title = title;
      title += "...";
    }

    return (
        <span className="song-title">{title}</span>
    );
  }
});

var __last_item = null;
var ListItem = React.createClass({
  getInitialState: function () {
    return {
      icon_state: PLAYER_STATES.play,
      paused_position: 0,
      current_position: 0,
    }
  },
  handleClick: function () {
    var self = this;

    if (YT_PLAYER !== null) {
      YT_PLAYER.stopVideo();
      var u = self.props.url;
      var videoId = u.slice( u.indexOf('v=') + 2 );

      if (__last_video_id == videoId) { // same song -> pause/play
        if(self.state.icon_state == PLAYER_STATES.play) {
          // is playing -> pause instead of playing
          console.log("pausing video: " + videoId);
          self.state.paused_position = YT_PLAYER.getCurrentTime();
          YT_PLAYER.pauseVideo();
          return self.setIconState(PLAYER_STATES.play);
        } else if (self.state.icon_state == PLAYER_STATES.pause) {
          // is paused -> contnue to play
          YT_PLAYER.playVideo();
          var seconds = self.state.paused_position | 0;
          YT_PLAYER.seekTo( seconds, true );
          console.log("continuing video: " + videoId + ", at: " + seconds);
          return self.setIconState(PLAYER_STATES.pause);
        } else if (self.state.icon_state == PLAYER_STATES.replay) {
          // seek to start and play
          YT_PLAYER.seekTo( 0, true );
          YT_PLAYER.playVideo();
          console.log("replaying video: " + videoId);
          return self.setIconState(PLAYER_STATES.pause);
        } else {
          // unknown -> reset last_video
          console.log("unknown icon_state -> resetting song");
          __last_video_id = null;
          __last_item = null;
          return self.handleClick();
        }
      } else { // new song -> load new song
        // load and play
        console.log("loading video: " + videoId);
        YT_PLAYER.loadVideoById({videoId: videoId});
        YT_PLAYER.playVideo();
        __last_video_id = videoId;

        if (__last_item) {
          // reset the last item
          __last_item.setState({current_position: 0});
          __last_item.setIconState(PLAYER_STATES.play);
        }
        self.setIconState(PLAYER_STATES.loading);
        __last_item = self;
      }
    }
  },
  setIconState: function (state) {
    this.setState({
      icon_state: state
    });
  },
  render: function () {
    var self = this;

    var u = self.props.url;
    var videoId = u.slice( u.indexOf('v=') + 2 );
    var selected = __last_video_id == videoId;
    var css = "song-list-item";
    if (selected) {
      css += " selected";
    }

    var timestamp = self.props.duration.timestamp;
    if (self.state.current_position > 0 && selected && YT_PLAYER) {
      var secs = self.state.current_position | 0;
      timestamp = secondsToTimestamp(secs) + "/" + self.props.duration.timestamp;
    }

    return (
      <li className={css} onClick={self.handleClick}>
        <ListItemPlayer class_name={self.state.icon_state} />
        <SongTitle title={self.props.title} />
        <span className="song-timestamp">{timestamp}</span>
        <ListItemButtons url={self.props.url} name={self.props.title} />
      </li>
    );
  }
});

var Component = React.createClass({
  render: function () {
    return (
      <div>
        <SearchView />
        <Embed />
      </div>
    );
  }
});

// current_position feeder
var current_position_updater = function () {
  if (__last_item && YT_PLAYER && YT_PLAYER.getCurrentTime) {
    var secs = YT_PLAYER.getCurrentTime();
    if (secs > 0) {
      __last_item.setState({
        current_position: secs
      })
    }
  }
  //console.log("position feeder looping");
  setTimeout(current_position_updater, 100);
};
setTimeout(current_position_updater, 100);

module.exports = Component;
