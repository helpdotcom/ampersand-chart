;(function() {
  'use strict';

  var CEREBELLUM = require('./cerebellum.js');
  var HOX = require('../gonads/hox-genes/brain.hox');

  var http = require('http');
  var express = require('express');
  var app = express();
  var server = http.createServer(app);

  CEREBELLUM.log.print([ 'cerebellum', 'hox/brain', 'express', 'cerebrum/user' ], 'module load');

  HOX.express.configure({
    express: express,
    app: app
  });

  server.listen(HOX.express.port);

  CEREBELLUM.log.print({ module: 'express', port: HOX.express.port }, 'module listen');
})();
