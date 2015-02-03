;(function() {
  'use strict';

  var Router = require('ampersand-router');

  module.exports = Router.extend({
    initialize: function(options) {
      this.context = options.context;
    },
    routes: {
      '': 'chartExample',
      'chartExample': 'chartExample'
    },
    chartExample: function() {
      this.context.chartExample.view.render();
    }
  });
})();
