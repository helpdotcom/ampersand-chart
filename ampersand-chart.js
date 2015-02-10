;(function() {
  var d3 = require('d3');
  var _ = require('lodash');

  var AmpersandState = require('ampersand-state');
  var AmpersandView = require('ampersand-view');
  var AmpersandSubCollection = require('ampersand-subcollection');
  var AmpersandTimeRange = require('ampersand-time-range');
  var AmpersandCalendar = require('ampersand-calendar');
  var AmpersandSearchSelect = require('ampersand-search-select');
  var AmpersandFilterTracker = require('ampersand-filter-tracker');

  var ChartState = AmpersandState.extend({
    session: {
      // Data Settings
      data: 'object',
      title: 'string',
      values: 'array',
      label: 'string',

      // Search Settings
      searchData: 'object',
      searchIdAttribute: 'string',
      searchImageAttribute: 'string',
      searchQueryAttribute: 'string',

      // Filter Settings
      timeRangeFilter: 'function',
      calendarFilter: 'function',
      searchSelectFilter: 'function',

      // GUI Settings
      chartType:  [ 'string', false, 'bar' ],
      drawValues: [ 'boolean', false, true ],
      drawLabels: [ 'boolean', false, true ],
      drawBarBackground: [ 'boolean', false, true ],
      barMarginCoefficient: [ 'number', false, 0.2 ],
      barGroupMarginCoefficient: [ 'number', false, 1.2 ],
      lineGroupMarginCoefficient: [ 'number', false, 2 ],
      areaGroupMarginCoefficient: [ 'number', false, 2 ],
        
      // Private Variables
      _view: 'object',
      _data: 'object',
      _filterOpen: [ 'boolean', false, false ]
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
    template: '<div></div>',
    autoRender: true,
    initialize: function() {
      this.model._view = this;
    },
    bindings: {
      'model._filterOpen': {
        type: function(el, filterOpen) {
          var chart = d3.select(el);
         
          if (filterOpen) {
            chart.select('section.ampersand-graph-filter-window')
              .style('display', 'inline-block');

            chart.select('button.ampersand-graph-filter-button')
              .attr('class', 'ampersand-graph-filter-button ampersand-graph-filter-button-open');
          } else {
            chart.select('section.ampersand-graph-filter-window')
              .style('display', 'none');

            chart.select('button.ampersand-graph-filter-button')
              .attr('class', 'ampersand-graph-filter-button');
          }
        }
      }
    },
    events: {
      'click .ampersand-graph-filter-button': 'toggleFilterWindow'
    },
    toggleFilterWindow: function(event) {
      this.model._filterOpen = !this.model._filterOpen;
    },
    render: function() {
      AmpersandView.prototype.render.call(this);

      this.renderChart();
    },
    renderChart: function() {    
      var data = this.model._data.models;
      var label = this.model.label;
      var values = this.model.values;

      var height = 320;
      var barWidth = 25; 
      var barGroupMargin = 30;
      var barMargin = 5;
      var lineWidth = 25; 
      var lineGroupMargin = 50;

      var container = this.container = d3.select(this.el);
      var chart = this.svg = container.append('svg')
        .attr('width', '100%')
        .attr('height', '25em');
      
      var y = d3.scale.linear()
        .domain([ 0, d3.max(data, function(d) {
          return Math.max.apply(null, _.remove(_.values(_.pick(d.attributes, values)), function(n) { return !isNaN(n); }));
        }) ])
        .range([ height - 100, 0 ]);

      var yAxisGenerator = d3.svg.axis()
        .scale(y)
        .ticks(5)
        .tickSize(0, 0)
        .orient('left');

      this.renderData();
      
      var ground = chart.append('g')
        .append('line')
          .attr('class', 'ampersand-graph-ground')
          .attr('x1', 0)
          .attr('y1', height - 25)
          .attr('y2', height - 25);

      switch (this.model.chartType) {
          case 'bar':
            ground.attr('x2', (2 + data.length * values.length) * barWidth + data.length * (values.length - 1) * barMargin + (data.length - 1) * barGroupMargin);
          break;
          case 'line':
          case 'area':
            ground.attr('x2', (2 + data.length) * lineWidth + (data.length - 1) * lineGroupMargin);
          break;
      }

      var yAxis = chart.append('svg')
        .attr('class', 'ampersand-graph-y-axis')
        .style('overflow', 'visible')
        .attr('x', '2em')
        .attr('y', '4.75em')
        .call(yAxisGenerator);

      var title = chart.append('text')
        .attr('class', 'ampersand-graph-title')
        .attr('x', 0)
        .attr('y', '1.5em')
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

        (function(legend, legendCircle, legendKey, legendBackground, index, yAxis, ground) {
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
              }, 0);
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
            this.renderData();

            yAxis.attr('x', yAxis.node().getBBox().width);
            ground.attr('x1', yAxis.node().getBBox().width + 5);
          }.bind(this), 1);
        }.bind(this))(legend, legendCircle, legendKey, legendBackground, index, yAxis, ground);
      }.bind(this));

      this.renderFilter();
    },
    renderFilter: function() {
      var filterContainer = d3.select(this.el);
      var data = this.model._data.models;
      var label = this.model.label;
      var values = this.model.values;

      var height = 320;
      var barWidth = 25; 
      var barGroupMargin = 30;
      var barMargin = 5;
      var lineWidth = 25; 
      var lineGroupMargin = 50;

      var filterButton = filterContainer.append('button')
        .attr('class', 'ampersand-graph-filter-button')
        .text('Filter');

      var filterButtonArrow = filterButton.append('svg')
        .attr('class', 'ampersand-graph-filter-button-arrow')
        .attr('width', '1.4em')
        .attr('height', '1em');

      filterButtonArrow.append('line')
        .attr('class', 'ampersand-graph-filter-button-arrow-line')
        .attr('x1', '0.25em')
        .attr('x2', '0.75em')
        .attr('y1', '0.25em')
        .attr('y2', '0.75em');

      filterButtonArrow.append('line')
        .attr('class', 'ampersand-graph-filter-button-arrow-line')
        .attr('x1', '0.65em')
        .attr('x2', '1.15em')
        .attr('y1', '0.75em')
        .attr('y2', '0.25em');

      var filterWindow = filterContainer.append('section')
        .attr('class', 'ampersand-graph-filter-window')
        .style('display', 'none');

      var filterTime = filterWindow.append('section')
        .attr('class', 'ampersand-graph-filter-widget ampersand-graph-filter-time');

      filterTime.append('h6')
        .text('By time:');

      var timeRangeState = new AmpersandTimeRange.State();
      var timeRangeView = new AmpersandTimeRange.View({ model: timeRangeState });

      filterTime[0][0].appendChild(timeRangeView.el);

      var filterDate = filterWindow.append('section')
        .attr('class', 'ampersand-graph-filter-widget ampersand-graph-filter-date');

      filterDate.append('h6')
        .text('By date:');

      var calendarState = new AmpersandCalendar.State();
      var calendarView = new AmpersandCalendar.View({ model: calendarState });

      filterDate[0][0].appendChild(calendarView.el);

      var filterPersonnel = filterWindow.append('section')
        .attr('class', 'ampersand-graph-filter-widget ampersand-graph-filter-personnel');

      filterPersonnel.append('h6')
        .text('By agent/team:');

      var searchSelectState = new AmpersandSearchSelect.State({
        data: this.model.searchData,
        idAttribute: this.model.searchIdAttribute,
        imageAttribute: this.model.searchImageAttribute,
        queryAttribute: this.model.searchQueryAttribute
      });
      var searchSelectView = new AmpersandSearchSelect.View({ model: searchSelectState });

      filterPersonnel[0][0].appendChild(searchSelectView.el);

      var filterSelections = filterWindow.append('section')
        .attr('class', 'ampersand-graph-filter-widget ampersand-graph-filter-selections');

      filterSelections.append('h6')
        .text('Filter selections:');

      var filterTrackerState = new AmpersandFilterTracker.State({
        handles: [{
          model: timeRangeState,
          props: [ 'startTime', 'endTime' ],
          filter: this.timeRangeFilter,
          output: function() {
            return this.intToTimeString(this.startTime) + ' - ' + this.intToTimeString(this.endTime);
          },
          clearValues: [ 0, 1440 ],
          clear: function() {
            this.startX = 0;
            this.endX = this.width;
          }
        }, {
          model: calendarState,
          props: [ 'startDate', 'endDate' ],
          filter: this.calendarFilter,
          output: function() {
            var start = this.startDate !== null ? this.startDate.format('MMMM Do') : '';

            if (this.endDate !== null) {
              return start + ' - ' + this.endDate.format('MMMM Do');
            }

            return start;
          },
          clearValues: [ null, null ],
          clear: function() {
            this.startDate = null;
            this.endDate = null;
          }
        }, {
          model: searchSelectState,
          props: [ '_selected' ],
          filter: this.searchSelectFilter,
          output: function() {
            return this.selected.map(_.property(this.queryAttribute)).join(', ');
          },
          clearValues: [ function() {
            return this._selected.length > 0;
          } ],
          clear: function() {
            this._selected = [];
          }
        }]
      });
      var filterTrackerView = new AmpersandFilterTracker.View({ model: filterTrackerState });

      filterSelections[0][0].appendChild(filterTrackerView.el);
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
      var chart = this.svg;
      var data = this.model._data.models;
      var label = this.model.label;
      var values = this.model.values;
     
      var yAxis = this.svg.select('svg.ampersand-graph-y-axis');
      var yAxisOffset = yAxis.node() ? yAxis.node().getBBox().width : 0;

      var height = 320;
      var barCount = data.length * values.length;
      var graphWidth = this.container.node().getBoundingClientRect().width;
      var a = this.model.barGroupMarginCoefficient;
      var b = this.model.barMarginCoefficient;
      var i = data.length;
      var j = values.length;
      var barWidth = (graphWidth - yAxisOffset) / ((2 + i * j) + a * (i - 1) + b * i * (j - 1));
      var barGroupMargin = barWidth * a;
      var barMargin = barWidth * b;

      var y = d3.scale.linear()
        .domain([ 0, d3.max(data, function(d) {
          return Math.max.apply(null, _.remove(_.values(_.pick(d.attributes, values)), function(n) { return !isNaN(n); }));
        }) ])
        .range([ height - 100, 0 ]);

      var yAxisGenerator = d3.svg.axis()
        .scale(y)
        .ticks(5)
        .tickSize(0, 0)
        .orient('left');

      yAxis.call(yAxisGenerator);

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
      
      containers
        .attr('transform', function(d, i) {
          return 'translate(' + ((i * values.length + 1) * barWidth + i * (values.length - 1) * barMargin + i * barGroupMargin + yAxisOffset / 2) + ',24)';
        });

      if (this.model.drawLabels) {
        container.append('text')
          .attr('class', 'ampersand-graph-label')
          .attr('y', height - 50)
          .attr('dy', '1.25em');

        containers.select('text.ampersand-graph-label')
          .transition()
          .attr('x', ((barWidth * values.length) + barMargin * (values.length - 1)) / 2);
      }

      containers.select('text.ampersand-graph-label')
        .text(function(d) { return d[label]; });

      _.each(values, function(value, index) {
        if (this.model.drawBarBackground) {
          container.append('rect')
            .attr('class', 'ampersand-graph-bar-background ampersand-graph-bar-background-' + index)
            .attr('y', '1.5em')
            .attr('height', height - 76);

          containers.select('rect.ampersand-graph-bar-background-' + index)
            .attr('x', (barWidth + barMargin) * index)
            .attr('width', barWidth);
        }

        container.append('rect')
          .attr('class', 'ampersand-graph-bar ampersand-graph-bar-' + index)
          .attr('width', barWidth)
          .attr('y', height - 50)
          .attr('height', 0);

        if (this.model.drawValues) {
          container.append('text')
            .attr('class', 'ampersand-graph-value ampersand-graph-value-' + index)
            .attr('y', height - 50)
            .attr('dy', '-0.75em')
            .attr('dx', '-0.05em');
        }

        containers.select('rect.ampersand-graph-bar-' + index)
          .transition()
          .attr('x', (barWidth + barMargin) * index)
          .attr('width', barWidth)
          .attr('y', function(d) { return y(d[value]) + 50; })
          .attr('height', function(d) { return height - 100 - y(d[value]); });

        containers.select('text.ampersand-graph-value-' + index)
          .transition()
          .attr('x', barWidth * (index * 2 + 1) / 2 + barMargin * index)
          .attr('y', function(d) { return y(d[value]) + 50; })
          .text(function(d) { return d[value]; });
      }.bind(this));

      chart.select('line.ampersand-graph-ground')
        .transition()
        .attr('x2', (2 + data.length * values.length) * barWidth + data.length * (values.length - 1) * barMargin + (data.length - 1) * barGroupMargin);

      chart.select('g.ampersand-graph-legend')
        .transition()
        .attr('transform', function() {
          return 'translate(' +
            (((2 + data.length * values.length) * barWidth + data.length * (values.length - 1) * barMargin + (data.length - 1) * barGroupMargin) / 2 - this.getBBox().width / 2) +
            ',' + (height + 20) + ')';
        });
    },
    renderLineGraph: function() {
      var chart = this.svg;
      var data = this.model._data.models;

      _.each(data, function(point, index) {
        point.index = index;
      });

      var label = this.model.label;
      var values = this.model.values;
     
      var yAxis = this.svg.select('svg.ampersand-graph-y-axis');
      var yAxisOffset = yAxis.node() ? yAxis.node().getBBox().width : 0;

      var height = 320;
      var graphWidth = this.container.node().getBoundingClientRect().width;
      var a = this.model.lineGroupMarginCoefficient;
      var i = data.length;
      var lineWidth = (graphWidth - yAxisOffset) / ((2 + i) + a * (i - 1));
      var lineGroupMargin = lineWidth * a;

      var y = d3.scale.linear()
        .domain([ 0, d3.max(data, function(d) {
          return Math.max.apply(null, _.remove(_.values(_.pick(d.attributes, values)), function(n) { return !isNaN(n); }));
        }) ])
        .range([ height - 100, 0 ]);

      var yAxisGenerator = d3.svg.axis()
        .scale(y)
        .ticks(5)
        .tickSize(0, 0)
        .orient('left');

      yAxis.call(yAxisGenerator);

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
      
      pathContainers
        .attr('transform', function(d, i) {
          return 'translate(' + (i * (lineWidth + lineGroupMargin) + lineWidth + yAxisOffset / 2) + ',24)';
        });

      container
        .style('opacity', 0)
        .transition()
        .style('opacity', 1);
      
      containers
        .attr('transform', function(d, i) {
          return 'translate(' + (i * (lineWidth + lineGroupMargin) + lineWidth + yAxisOffset / 2) + ',24)';
        });

      if (this.model.drawLabels) {
        container.append('text')
          .attr('class', 'ampersand-graph-label')
          .attr('y', height - 50)
          .attr('dy', '1.25em');

        containers.select('text.ampersand-graph-label')
          .attr('x', lineWidth / 2);
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

      chart.select('g.ampersand-graph-legend')
        .transition()
        .attr('transform', function() { return 'translate(' + (((2 + data.length) * lineWidth + (data.length - 1) * lineGroupMargin) / 2 - this.getBBox().width / 2) + ',' + (height + 20) + ')'; });
    },
    renderAreaGraph: function() {
      var chart = this.svg;
      var data = this.model._data.models;

      _.each(data, function(point, index) {
        point.index = index;
      });

      var label = this.model.label;
      var values = this.model.values;
     
      var yAxis = this.svg.select('svg.ampersand-graph-y-axis');
      var yAxisOffset = yAxis.node() ? yAxis.node().getBBox().width : 0;

      var height = 320;
      var graphWidth = this.container.node().getBoundingClientRect().width;
      var a = this.model.areaGroupMarginCoefficient;
      var i = data.length;
      var areaWidth = (graphWidth - yAxisOffset) / ((2 + i) + a * (i - 1));
      var areaGroupMargin = areaWidth * a;

      var y = d3.scale.linear()
        .domain([ 0, d3.max(data, function(d) {
          return Math.max.apply(null, _.remove(_.values(_.pick(d.attributes, values)), function(n) { return !isNaN(n); }));
        }) ])
        .range([ height - 100, 0 ]);

      var yAxisGenerator = d3.svg.axis()
        .scale(y)
        .ticks(5)
        .tickSize(0, 0)
        .orient('left');

      yAxis.call(yAxisGenerator);

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
      
      containers
        .attr('transform', function(d, i) {
          return 'translate(' + (i * (areaWidth + areaGroupMargin) + areaWidth + yAxisOffset / 2) + ',24)';
        });

      if (this.model.drawLabels) {
        container.append('text')
          .attr('class', 'ampersand-graph-label')
          .attr('y', height - 50)
          .attr('dy', '1.25em');

        containers.select('text.ampersand-graph-label')
          .attr('x', areaWidth / 2);
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
              {
                x: d.index < data.length - 1 ? areaWidth * 3 / 2 : areaWidth / 2,
                y: y(d[value]) + 50
              },
              { 
                x: d.index < data.length - 1 ? areaWidth / 2 + areaGroupMargin: areaWidth / 2,
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

      chart.select('line.ampersand-graph-ground')
        .transition()
        .attr('x2', (2 + data.length) * areaWidth + (data.length - 1) * areaGroupMargin);

      chart.select('g.ampersand-graph-legend')
        .transition()
        .attr('transform', function() { return 'translate(' + (((2 + data.length) * areaWidth + (data.length - 1) * areaGroupMargin) / 2 - this.getBBox().width / 2) + ',' + (height + 20) + ')'; });
    }
  });

  module.exports = {
    State: ChartState,
    View: ChartView
  };
})();
