/// <reference path="../typings/tsd.d.ts" />

import express = require('express');
import http = require('http');

var app = express();
app.set('port', (process.env.PORT || 4000));

app.use(express.static('app'));

var server = http.createServer(app);

server.listen(app.get('port'), () => {
    console.info('Express server listening', {port: app.get('port')});
});
