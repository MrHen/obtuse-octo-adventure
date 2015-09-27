/// <reference path="../typings/tsd.d.ts" />

import async = require('async');
import body_parser = require('body-parser');
import cors = require('cors');
import express = require('express');
import http = require('http');
import ws = require('ws');

import ChatRoute = require('./routes/ChatRoute');
import DataStoreModule = require('./datastore/DataStore')
import GameRoute = require('./routes/GameRoute');
import Sockets = require('./services/Sockets');

async.auto({
    'db': (autoCb, results) => {
        var state = DataStoreModule.create();
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
        ChatRoute.init(results.app, '/chat', results.db.chat);
        GameRoute.init(results.app, '/game', results.db.game);

        results.app.get('/', function (req, res) {
            res.send('Hello World!');
        });

        autoCb(null, null);
    }],
    'server': ['app', 'routes', (autoCb, results) => {
        autoCb(null, http.createServer(results.app));
    }],
    'sockets': ['server', (autoCb, results) => {
        var sockets = new Sockets.Sockets(results.server);

        console.log("websocket server created");

        autoCb(null, sockets);
    }],
    'listen': ['server', 'sockets', (autoCb, results) => {
        results.server.listen(results.app.get('port'), () => {
            console.info('Express server listening', {port: results.app.get('port')});
            autoCb(null, null);
        });
    }],
    'pubsub': ['db', 'sockets', (autoCb, results) => {
        results.db.chat.onGlobalChat((message) => {
            results.sockets.emitGlobalChat(message);
        });

        autoCb(null, null);
    }]
}, (err, results:any) => {
    console.info('Setup completed', {err: err});
});
