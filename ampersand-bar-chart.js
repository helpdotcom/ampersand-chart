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
      chartType:  [ 'string', false, 'bar' ],
      drawValues: [ 'boolean', false, false ],
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
      var lineWidth = 25; 
      var lineGroupMargin = 50;

      var chart = this.chart = d3.select(this.el)
        .attr('width', '100%')
        .attr('height', '25em');

      this.renderData();
      
      var ground = chart.append('g')
        .append('line')
          .attr('class', 'ampersand-graph-ground')
          .attr('x1', 0)
          .attr('y1', height - 26)
          .attr('y2', height - 26);

      switch (this.model.chartType) {
          case 'bar':
            ground.attr('x2', (2 + data.length * values.length) * barWidth + data.length * (values.length - 1) * barMargin + (data.length - 1) * barGroupMargin);
          break;
          case 'line':
            ground.attr('x2', (2 + data.length) * lineWidth + (data.length - 1) * lineGroupMargin);
          break;
      }

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

              switch (this.model.chartType) {
                case 'bar':
                  legend.attr('transform', 'translate(' +
                    (((2 + data.length * values.length) * barWidth + data.length * (values.length - 1) * barMargin + (data.length - 1) * barGroupMargin) / 2 - width / 2) +
                    ',' + (height + 20) + ')');
                break;
                case 'line':
                case 'area':
                  legend.attr('transform', 'translate(' + (((2 + data.length) * lineWidth + (data.length - 1) * lineGroupMargin) / 2 - width / 2) + ',' + (height + 20) + ')');
                break;
              }
            }
          }.bind(this), 1);
        }.bind(this))(legend, legendCircle, legendKey, legendBackground, index);
      }.bind(this));
    },
    renderData: function() {
      switch (this.model.chartType) {
        case 'bar':
          this.renderBarGraph();
        break;
        case 'line':
          this.renderLineGraph();
        break;
        case 'area':
          this.renderAreaGraph();
        break;
      }
    },
    renderBarGraph: function() {
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
    },
    renderLineGraph: function() {
      var chart = this.chart;
      var data = this.model._data.models;

      _.each(data, function(point, index) {
        point.index = index;
      });

      var label = this.model.label;
      var values = this.model.values;

      var height = 320;
      var lineWidth = 25; 
      var lineGroupMargin = 50;
      var lineMargin = 5;

      var y = d3.scale.linear()
        .domain([ 0, d3.max(data, function(d) {
          return Math.max.apply(null, _.remove(_.values(d.attributes), function(n) { return !isNaN(n); }));
        }) ])
        .range([ height - 100, 0 ]);

      var areaFunction = d3.svg.area()
        .x(function(d) { return d.x; })
        .y0(height - 50)
        .y1(function(d) { return d.y; })
        .interpolate('linear');

      var pathContainers = chart.selectAll('g.ampersand-graph-line-area-container')
        .data(data);

      var containers = chart.selectAll('g.ampersand-graph-line-container')
        .data(data);

      pathContainers.exit()
        .transition()
        .style('opacity', 0)
        .remove();

      containers.exit()
        .transition()
        .style('opacity', 0)
        .remove();

      var pathContainer = pathContainers.enter().append('g')
        .attr('class', 'ampersand-graph-line-area-container');

      var container = containers.enter().append('g')
        .attr('class', 'ampersand-graph-line-container');
      
      pathContainer
        .style('opacity', 0)
        .transition()
        .style('opacity', 1);
      
      pathContainer
        .attr('transform', function(d, i) {
          return 'translate(' + (i * (lineWidth + lineGroupMargin) + lineWidth) + ',24)';
        });

      container
        .style('opacity', 0)
        .transition()
        .style('opacity', 1);
      
      container
        .attr('transform', function(d, i) {
          return 'translate(' + (i * (lineWidth + lineGroupMargin) + lineWidth) + ',24)';
        });

      if (this.model.drawLabels) {
        container.append('text')
          .attr('class', 'ampersand-graph-label')
          .attr('x', lineWidth / 2)
          .attr('y', height - 50)
          .attr('dy', '1.25em');
      }

      containers.select('text.ampersand-graph-label')
        .text(function(d) { return d[label]; });

      _.each(values, function(value, index) {
        pathContainers.append('path')
          .attr('class', 'ampersand-graph-line-area ampersand-graph-line-area-' + index)
          .attr('shape-rendering', 'crispEdges')
          .attr('d', function(d) {
            var path = [
              { x: lineWidth / 2, y: height - 50 },
              { 
                x: d.index < data.length - 1 ? lineWidth * 3 / 2 + lineGroupMargin : lineWidth / 2,
                y: height - 50
              }
            ];
            return areaFunction(path);
          });

        container.append('line')
          .attr('class', 'ampersand-graph-line ampersand-graph-line-' + index)
          .attr('x1', lineWidth / 2)
          .attr('y1', height - 50)
          .attr('x2', function(d) { return d.index < data.length - 1 ? lineWidth * 3 / 2 + lineGroupMargin : lineWidth / 2; })
          .attr('y2', height - 50);

        container.append('circle')
          .attr('class', 'ampersand-graph-line ampersand-graph-line-dot-' + index)
          .attr('r', '0.15em')
          .attr('cy', height - 50);

        if (this.model.drawValues) {
          container.append('text')
            .attr('class', 'ampersand-graph-value ampersand-graph-value-' + index)
            .attr('x', lineWidth / 2)
            .attr('y', height - 50)
            .attr('dy', '-0.75em')
            .attr('dx', '-0.05em');
        }

        containers.select('circle.ampersand-graph-line-dot-' + index)
          .attr('cx', lineWidth / 2)
          .transition()
          .attr('cy', function(d) { return y(d[value]) + 50; });

        containers.select('line.ampersand-graph-line-' + index)
          .transition()
          .attr('x1', lineWidth / 2)
          .attr('y1', function(d) { return y(d[value]) + 50; })
          .attr('x2', function(d) { return d.index < data.length - 1 ? lineWidth * 3 / 2 + lineGroupMargin : lineWidth / 2; })
          .attr('y2', function(d) {
            if (d.index < data.length - 1) {
              return y(data[d.index + 1][value]) + 50;
            } else {
              return y(d[value]) + 50;
            }
          });

        pathContainers.select('path.ampersand-graph-line-area-' + index)
          .transition()
          .attr('d', function(d) {
            var path = [
              { x: lineWidth / 2, y: y(d[value]) + 50 },
              { 
                x: d.index < data.length - 1 ? lineWidth * 3 / 2 + lineGroupMargin: lineWidth / 2,
                y: d.index < data.length - 1 ? y(data[d.index + 1][value]) + 50 : y(d[value]) + 50
              }
            ];
            return areaFunction(path);
          });

        containers.select('text.ampersand-graph-value-' + index)
          .transition()
          .attr('y', function(d) { return y(d[value]) + 50; })
          .text(function(d) { return d[value]; });
      }.bind(this));

      chart.select('line.ampersand-graph-ground')
        .transition()
        .attr('x2', (2 + data.length) * lineWidth + (data.length - 1) * lineGroupMargin);
    },
    renderAreaGraph: function() {
      var chart = this.chart;
      var data = this.model._data.models;

      _.each(data, function(point, index) {
        point.index = index;
      });

      var label = this.model.label;
      var values = this.model.values;

      var height = 320;
      var areaWidth = 25; 
      var areaGroupMargin = 50;
      var areaMargin = 5;

      var y = d3.scale.linear()
        .domain([ 0, d3.max(data, function(d) {
          return Math.max.apply(null, _.remove(_.values(d.attributes), function(n) { return !isNaN(n); }));
        }) ])
        .range([ height - 100, 0 ]);

      var areaFunction = d3.svg.area()
        .x(function(d) { return d.x; })
        .y0(height - 50)
        .y1(function(d) { return d.y; })
        .interpolate('basis');

      var containers = chart.selectAll('g.ampersand-graph-area-container')
        .data(data);

      containers.exit()
        .transition()
        .style('opacity', 0)
        .remove();

      var container = containers.enter().append('g')
        .attr('class', 'ampersand-graph-area-container');

      container
        .style('opacity', 0)
        .transition()
        .style('opacity', 1);
      
      container
        .attr('transform', function(d, i) {
          return 'translate(' + (i * (areaWidth + areaGroupMargin) + areaWidth) + ',24)';
        });

      if (this.model.drawLabels) {
        container.append('text')
          .attr('class', 'ampersand-graph-label')
          .attr('x', areaWidth / 2)
          .attr('y', height - 50)
          .attr('dy', '1.25em');
      }

      containers.select('text.ampersand-graph-label')
        .text(function(d) { return d[label]; });

      _.each(values, function(value, index) {
        container.append('path')
          .attr('class', 'ampersand-graph-area ampersand-graph-area-' + index)
          .attr('shape-rendering', 'crispEdges')
          .attr('d', function(d) {
            var path = [
              { x: areaWidth / 2, y: height - 50 },
              { 
                x: d.index < data.length - 1 ? areaWidth * 3 / 2 + areaGroupMargin : areaWidth / 2,
                y: height - 50
              }
            ];
            return areaFunction(path);
          });

        if (this.model.drawValues) {
          container.append('text')
            .attr('class', 'ampersand-graph-value ampersand-graph-value-' + index)
            .attr('x', areaWidth / 2)
            .attr('y', height - 50)
            .attr('dy', '-0.75em')
            .attr('dx', '-0.05em');
        }

        containers.select('path.ampersand-graph-area-' + index)
          .transition()
          .attr('d', function(d) {
            var path = [
              { x: areaWidth / 2, y: y(d[value]) + 50 },
              { x: areaWidth * 3 / 2, y: y(d[value]) + 50 },
              { 
                x: d.index < data.length - 1 ? areaWidth / 2 + areaGroupMargin: areaWidth * 5 / 4,
                y: d.index < data.length - 1 ? y(data[d.index + 1][value]) + 50 : y(d[value]) + 50
              },
              { 
                x: d.index < data.length - 1 ? areaWidth * 3 / 2 + areaGroupMargin: areaWidth / 2,
                y: d.index < data.length - 1 ? y(data[d.index + 1][value]) + 50 : y(d[value]) + 50
              }
            ];
            return areaFunction(path);
          });

        containers.select('text.ampersand-graph-value-' + index)
          .transition()
          .attr('y', function(d) { return y(d[value]) + 50; })
          .text(function(d) { return d[value]; });
      }.bind(this));

      chart.select('area.ampersand-graph-ground')
        .transition()
        .attr('x2', (2 + data.length) * areaWidth + (data.length - 1) * areaGroupMargin);
    }
  });

  module.exports = {
    State: ChartState,
    View: ChartView
  };
})();
