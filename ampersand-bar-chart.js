;(function() {
  var d3 = require('d3');
  var _ = require('lodash');

  var AmpersandState = require('ampersand-state');
  var AmpersandView = require('ampersand-view');

  var ChartState = AmpersandState.extend({
    session: {
      data: 'object',
      title: 'string',
      value: 'string',
      label: 'string',
      _view: 'object'
    },
    initialize: function() {
      this.data.on('all', function() {
        this._view.renderData();
      }.bind(this));

      this.data.each(function(model) {
        model.on('change', function() {
          this._view.renderData();
        }.bind(this));
      }.bind(this));
    }
  });

  var ChartView = AmpersandView.extend({
    template: '<svg></svg>',
    autoRender: true,
    initialize: function() {
      this.model._view = this;
    },
    render: function() {
      AmpersandView.prototype.render.call(this);

      this.renderChart();
    },
    renderChart: function() {    
      var data = this.model.data.toJSON();
      var label = this.model.label;
      var value = this.model.value;

      var width = 600;
      var height = 320;
      var barWidth = 25; 
      var barMargin = 30;

      var y = d3.scale.linear()
        .domain([ 0, d3.max(data, function(d) { return d[value]; }) ])
        .range([ height - 100, 0 ]);

      var chart = this.chart = d3.select(this.el)
        .attr('width', '100%')
        .attr('height', '20em');

      this.renderData();
      
      var ground = chart.append('g')
        .append('line')
          .attr('class', 'ground')
          .attr('x1', 0)
          .attr('x2', (data.length - 1) * (barWidth + barMargin) + barWidth * 3)
          .attr('y1', height - 26)
          .attr('y2', height - 26);

      var title = chart.append('text')
        .attr('class', 'title')
        .attr('x', 0)
        .attr('y', '1em')
        .text(this.model.title);
    },
    renderData: function() {
      var chart = this.chart;
      var data = this.model.data.toJSON();
      var label = this.model.label;
      var value = this.model.value;

      var height = 320;
      var barWidth = 25; 
      var barMargin = 30;

      var y = d3.scale.linear()
        .domain([ 0, d3.max(data, function(d) { return d[value]; }) ])
        .range([ height - 100, 0 ]);

      chart.selectAll('g.bar').remove();

      var bar = chart.selectAll('g.bar')
        .data(data)
      .enter().append('g')
        .attr('class', 'bar')
        .attr('transform', function(d, i) {
          return 'translate(' + (i * (barWidth + barMargin) + barWidth) + ',24)';
        });

      bar.append('rect')
        .attr('class', 'bar-background')
        .attr('y', '1.5em')
        .attr('height', height - 76)
        .attr('width', barWidth);

      bar.append('rect')
        .attr('y', function(d) { return y(d[value]) + 50; })
        .attr('height', function(d) { return height - 100 - y(d[value]); })
        .attr('width', barWidth);

      bar.append('text')
        .attr('x', barWidth / 2)
        .attr('y', function(d) { return y(d[value]) + 50; })
        .attr('dy', '-0.75em')
        .attr('dx', '-0.05em')
        .text(function(d) { return d[value]; });
      
      bar.append('text')
        .attr('x', barWidth / 2)
        .attr('y', height - 50)
        .attr('dy', '1.25em')
        .text(function(d) { return d[label]; });

      chart.select('line.ground')
        .attr('x2', (data.length - 1) * (barWidth + barMargin) + barWidth * 3);
    }
  });

  module.exports = {
    State: ChartState,
    View: ChartView
  };
})();
