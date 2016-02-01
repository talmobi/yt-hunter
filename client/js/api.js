var api = {};

api.search = function (query, done) {
  var req = new XMLHttpRequest();

  var queryString = query.split(/\s+/).join('+');
  console.log("queryString: " + queryString);
  var path = '/search?search_query=' + queryString;

  req.open('get', path, true);

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

  req.send();
};

module.exports = api;
