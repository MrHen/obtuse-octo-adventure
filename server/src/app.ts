/// <reference path="../typings/tsd.d.ts" />

import async = require('async');
import body_parser = require('body-parser');
import cors = require('cors');
import express = require('express');
import http = require('http');
import ws = require('ws');

import DataStoreModule = require('./datastore/DataStore')
import {DataStoreInterface} from './datastore/DataStoreInterfaces';

import {GameServiceController} from './services/GameService';

import ChatRoute = require('./routes/ChatRoute');
import GameRoute = require('./routes/GameRoute');
import RoomRoute = require('./routes/RoomRoute');
import ResultRoute = require('./routes/ResultRoute');
import LeaderboardRoute = require('./routes/LeaderboardRoute');

import Sockets = require('./services/Sockets');

async.auto({
    'db': (autoCb, results) => {
        var state = DataStoreModule.create();
        state.connect((err) => {
            autoCb(err, state);
        })
    },
    'service': ['db', (autoCb, results) => {
        autoCb(null, new GameServiceController(results.db));
    }],
    'app': (autoCb, results) => {
        var app = express();
        app.set('port', (process.env.PORT || 5000));

        app.use(cors());
        app.use(body_parser.urlencoded({extended: false}));
        app.use(body_parser.json({limit: '10mb'}));

        autoCb(null, app);
    },
    'routes': ['app', 'db', 'service', (autoCb, results) => {
        ChatRoute.init(results.app, '/chat', results.db.chat);
        GameRoute.init(results.app, '/game', results.db.game, results.service);
        RoomRoute.init(results.app, '/rooms', results.db, results.service);
        ResultRoute.init(results.app, '/results', results.db.result);
        LeaderboardRoute.init(results.app, '/leaderboard', results.db.result);

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
    'pubsub': ['db', 'service', 'sockets', (autoCb, results) => {
        results.db.chat.onGlobalChat((message) => {
            results.sockets.emitGlobalChat(message);
        });

        results.service.onActionReminder((reminder) => {
            results.sockets.emitActionReminder(reminder);
        });

        results.db.game.onPushedCard((gameId:string, player:string, card:string) => {
            results.service.handleCardPushed(gameId, player, card);
            results.sockets.emitCardPushed(gameId, player, card);
        });

        results.db.game.onPlayerStateChange((gameId:string, player:string, state:string) => {
            results.service.handleActionStart(gameId, player, state);
            results.sockets.emitPlayerStateChange(gameId, player, state);
        });

        autoCb(null, null);
    }]
}, (err, results:any) => {
    console.info('Setup completed', {err: err});
});