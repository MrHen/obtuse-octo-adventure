/// <reference path="../typings/tsd.d.ts" />

import express = require('express');
import http = require('http');
import ws = require('ws');

var app = express();
app.set('port', (process.env.PORT || 5000));

app.get('/', function (req, res) {
    res.send('Hello World!');
});

var server = http.createServer(app);

server.listen(app.get('port'), () => {
    console.info('Express server listening', {port: app.get('port')});
});

var wss = new ws.Server({server: server})
console.log("websocket server created")

wss.on("connection", (client:ws.WebSocket) => {
    var id = setInterval(() => {
        client.send(JSON.stringify(new Date()), () => {

        })
    }, 1000);

    console.log("websocket connection open")

    client.on("close", () => {
        console.log("websocket connection close")
        clearInterval(id)
    })
});
