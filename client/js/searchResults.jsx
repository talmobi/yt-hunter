var React = require('react');
var ReactDOM = require('react-dom');

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
        self.submit_search( inputEl.value );
      }, 400);
    };
  },
  submit_search: function (query) {
    console.log("searching...");
    var self = this;

    //var inputEl = self.refs.inputEl;
    var search_query = query;
    //inputEl.value = "";


    var req = new XMLHttpRequest();
    var path = "/results?search_query=" + search_query.split("\s").join("+");
    var url = location.protocol + location.host + path;
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
    scriptEl.src = "https://www.youtube.com/iframe_api?enablejsapi=1"

    var element = ReactDOM.findDOMNode(this);
    element.appendChild(scriptEl);

    console.log("element was:" + element);

    var player;
    window.onYouTubeIframeAPIReady = function () {
      player = new YT.Player('embed-id', {
        height: '300',
        width: '200',
        videoId: '5BmEGm-mraE',
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
    };
  },
  shouldComponentUpdate: function () {
    return false;
  },
  render: function () {
    return (
      <div id="embed-id">
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
        <Embed />
      </div>
    );
  }
});

var List = React.createClass({
  render: function () {
    var list = this.props.list.map(function (val, ind, arr) {
      return <ListItem title={val.title} duration={val.duration} key={ind} />;
    });
    return (
      <ul>
        {list}
      </ul>
    );
  }
});

var ListItem = React.createClass({
  render: function () {
    return (
      <li className="song-list-item">
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
      </div>
    );
  }
});

module.exports = Component;
