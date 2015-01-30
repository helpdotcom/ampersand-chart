;(function() {
  'use strict';

  var Router = require('./router.js');
  var SimpleBarChart = require('./simple-bar-chart.js');

  var ClientEngine = function() {
    var self = this;

    self.simpleBarChart = new SimpleBarChart({ context: self });

    self.router = new Router({ context: self });
    self.router.history.start({ pushState: true });
  };

  module.exports = ClientEngine;
})();
