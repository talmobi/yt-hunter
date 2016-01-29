var api = {};

api.search = function (opts, done) {
  var req = new XMLHttpRequest();
  var path = '/search';

  req.open('POST', path, true);

  req.onload = function () {
    if (req.status >= 200 && req.status <= 400) {
      // Success!
      var songs = JSON.parse(req.responseText);
      done(null, songs);
    } else {
      done(new Error("Search error - status: " + req.status));
    }
  };

  req.onerror = function () {
    done(new Error("Connection error - status: " + req.status));
  };

  var json = {
    query: opts.query,
    filters: opts.filters
  };

  req.setRequestHeader('Content-Type', 'application/json');
  req.send(JSON.stringify(json));
};

module.exports = api;
