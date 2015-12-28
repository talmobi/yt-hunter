var React = require('react');
var ReactDOM = require('react-dom');

var App = React.createClass({
  render: function () {
    return (
      <div>
        Title: {Date.now()}
      </div>
    );
  }
});

ReactDOM.render(
  <App />,
  document.getElementById('app')
);
