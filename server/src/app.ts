/// <reference path="../typings/tsd.d.ts" />

import async = require('async');
import body_parser = require('body-parser');
import cors = require('cors');
import express = require('express');
import http = require('http');
import ws = require('ws');

import ChatRoute = require('./routes/ChatRoute');
import State = require('./state/State');

async.auto({
    'db': (autoCb, results) => {
        var state = State.create();
        state.connect((err) => {
            autoCb(err, state);
        })
    },
    'app': (autoCb, results) => {
        var app = express();
        app.set('port', (process.env.PORT || 5000));

        app.use(cors());
        app.use(body_parser.urlencoded({extended: false}));
        app.use(body_parser.json({limit: '10mb'}));

        autoCb(null, app);
    },
    'routes': ['app', 'db', (autoCb, results) => {
        ChatRoute.init(results.app, '/chat', results.db);

        results.app.get('/', function (req, res) {
            res.send('Hello World!');
        });

        autoCb(null, null);
    }],
    'server': ['app', 'routes', (autoCb, results) => {
        var server = http.createServer(results.app);

        server.listen(results.app.get('port'), () => {
            console.info('Express server listening', {port: results.app.get('port')});
            autoCb(null, server);
        });
    }],
    'websocket': ['server', (autoCb, results) => {
        var wss = new ws.Server({server: results.server});
        console.log("websocket server created");

        wss.on("connection", (client) => {
            var id = setInterval(() => {
                client.send(JSON.stringify(new Date()), () => {

                })
            }, 1000);

            console.log("websocket connection open");

            client.on("close", () => {
                console.log("websocket connection close");
                clearInterval(id)
            })
        });

        autoCb(null, wss);
    }]
}, (err, results:any) => {
    console.info('Setup completed', {err: err});
});