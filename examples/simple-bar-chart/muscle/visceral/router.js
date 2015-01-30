;(function() {
  'use strict';

  var Router = require('ampersand-router');

  module.exports = Router.extend({
    initialize: function(options) {
      this.context = options.context;
    },
    routes: {
      '': 'simpleBarChart',
      'simpleBarChart': 'simpleBarChart'
    },
    simpleBarChart: function() {
      this.context.simpleBarChart.view.render();
    }
  });
})();
