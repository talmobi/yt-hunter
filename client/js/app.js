var React = require('react');
var ReactDOM = require('react-dom');

var SearchResults = require('./searchResults.jsx');

var App = React.createClass({
  render: function () {
    return (
      <div className="app-container">
        <SearchResults />
        <hr />
      </div>
    );
  }
});

ReactDOM.render(
  <App />,
  document.getElementById('app')
);
