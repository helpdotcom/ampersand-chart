;(function() {
  var d3 = require('d3');
  var _ = require('lodash');

  var AmpersandState = require('ampersand-state');
  var AmpersandView = require('ampersand-view');
  var AmpersandSubCollection = require('ampersand-subcollection');

  var ChartState = AmpersandState.extend({
    session: {
      // Data Settings
      data: 'object',
      title: 'string',
      values: 'array',
      label: 'string',

      // GUI Settings
      drawValues: [ 'boolean', false, true ],
      drawLabels: [ 'boolean', false, true ],
      drawBarBackground: [ 'boolean', false, true ],
        
      // Private Variables
      _view: 'object',
      _data: 'object'
    },
    initialize: function() {
      this._data = new AmpersandSubCollection(this.data);

      this._data.on('all', function() {
        this._view.renderData();
      }.bind(this));

      this._data.each(function(model) {
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
      var data = this.model._data.models;
      var label = this.model.label;
      var values = this.model.values;

      var width = 600;
      var height = 320;
      var barWidth = 25; 
      var barGroupMargin = 30;
      var barMargin = 5;

      var chart = this.chart = d3.select(this.el)
        .attr('width', '100%')
        .attr('height', '25em');

      this.renderData();
      
      var ground = chart.append('g')
        .append('line')
          .attr('class', 'ampersand-graph-ground')
          .attr('x1', 0)
          .attr('x2', (2 + data.length * values.length) * barWidth + data.length * (values.length - 1) * barMargin + (data.length - 1) * barGroupMargin)
          .attr('y1', height - 26)
          .attr('y2', height - 26);

      var title = chart.append('text')
        .attr('class', 'ampersand-graph-title')
        .attr('x', 0)
        .attr('y', '1em')
        .text(this.model.title);

      var legend = chart.append('g')
        .attr('class', 'ampersand-graph-legend')
        .attr('transform', 'translate(' +
          (((2 + data.length * values.length) * barWidth + data.length * (values.length - 1) * barMargin + (data.length - 1) * barGroupMargin) / 2 - 100) +
          ',' + (height + 20) + ')');

      var legendBackground = legend.append('rect')
        .attr('class', 'ampersand-graph-legend-background')
        .attr('width', 200)
        .attr('height', '2em')
        .attr('rx', 20)
        .attr('ry', 20);

      var legendKey = [];
      _.each(values, function(value, index) {
        var legendCircle = legend.append('circle')
          .attr('class', 'ampersand-graph-bar-' + index)
          .attr('r', '0.3em')
          .attr('cy', '1em');

        legendKey[index] = legend.append('text');
        legendKey[index]
          .attr('x', 24)
          .attr('y', 20)
          .text(value);

        (function(legend, legendCircle, legendKey, legendBackground, index) {
          setTimeout(function() {
            var offset = 0;
            
            if (index === 1) {
              offset = legendKey[0][0][0].getBBox().width;
            } else if (index > 1) {
              offset = _.reduce(_.take(legendKey, index), function(result, n, key) {
                return (isNaN(result) ? result[0][0].getBBox().width : result) + n[0][0].getBBox().width;
              });
            }

            legendCircle.attr('cx', 16 + 24 * index + offset);
            legendKey[index].attr('x', 24 * (index + 1) + offset);

            if (index === legendKey.length - 1) {
              var width = _.reduce(legendKey, function(result, n, key) {
                return (isNaN(result) ? result[0][0].getBBox().width : result) + n[0][0].getBBox().width;
              });
              width += 36 + 24 * index;

              legendBackground
                .attr('width', width);
              legend
                .attr('transform', 'translate(' +
                  (((2 + data.length * values.length) * barWidth + data.length * (values.length - 1) * barMargin + (data.length - 1) * barGroupMargin) / 2 - width / 2) +
                  ',' + (height + 20) + ')');
            }
          }, 1);
        })(legend, legendCircle, legendKey, legendBackground, index);
      });
    },
    renderData: function() {
      var chart = this.chart;
      var data = this.model._data.models;
      var label = this.model.label;
      var values = this.model.values;

      var height = 320;
      var barWidth = 25; 
      var barGroupMargin = 30;
      var barMargin = 5;

      var y = d3.scale.linear()
        .domain([ 0, d3.max(data, function(d) {
          return Math.max.apply(null, _.remove(_.values(d.attributes), function(n) { return !isNaN(n); }));
        }) ])
        .range([ height - 100, 0 ]);

      var containers = chart.selectAll('g.ampersand-graph-bar-container')
        .data(data);

      containers.exit()
        .transition()
        .style('opacity', 0)
        .remove();

      var container = containers.enter().append('g')
        .attr('class', 'ampersand-graph-bar-container');

      container
        .style('opacity', 0)
        .transition()
        .style('opacity', 1);
      
      container
        .attr('transform', function(d, i) {
          return 'translate(' + ((i * values.length + 1) * barWidth + i * (values.length - 1) * barMargin + i * barGroupMargin) + ',24)';
        });

      if (this.model.drawLabels) {
        container.append('text')
          .attr('class', 'ampersand-graph-label')
          .attr('x', ((barWidth * values.length) + barMargin * (values.length - 1)) / 2)
          .attr('y', height - 50)
          .attr('dy', '1.25em');
      }

      containers.select('text.ampersand-graph-label')
        .text(function(d) { return d[label]; });

      _.each(values, function(value, index) {
        if (this.model.drawBarBackground) {
         container.append('rect')
            .attr('class', 'ampersand-graph-bar-background')
            .attr('y', '1.5em')
            .attr('x', (barWidth + barMargin) * index)
            .attr('width', barWidth)
            .attr('height', height - 76);
        }

        container.append('rect')
          .attr('class', 'ampersand-graph-bar ampersand-graph-bar-' + index)
          .attr('width', barWidth)
          .attr('y', height - 50)
          .attr('height', 0);

        if (this.model.drawValues) {
          container.append('text')
            .attr('class', 'ampersand-graph-value ampersand-graph-value-' + index)
            .attr('x', barWidth * (index * 2 + 1) / 2 + barMargin * index)
            .attr('y', height - 50)
            .attr('dy', '-0.75em')
            .attr('dx', '-0.05em');
        }

        containers.select('rect.ampersand-graph-bar-' + index)
          .attr('x', (barWidth + barMargin) * index)
          .transition()
          .attr('y', function(d) { return y(d[value]) + 50; })
          .attr('height', function(d) { return height - 100 - y(d[value]); });

        containers.select('text.ampersand-graph-value-' + index)
          .transition()
          .attr('y', function(d) { return y(d[value]) + 50; })
          .text(function(d) { return d[value]; });
      }.bind(this));

      chart.select('line.ampersand-graph-ground')
        .transition()
        .attr('x2', (2 + data.length * values.length) * barWidth + data.length * (values.length - 1) * barMargin + (data.length - 1) * barGroupMargin);
    }
  });

  module.exports = {
    State: ChartState,
    View: ChartView
  };
})();
