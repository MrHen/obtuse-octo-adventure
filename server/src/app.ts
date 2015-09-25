/// <reference path="../typings/tsd.d.ts" />

import express = require('express');
import http = require('http');

var app = express();
app.set('port', (process.env.PORT || 5000));

app.get('/', function (req, res) {
    res.send('Hello World!');
});

var server = http.createServer(app);

server.listen(app.get('port'), () => {
    console.info('Express server listening', {port: app.get('port')});
});
