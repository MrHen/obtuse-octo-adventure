/// <reference path="../typings/tsd.d.ts" />
var config = require('config');
var express = require('express');
var http = require('http');
var app = express();
app.set('port', (process.env.PORT || 4000));
// When running on devboxes, override the default config loading
app.use('/config/default.json', function (req, res) {
    res.send(JSON.parse(JSON.stringify(config)));
});
app.use('/', express.static('app'));
var server = http.createServer(app);
server.listen(app.get('port'), function () {
    console.info('Express server listening', { port: app.get('port') });
});
