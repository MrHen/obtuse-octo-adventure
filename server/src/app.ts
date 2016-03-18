/// <reference path="../typings/main.d.ts" />

import async = require('async');
import body_parser = require('body-parser');
import cors = require('cors');
import express = require('express');
import http = require('http');
import ws = require('ws');

import DataStoreModule = require('./datastore/DataStore')
import {DataStoreInterface} from './datastore/DataStoreInterfaces';

import {GameServiceController} from './services/GameService';

import Routes = require('./routes/Routes');

import ChatRouteController = require('./routes/ChatRouteController');
import GameRouteController = require('./routes/GameRouteController');
import LeaderboardRouteController = require('./routes/LeaderboardRouteController');
import ResultRouteController = require('./routes/ResultRouteController');
import RoomRouteController = require('./routes/RoomRouteController');

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
        var chatController = new ChatRouteController(results.db.chat);
        var gameController = new GameRouteController(results.db.game, results.service);
        var leaderboardController = new LeaderboardRouteController(results.db.result);
        var resultController = new ResultRouteController(results.db.result);
        var roomController = new RoomRouteController(results.db, results.service);

        Routes.initChat('/chat', results.app, chatController);
        Routes.initGame('/game', results.app, gameController);
        Routes.initRoom('/rooms', results.app, roomController);
        Routes.initResult('/results', results.app, resultController);
        Routes.initLeaderboard('/leaderboard', results.app, leaderboardController);

        results.app.use('/', express.static(__dirname + '/dashboard'));

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
        results.db.chat.onGlobalChat(results.sockets.emitGlobalChat);

        results.service.onActionReminder(results.sockets.emitActionReminder);

        results.db.game.onPushedCard(results.service.handleCardPushed);
        results.db.game.onPushedCard(results.sockets.emitCardPushed);

        results.db.game.onPlayerStateChange(results.service.handleStateChange);
        results.db.game.onPlayerStateChange(results.sockets.emitPlayerStateChange);

        autoCb(null, null);
    }]
}, (err, results:any) => {
    console.info('Setup completed', {err: err});
});
