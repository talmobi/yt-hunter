var React = require('react');
var ReactDOM = require('react-dom');

var player = null;

var api = require('./api.js');

var previousRequest = null;
var previousSearch = null;

var SearchView = React.createClass({
  getInitialState: function () {
    return {list: []};
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

    var opts = {
      query: search_query,
      filters: filters || {}
    };

    //opts.filters = {include: [], exclude: []};

    api.search(opts, function (err, songs) {
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
    console.log("Form Submit Event Triggered.");
    evt.preventDefault();
  },
  render: function () {
    var self = this;

    return (
      <div className="search-view">
        <form onSubmit={self.onSubmit}>
          <input type="text" ref="inputEl" />
          <input type="text" ref="includesEl" />
          <input type="text" ref="excludesEl" />
        </form>
        <Player />
        <List list={self.state.list} />
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
        <div>
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
