;(function() {
  var d3 = require('d3');
  var _ = require('lodash');

  var AmpersandState = require('ampersand-state');
  var AmpersandView = require('ampersand-view');

  var TimeSliderState = AmpersandState.extend({
    session: {
      startTime: 'number',
      endTime: 'number',
      startX: [ 'number', false , 20 ],
      endX: [ 'number', false, -1 ],
      width: 'number'
    },
    map: function(s, a1, a2, b1, b2) {
      return Math.round(b1 + (s - a1) * (b2 - b1) / (a2 - a1));
    },
    intToTimeString: function(s) {
      var hours = Math.floor(s / 60);
      var minutes = s % 60;
      var meridian = s / 60 >= 12 ? 'pm' : 'am';

      return (hours % 12 !== 0 ? hours % 12 : 12) + ':' + (minutes > 9 ? minutes : '0' + minutes) + ' ' + meridian;
    }
  });

  var TimeSliderView = AmpersandView.extend({
    template: '<svg></svg>',
    autoRender: true,
    initialize: function() {
      this.model._view = this;
    },
    render: function() {
      AmpersandView.prototype.render.call(this);

      var slider = this.svg = d3.select(this.el)
        .style('overflow', 'visible')
        .attr('width', '100%')
        .attr('height', '4em');

      var leftMidnight = slider.append('text')
        .attr('class', 'time-slider-midnight time-slider-midnight-left')
        .attr('x', '5%')
        .attr('y', '1.5em')
        .text('12 am');

      var rightMidnight = slider.append('text')
        .attr('class', 'time-slider-midnight time-slider-midnight-right')
        .attr('x', '95%')
        .attr('y', '1.5em')
        .text('12 am');

      var noon = slider.append('text')
        .attr('class', 'time-slider-midnight time-slider-noon')
        .attr('x', '50%')
        .attr('y', '1.5em')
        .text('12 pm');

      var bar = slider.append('rect')
        .attr('class', 'time-slider-bar')
        .attr('x', '5%')
        .attr('y', '2em')
        .attr('width', '90%')
        .attr('height', '0.5em')
        .attr('rx', '0.25em')
        .attr('ry', '0.25em');

      var durationBar = slider.append('line')
        .attr('class', 'time-slider-duration')
        .attr('x1', '5%')
        .attr('y1', '2.25em')
        .attr('x2', '95%')
        .attr('y2', '2.25em');

      var handleStartDrag = d3.behavior.drag()
        .on('dragstart', function(d) {
          d.view.showToolTip(d.model.startX);
        })
        .on('drag', function(d, i) {
          var bar = d.view.svg.select('rect.time-slider-bar')[0][0];
          d.model.width = bar.getBBox().width;
          d.model.endX = d.model.endX > -1 ? d.model.endX : d.model.width + 20;
          d.x = Math.max(20, d3.mouse(bar)[0]);
          d.x = Math.min(d.x, d.model.endX);
          d.model.startX = d.x;
          d3.select(this)
            .attr('cx', d.model.startX);
          d.view.resizeDuration();
          d.model.startTime = d.model.map(d.model.startX - 20, 0, d.model.width, 0, 1439);
          d.view.setToolTip(d.model.startX, d.model.startTime);
        })
        .on('dragend', function(d, i) {
          d.view.hideToolTip();
        });

      var handleStart = slider.append('circle')
        .data([{ x: 0, model: this.model, view: this }])
        .attr('class', 'time-slider-handle time-slider-handle-start')
        .attr('cy', '2.25em')
        .attr('cx', '5%')
        .attr('r', '0.5em')
        .call(handleStartDrag);

      var handleEndDrag = d3.behavior.drag()
        .on('dragstart', function(d) {
          d.view.showToolTip(d.model.endX);
        })
        .on('drag', function(d, i) {
          var bar = d.view.svg.select('rect.time-slider-bar')[0][0];
          d.model.width = bar.getBBox().width;
          d.x = Math.min(d.model.width + 20, d3.mouse(bar)[0]);
          d.x = Math.max(d.x, d.model.startX);
          d.model.endX = d.x;
          d3.select(this)
            .attr('cx', d.model.endX);
          d.view.resizeDuration();
          d.model.endTime = d.model.map(d.model.endX - 20, 0, d.model.width, 0, 1439);
          d.view.setToolTip(d.model.endX, d.model.endTime);
        })
        .on('dragend', function(d, i) {
          d.view.hideToolTip();
        });

      var handleEnd = slider.append('circle')
        .data([{ x: 0, model: this.model, view: this }])
        .attr('class', 'time-slider-handle time-slider-handle-end')
        .attr('cy', '2.25em')
        .attr('cx', '95%')
        .attr('r', '0.5em')
        .call(handleEndDrag);

      var toolTip = slider.append('g')
        .attr('class', 'time-slider-tool-tip')
        .style('opacity', 0);
      
      var toolTipRect = toolTip.append('rect')
        .attr('class', 'time-slider-tool-tip-rect')
        .attr('width', '4em')
        .attr('height', '1.5em');

      var toolTipTail = toolTip.append('polygon')
        .attr('class', 'time-slider-tool-tip-tail')
        .attr('points', '0, 0 20, 0 10, 10')
        .attr('transform', 'translate(22, 23)');

      var toolTipText = toolTip.append('text')
        .attr('class', 'time-slider-tool-tip-text')
        .attr('x', '2.6em')
        .attr('y', '1.35em')
        .text('2:15 pm');
    },
    showToolTip: function(x) {
      this.svg.select('g.time-slider-tool-tip')
        .attr('transform', 'translate(' + (x - 32) + ', -10)')
        .transition()
        .style('opacity', 1);
    },
    setToolTip: function(x, t) {
      this.svg.select('g.time-slider-tool-tip')
        .attr('transform', 'translate(' + (x - 32) + ', -10)');

      this.svg.select('text.time-slider-tool-tip-text')
        .text(this.model.intToTimeString(t));
    },
    hideToolTip: function() {
      this.svg.select('g.time-slider-tool-tip')
        .transition()
        .duration(2000)
        .style('opacity', 0);
    },
    resizeDuration: function() {
      this.svg.select('line.time-slider-duration')
        .attr('x1', this.model.startX)
        .attr('x2', this.model.endX);
    }
  });

  module.exports = {
    State: TimeSliderState,
    View: TimeSliderView
  };
})();
