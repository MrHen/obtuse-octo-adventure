/// <reference path="../typings/tsd.d.ts" />

import express = require('express');
import http = require('http');

var app = express();
app.set('port', (process.env.PORT || 5000));

app.use(express.static('app'));

var server = http.createServer(app);
var server_config = { port: 4000 };

server.listen(app.get('port'), () => {
    console.info('Express server listening', {port: server_config.port});
});
