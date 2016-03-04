var React = require('react');
var ReactDOM = require('react-dom');

// yt-player
var player = null;

var api = require('./api.js');

var previousRequest = null;
var previousSearch = null;

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
    var inputWatermarkText = "Search for any song";

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
  },
  submit_search: function (query, filters) {
    console.log("searching...");
    var self = this;

    if (previousSearch == query) {
      return false;
    };
    previousSearch = query;

    //var inputEl = self.refs.inputEl;
    var search_query = query;
    //inputEl.value = "";

    if (previousRequest) {
      previousRequest.abort();
      previousRequest = null;
    };

    //opts.filters = {include: [], exclude: []};

    api.search(search_query, function (err, songs) {
      if (err) {
        console.log("search failed: " + err);
      } else {
        console.log("search success!");

        songs = timeFilter(songs);

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
            <input type="text" ref="inputEl" />
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
      player = new YT.Player('embed-id', {
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

      if (evt.data == 1) {
        //setTimeout(function () {
        //  player.stopVideo();
        //}, 5000);
      }
    };
  },
  shouldComponentUpdate: function () {
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
};
var ListItemPlayer = React.createClass({
  render: function () {
    var keys = Object.keys(PLAYER_STATES);
    var class_name = PLAYER_STATES[keys[keys.length * Math.random() | 0]];
    if (class_name === PLAYER_STATES.loading) {
      class_name += " animate-spin";
    }

    return (
      <div className="list-item-player">
        <i className={class_name}></i>
      </div>
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
        <i className="icon-floppy" onClick={this.downloadClick} url={this.props.url}></i>
        <i className="icon-video-1" onClick={this.downloadClick} url={this.props.url}></i>
        <i className="icon-link" onClick={this.downloadClick} url={this.props.url}></i>
        <i className="icon-menu" onClick={this.downloadClick} url={this.props.url}></i>
      </div>
    );
  }
});

var List = React.createClass({
  render: function () {
    var list = this.props.list.map(function (val, ind, arr) {
      return (
        <div className="list-item-container">
          <ListItemPlayer />
          <ListItem  title={val.title}
                     duration={val.duration}
                     url={val.url}
                     key={ind} />
         {/*<ListItemButtons url={val.url} name={val.title} />*/}
        </div>
      );
    });
    return (
      <ul>
        {list}
      </ul>
    );
  }
});

var ListItem = React.createClass({
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
    this.trimTitleLength();
  },
  componentDidUpdate: function () {
    this.trimTitleLength()
  },
  trimTitleLength: function () {
    var self = this;
    var el = ReactDOM.findDOMNode(self);
    var size = el.getBoundingClientRect();
    //console.log(size.width);
    if (size.width > 300) {
      self.setState({
        shortCounter: self.state.shortCounter + 1,
        width_was: size.width
      });
    }
  },
  handleClick: function () {
    var self = this;
    if (player !== null) {
      player.stopVideo();
      var u = self.props.url;
      var videoId = u.slice( u.indexOf('v=') + 2 );
      console.log("loading video: " + videoId);
      player.loadVideoById({videoId: videoId});
      player.playVideo();
    };
  },
  render: function () {
    var self = this;

    var title = self.props.title;

    if (self.state.shortCounter > 1 && title.length > 20) {
      var n = Math.pow(.9, self.state.shortCounter);
      title = title.slice(0, Math.floor(title.length * (n) - 1)).trim();
      self.state.title = title;
      console.log(self.state.shortCounter);
      title += "...";
    }

    return (
      <li className="song-list-item" onClick={self.handleClick}>
        <span className="song-title">{title}</span>
        <span className="song-timestamp">{self.props.duration.timestamp}</span>
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

module.exports = Component;
