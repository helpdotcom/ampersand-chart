;(function() {
  'use strict';

  var HOX = require('../../gonads/hox-genes/muscle.hox');

  var $ = require('jquery');
  require('jquery-ui');

  var uuid = require('uuid');
  var md5 = require('blueimp-md5').md5;

  var Section = require('./section.js');

  var AmpersandState = require('ampersand-state');
  var AmpersandCollection = require('ampersand-collection');  
  var AmpersandChart = require('../../../ampersand-chart.js');

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


  var UserState = AmpersandState.extend({
    props: {
      id: 'string',
      name: 'string',
      email: 'string'
    },
    derived: {
      avatar: {
        deps: [ 'email'],
        fn: function() {
          var hash = md5(this.email);
          return 'https://gravatar.com/avatar/' + hash + '?s=80';
        }
      }
    }
  });
  var UserCollection = AmpersandCollection.extend({
    model: UserState
  });

  var WelcomeView = Section.View.extend({
    template: function() { return $('#chartExample')[0]; },
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

      var userCollection = window.userCollection = new UserCollection([
        { id: uuid.v4(), name: 'Alexander Martin', email: 'alex.martin@help.com' },
        { id: uuid.v4(), name: 'Douglas Hanna', email: 'douglas.hanna@help.com' },
        { id: uuid.v4(), name: 'Spencer Rinehart', email: 'spencer.rinehart@help.com' },
        { id: uuid.v4(), name: 'Randall Jones', email: 'randall.jones@help.com' },
        { id: uuid.v4(), name: 'Adam Stevens', email: 'adam.stevens@help.com' }
      ]);

      var chartState = new AmpersandChart.State({
        title: 'Pizza Sales',
        label: 'name',
        values: [ 'amount', 'otherAmount', 'thatOtherThing' ],
        data: pizzaCollection,
        chartType: 'line',
        drawValues: false,
        searchData: userCollection,
        searchIdAttribute: 'id',
        searchImageAttribute: 'avatar',
        searchQueryAttribute: 'name'
      });
      var chartView = new AmpersandChart.View({ model: chartState });

      $(this.el).append($(chartView.el).attr({ class: 'chart' }));
    },
    events: {
      //'click .chart': 'addPizza'
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
