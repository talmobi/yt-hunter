var React = require('react');
var ReactDOM = require('react-dom');
var Redux = require('redux');

var SearchResults = require('./searchResults.jsx');

// TODO download progress, buttons and overlay

const initialState = {
  search: '',
  results: []
};
var searchReducer = function (state, action) {
  state = state || initialState;

  switch (action.type) {
    case 'SEARCH_SUCCESS':
      return Object.assign({}, state, {
        search: action.search,
        results: action.results
      })
    default:
      return state
  }
};
var store = Redux.createStore( searchReducer );

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
        <SearchResults store={this.props.store} />
      </div>
    );
  }
});

ReactDOM.render(
  <App store={store} />,
  document.getElementById('app')
);
