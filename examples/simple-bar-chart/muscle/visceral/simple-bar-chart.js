;(function() {
  'use strict';

  var HOX = require('../../gonads/hox-genes/muscle.hox');

  var $ = require('jquery');
  require('jquery-ui');

  var Section = require('./section.js');

  var AmpersandState = require('ampersand-state');
  var AmpersandCollection = require('ampersand-collection');  
  var AmpersandBarChart = require('../../../../ampersand-bar-chart.js');

  var PizzaState = AmpersandState.extend({
    props: {
      name: 'string',
      amount: 'mumber',
      otherAmount: 'number',
      thatOtherThing: 'number'
    }
  });
  var PizzaCollection = AmpersandCollection.extend({
    model: PizzaState
  });

  var WelcomeView = Section.View.extend({
    template: function() { return $('#simpleBarChart')[0]; },
    render: function() {
      Section.View.prototype.render.call(this);

      this.createChart();
    },
    createChart: function() {
      var pizzaCollection = window.pizzaCollection = new PizzaCollection([
        { name: 'California', amount: Math.floor(Math.random() * 250), otherAmount: Math.floor(Math.random() * 250), thatOtherThing: Math.floor(Math.random() * 250) },
        { name: 'Chicago', amount: Math.floor(Math.random() * 250), otherAmount: Math.floor(Math.random() * 250), thatOtherThing: Math.floor(Math.random() * 250) },
        { name: 'Greek', amount: Math.floor(Math.random() * 250), otherAmount: Math.floor(Math.random() * 250), thatOtherThing: Math.floor(Math.random() * 250) },
        { name: 'Hawaiian', amount: Math.floor(Math.random() * 250), otherAmount: Math.floor(Math.random() * 250), thatOtherThing: Math.floor(Math.random() * 250) },
        { name: 'NY', amount: Math.floor(Math.random() * 250), otherAmount: Math.floor(Math.random() * 250), thatOtherThing: Math.floor(Math.random() * 250) },
        { name: 'Quad City', amount: Math.floor(Math.random() * 250), otherAmount: Math.floor(Math.random() * 250), thatOtherThing: Math.floor(Math.random() * 250) },
        { name: 'Sicilian', amount: Math.floor(Math.random() * 250), otherAmount: Math.floor(Math.random() * 250), thatOtherThing: Math.floor(Math.random() * 250) },
        { name: 'St. Louis', amount: Math.floor(Math.random() * 250), otherAmount: Math.floor(Math.random() * 250), thatOtherThing: Math.floor(Math.random() * 250) },
        { name: 'St. Louis', amount: Math.floor(Math.random() * 250), otherAmount: Math.floor(Math.random() * 250), thatOtherThing: Math.floor(Math.random() * 250) },
        { name: 'Tomato', amount: Math.floor(Math.random() * 250), otherAmount: Math.floor(Math.random() * 250), thatOtherThing: Math.floor(Math.random() * 250) }
      ]);

      var chartState = new AmpersandBarChart.State({
        title: 'Pizza Sales',
        label: 'name',
        values: [ 'amount', 'otherAmount', 'thatOtherThing' ],
        data: pizzaCollection,
        chartType: 'line'
      });
      var chartView = new AmpersandBarChart.View({ model: chartState });

      $(this.el).append($(chartView.el).attr({ class: 'chart' }));
    },
    events: {
      'click .chart': 'addPizza'
    },
    addPizza: function() {
      $.ajax({
        url: 'http://api.randomuser.me',
        dataType: 'json',
        success: function(data) {
          window.pizzaCollection.add({ name: data.results[0].user.name.first, amount: Math.floor(Math.random() * 250), otherAmount: Math.floor(Math.random() * 250), thatOtherThing: Math.floor(Math.random() * 250 )});
        }
      });
    }
  });

  var WelcomeModel = Section.Model.extend({
    initialize: function() {
      this.view = new WelcomeView({ model: this });
    }
  });

  module.exports = WelcomeModel;
})();
