var React = require('react');
var ReactDOM = require('react-dom');

var SearchResults = require('./searchResults.jsx');

var Timer = React.createClass({
  getInitialState: function () {
    return {
      start_time: Date.now()
    }
  },
  componentDidMount: function () {
    var self = this;
    function timerUpdate () {
      self.forceUpdate();
      setTimeout(timerUpdate, 1000);
    };
    timerUpdate();
  },
  render: function () {
    var start_time = this.state.start_time;
    var delta = (Date.now() - start_time) / 1000 | 0;
    var s = delta % 60;
    var m = (delta / 60) % 60 | 0;
    var h = (delta / 60 / 60) % 24 | 0;
    return (
      <div>
        seconds since render: { "" + h + ":" + m + ":" + s }
      </div>
    );
  }
});

var App = React.createClass({
  render: function () {
    return (
      <div className="app-container">
        <SearchResults />
        <hr />
        <Timer />
      </div>
    );
  }
});

ReactDOM.render(
  <App />,
  document.getElementById('app')
);
