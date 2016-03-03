var React = require('react');
var ReactDOM = require('react-dom');

// yt-player
var player = null;

var api = require('./api.js');

var previousRequest = null;
var previousSearch = null;

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
          <div>
            <div>Search Term</div>
            <input type="text" ref="inputEl" />
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

var DownloadButton = React.createClass({
  handleClick: function (evt) {
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
    var btnStyles = {
      width: "50px",
      height: "50px",
      float: "left"
    };

    return (
      <button onClick={this.handleClick} style={btnStyles} url={this.props.url}>
        Download
      </button>
    );
  }
});

var List = React.createClass({
  render: function () {
    var list = this.props.list.map(function (val, ind, arr) {
      return (
        <div className="list-item-container">
          <DownloadButton url={val.url} name={val.title} />
          <ListItem  title={val.title}
                     duration={val.duration}
                     url={val.url}
                     key={ind} />
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
    return (
      <li className="song-list-item" onClick={self.handleClick}>
        <span className="song-title">{this.props.title}</span>
        <span className="song-timestamp">{this.props.duration.timestamp}</span>
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
