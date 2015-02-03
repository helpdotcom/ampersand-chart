;(function() {
  'use strict';

  var Router = require('./router.js');
  var ChartExample = require('./chartExample.js');

  var ClientEngine = function() {
    var self = this;

    self.chartExample = new ChartExample({ context: self });

    self.router = new Router({ context: self });
    self.router.history.start({ pushState: true });
  };

  module.exports = ClientEngine;
})();
