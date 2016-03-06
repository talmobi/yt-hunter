var React = require('react');
var ReactDOM = require('react-dom');

var SearchResults = require('./searchResults.jsx');

// TODO download progress, buttons and overlay

var socket = require('socket.io-client')();
socket.on('connect', function () {
  console.log("io connected");
});
socket.on('event', function (data) {
  console.log("data: " + data);
});
socket.on('disconnect', function () {
  console.log("io disconnect");
});

var App = React.createClass({
  render: function () {
    return (
      <div className="app-container">
        <SearchResults />
      </div>
    );
  }
});

ReactDOM.render(
  <App />,
  document.getElementById('app')
);
