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
      filterOnApply: [ 'function', false, _.constant(_.noop) ],

      // Filter State
      timeRangeState: 'state',
      calendarState: 'state',
      searchSelectState: 'state',
      filterTrackerState: 'state',

      // GUI Settings
      chartType:  [ 'string', false, 'bar' ],
      drawValues: [ 'boolean', false, true ],
      drawLegend: [ 'boolean', false, true ],
      drawXAxisLabels: [ 'boolean', false, true ],
      drawAllXAxisLabels: [ 'boolean', false, false ],
      drawYAxisLabels: [ 'boolean', false, true ],
      drawYAxisGridLines: [ 'boolean', false, true ],
      drawBarBackground: [ 'boolean', false, true ],
      drawCircleGraph: [ 'boolean', false, false ],
      barMarginCoefficient: [ 'number', false, 0.2 ],
      barGroupMarginCoefficient: [ 'number', false, 1.2 ],
      lineGroupMarginCoefficient: [ 'number', false, 2 ],
      areaGroupMarginCoefficient: [ 'number', false, 2 ],
      circleGraphFunction: 'function',
      circleGraphLabel: [ 'string', false, '' ],
        
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

      var circleGraphRadius = this.model.drawCircleGraph ? 110 : 0;

      d3.select(this.el)
        .style('position', 'relative');

      var container = this.container = d3.select(this.el).append('div')
        .attr('class', 'ampersand-graph-container')
        .style('width', '100%')
        .style('display', 'inline-block')
        .style('overflow-x', 'auto')
        .style('overflow-y', 'hidden');

      var chart = this.svg = container.append('svg')
        .attr('width', '100%')
        .attr('height', this.model.drawLegend ? '25em' : '21em');
      
      var y = d3.scale.linear()
        .domain([ 0, d3.max(data, function(d) {
          return Math.max.apply(null, _.remove(_.values(_.pick(d.attributes, values)), function(n) { return !isNaN(n); }));
        }) ])
        .range([ height - 100, 0 ]);

      var yAxis = null;

      if (this.model.drawYAxisLabels) {
        var yAxisGenerator = d3.svg.axis()
          .scale(y)
          .ticks(5)
          .tickSize(0, 0)
          .orient('left');

        yAxis = chart.append('svg')
          .attr('class', 'ampersand-graph-y-axis')
          .style('overflow', 'visible')
          .attr('x', '2em')
          .attr('y', '4.75em')
          .call(yAxisGenerator);
      }

      if (this.model.drawCircleGraph) {
        this.circleSvg = this.svg.append('svg')
          .attr('class', 'ampersand-graph-circle')
          .attr('width', circleGraphRadius * 2)
          .attr('height', '100%')
          .attr('y', '3em')
          .attr('x', this.container.node().getBoundingClientRect().width - circleGraphRadius * 2);

        var backgroundArcGenerator = d3.svg.arc()
          .outerRadius(circleGraphRadius)
          .innerRadius(circleGraphRadius - 12)
          .startAngle(0)
          .endAngle(Math.PI * 2);

        this.circleSvg.append('path')
          .attr('class', 'ampersand-graph-circle-background')
          .attr('d', backgroundArcGenerator)
          .attr('transform', 'translate(' + circleGraphRadius + ',' + circleGraphRadius + ')');

        this.circleSvg.append('text')
          .attr('class', 'ampersand-graph-circle-text')
          .attr('x', circleGraphRadius)
          .attr('y', circleGraphRadius)
          .text('42');

        this.circleSvg.append('rect')
          .attr('class', 'ampersand-graph-circle-label-background')
          .attr('x', circleGraphRadius)
          .attr('y', circleGraphRadius * 2 + 20)
          .attr('rx', 20)
          .attr('ry', 20)
          .attr('width', circleGraphRadius * 2)
          .attr('height', '2em');

        this.circleSvg.append('text')
          .attr('class', 'ampersand-graph-circle-label')
          .attr('x', circleGraphRadius)
          .attr('y', circleGraphRadius * 2 + 40)
          .text(this.model.circleGraphLabel);
      }
      
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

      var title = chart.append('text')
        .attr('class', 'ampersand-graph-title')
        .attr('x', 0)
        .attr('y', '1.5em')
        .text(this.model.title);

      if (this.model.drawLegend) {
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
                      (((2 + data.length * values.length) * barWidth + data.length * (values.length - 1) * barMargin + (data.length - 1) * barGroupMargin - width) / 2 - circleGraphRadius) +
                      ',' + (height + 20) + ')');
                  break;
                  case 'line':
                  case 'area':
                    legend.attr('transform', 'translate(' + (((2 + data.length) * lineWidth + (data.length - 1) * lineGroupMargin - width) / 2 - circleGraphRadius) + ',' + (height + 20) + ')');
                  break;
                }
              }

              this.renderData();
            }.bind(this), 1);
          }.bind(this))(legend, legendCircle, legendKey, legendBackground, index, yAxis, ground);
        }.bind(this));
      }

      if (this.model.drawYAxisLabels) {
        (function(yAxis, ground) {
          setTimeout(function() {
            if (yAxis) {
              var yAxisOffset = 0;
              yAxis.selectAll('text').each(function() {
                yAxisOffset = Math.max(this.getBBox().width, yAxisOffset);
              });
              yAxis.attr('x', yAxisOffset + 12);
              yAxis.selectAll('line').each(function(d) {
                if (d === 0) {
                  d3.select(this).remove();
                }
              });
              ground.attr('x1', yAxisOffset + 12);
            }
           
            this.renderData();
          }.bind(this), 1);
        }.bind(this))(yAxis, ground);
      }

      if (this.model.drawCircleGraph) {
        (function(yAxis, ground) {
          setTimeout(function() {
            var rectWidth = this.circleSvg.select('text.ampersand-graph-circle-label').node().getBBox().width + 32;
            this.circleSvg.select('rect.ampersand-graph-circle-label-background')
              .attr('width', rectWidth)
              .attr('transform', 'translate(-' + rectWidth / 2 + ',0)');

            this.renderData();
          }.bind(this), 1);
        }.bind(this))(yAxis, ground);
      }

      chart.append('text')
        .attr('class', 'ampersand-graph-no-data')
        .attr('x', '50%')
        .attr('y', '50%')
        .attr('dy', '-4em')
        .style('display', 'none')
        .text('No matching data found.');

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

      var timeRangeState = this.model.timeRangeState = new AmpersandTimeRange.State();
      var timeRangeView = new AmpersandTimeRange.View({ model: timeRangeState });

      filterTime[0][0].appendChild(timeRangeView.el);

      var filterDate = filterWindow.append('section')
        .attr('class', 'ampersand-graph-filter-widget ampersand-graph-filter-date');

      filterDate.append('h6')
        .text('By date:');

      var calendarState = this.model.calendarState = new AmpersandCalendar.State();
      var calendarView = new AmpersandCalendar.View({ model: calendarState });

      filterDate[0][0].appendChild(calendarView.el);

      var filterPersonnel = filterWindow.append('section')
        .attr('class', 'ampersand-graph-filter-widget ampersand-graph-filter-personnel');

      filterPersonnel.append('h6')
        .text('By agent/team:');

      var searchSelectState = this.model.searchSelectState = new AmpersandSearchSelect.State({
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

      var filterTrackerState = this.model.filterTrackerState = new AmpersandFilterTracker.State({
        handles: [{
          model: timeRangeState,
          props: [ 'startTime', 'endTime' ],
          filter: this.model.timeRangeFilter,
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
          filter: this.model.calendarFilter,
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
          filter: this.model.searchSelectFilter,
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
      filterTrackerState.onApply = function(props, options) { 
        this.model.filterOnApply(props);
        if (options.doNotToggle !== true) {
          this.toggleFilterWindow();
        }
      }.bind(this);
      var filterTrackerView = new AmpersandFilterTracker.View({ model: filterTrackerState });

      filterSelections[0][0].appendChild(filterTrackerView.el);
    },
    renderData: function() {
      var data = this.model._data.models;
      if (data.length > 0) {
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

        if (this.model.drawCircleGraph) {
          this.renderCircleGraph();
        }

        this.svg.select('text.ampersand-graph-no-data')
          .style('display', 'none');
      } else {
        this.svg.selectAll('g.ampersand-graph-bar-container').remove();
        this.svg.selectAll('g.ampersand-graph-line-container').remove();
        this.svg.selectAll('g.ampersand-graph-line-area-container').remove();
        this.svg.selectAll('g.ampersand-graph-area-container').remove();
        this.svg.select('text.ampersand-graph-no-data')
          .style('display', undefined);
      }
    },
    renderYAxis: function(y, graphWidth, yAxisOffset, circleGraphRadius, circleGraphPadding) {
      if (!this.model.drawYAxisLabels) {
        return;
      }

      var yAxis = this.svg.select('svg.ampersand-graph-y-axis');
      var yAxisGenerator = d3.svg.axis()
        .scale(y)
        .ticks(5)
        .tickSize(this.model.drawYAxisGridLines ? -graphWidth + yAxisOffset * 2.6 + circleGraphRadius * 2 + circleGraphPadding : 0, 0)
        .tickPadding(12)
        .orient('left');

      yAxis.call(yAxisGenerator);

      (function(yAxis) {
        setTimeout(function() {
          if (yAxis) {
            var yAxisOffset = 0;
            yAxis.selectAll('text').each(function() {
              yAxisOffset = Math.max(this.getBBox().width, yAxisOffset);
            });
            yAxis.attr('x', yAxisOffset + 12);
            yAxis.selectAll('line').each(function(d) {
              if (d === 0) {
                d3.select(this).remove();
              }
            });
            this.svg.select('line.ampersand-graph-ground').attr('x1', yAxisOffset + 12);
          }
        }.bind(this), 1);
      }.bind(this))(yAxis);
    },
    renderXAxis: function(data, container, containers, height, sectionWidth, sectionMargin, values, label) {
      if (!this.model.drawXAxisLabels) {
        return;
      }

      container.append('text')
        .attr('class', 'ampersand-graph-label')
        .style('display', 'none')
        .style('opacity', 0)
        .attr('y', height - 46)
        .attr('dy', '1.25em');

      _.defer(function(data, containers, sectionWidth, values, sectionMargin, label) {
        var width = Math.ceil(_.reduce(data, function(max, item) { return Math.max(max, item[label].toString().length); }, 0) * 6.25);
        var sectionGroupWidth = (sectionWidth * values.length) + sectionMargin * (values.length - 1);
        containers.select('text.ampersand-graph-label')
          .style('opacity', 0)
          .style('display', function(d, i) {
            if (width < sectionGroupWidth || this.model.drawAllXAxisLabels) {
              return undefined;
            }

            return i % Math.ceil(width / sectionGroupWidth) === 0 ? undefined : 'none';
          }.bind(this))
          .transition()
          .style('opacity', 1)
          .attr('x', sectionMargin === 0 ? sectionWidth / 2 : ((sectionWidth * values.length) + sectionMargin * (values.length - 1)) / 2);
      }.bind(this), data, containers, sectionWidth, values, sectionMargin, label);
    },
    renderCircleGraph: function() {
      var circleGraphRadius = 110;

      this.circleSvg
        .attr('x', this.container.node().getBoundingClientRect().width - circleGraphRadius * 2);

      var value = this.model.circleGraphFunction.call(this.model);

      this.circleSvg.select('text.ampersand-graph-circle-text')
        .text(value[0]);

      var data = _.rest(value);

      var arcs = this.circleSvg.selectAll('path.ampersand-graph-circle-foreground')
        .data(data);

      var arc = arcs.enter().append('path')
        .attr('transform', 'translate(' + circleGraphRadius + ',' + circleGraphRadius + ')');

      arc.each(function(d, i) {
         d3.select(this)
          .attr('class', 'ampersand-graph-circle-foreground ampersand-graph-circle-foreground-' + i);
      });

      arcs.each(function(d, i) {
         var foregroundArcGenerator = d3.svg.arc()
          .outerRadius(circleGraphRadius)
          .innerRadius(circleGraphRadius - 12)
          .startAngle(i === 0 ? 0 : Math.PI * 2 * _.reduce(_.take(data, i), function(sum, n) { return sum + n; }))
          .endAngle(Math.PI * 2 * _.reduce(_.take(data, i + 1), function(sum, n) { return sum + n; }));

         d3.select(this)
          .transition()
          .attr('d', foregroundArcGenerator);
      });
    },
    renderBarGraph: function() {
      var chart = this.svg;
      var data = this.model._data.models;
      var label = this.model.label;
      var values = this.model.values;
     
      var circleGraphRadius = this.model.drawCircleGraph ? 110 : 0;
      var circleGraphPadding = this.model.drawCircleGraph ? 70 : 0;

      var yAxis = this.svg.select('svg.ampersand-graph-y-axis');
      var yAxisOffset = 0;
      yAxis.selectAll('text').each(function() {
        yAxisOffset = Math.max(this.getBBox().width, yAxisOffset);
      });

      var height = 320;
      var barCount = data.length * values.length;
      var graphWidth = this.container.node().getBoundingClientRect().width;
      var a = this.model.barGroupMarginCoefficient;
      var b = this.model.barMarginCoefficient;
      var i = data.length;
      var j = values.length;
      var barWidth = Math.max((graphWidth - yAxisOffset - circleGraphRadius * 2 - circleGraphPadding) / ((2 + i * j) + a * (i - 1) + b * i * (j - 1)), 0);
      var barGroupMargin = barWidth * a;
      var barMargin = barWidth * b;

      var y = d3.scale.linear()
        .domain([ 0, d3.max(data, function(d) {
          return Math.max.apply(null, _.remove(_.values(_.pick(d.attributes, values)), function(n) { return !isNaN(n); }));
        }) ])
        .range([ height - 100, 0 ]);

      this.renderYAxis(y, graphWidth, yAxisOffset, circleGraphRadius, circleGraphPadding);

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

      this.renderXAxis(data, container, containers, height, barWidth, barMargin, values, label);

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
            (((2 + data.length * values.length) * barWidth + data.length * (values.length - 1) * barMargin + (data.length - 1) * barGroupMargin - this.getBBox().width) / 2) +
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
      var yAxisOffset = 0;
      yAxis.selectAll('text').each(function() {
        yAxisOffset = Math.max(this.getBBox().width, yAxisOffset);
      });

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

      this.renderYAxis(y, graphWidth, yAxisOffset, 0, 0);

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
          return 'translate(' + (i * (lineWidth + lineGroupMargin) + lineWidth + yAxisOffset) + ',24)';
        });

      container
        .style('opacity', 0)
        .transition()
        .style('opacity', 1);
      
      containers
        .attr('transform', function(d, i) {
          return 'translate(' + (i * (lineWidth + lineGroupMargin) + lineWidth + yAxisOffset) + ',24)';
        });

      this.renderXAxis(data, container, containers, height, lineWidth, 0, values, label);

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
      var yAxisOffset = 0;
      yAxis.selectAll('text').each(function() {
        yAxisOffset = Math.max(this.getBBox().width, yAxisOffset);
      });

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

      this.renderYAxis(y, graphWidth, yAxisOffset, 0, 0);

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
          return 'translate(' + (i * (areaWidth + areaGroupMargin) + areaWidth + yAxisOffset) + ',24)';
        });

      this.renderXAxis(data, container, containers, height, areaWidth, 0, values, label);

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
