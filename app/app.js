/// <reference path="../typings/main.d.ts" />
"use strict";
var async = require('async');
var body_parser = require('body-parser');
var cors = require('cors');
var express = require('express');
var http = require('http');
var DataStoreModule = require('./datastore/DataStore');
var GameService_1 = require('./services/GameService');
var Routes = require('./routes/Routes');
var ChatRouteController = require('./routes/ChatRouteController');
var GameRouteController = require('./routes/GameRouteController');
var LeaderboardRouteController = require('./routes/LeaderboardRouteController');
var ResultRouteController = require('./routes/ResultRouteController');
var RoomRouteController = require('./routes/RoomRouteController');
var Sockets = require('./services/Sockets');
async.auto({
    'db': function (autoCb, results) {
        var state = DataStoreModule.create();
        state.connect(function (err) {
            autoCb(err, state);
        });
    },
    'service': ['db', function (autoCb, results) {
            autoCb(null, new GameService_1.GameServiceController(results.db));
        }],
    'app': function (autoCb, results) {
        var app = express();
        app.set('port', (process.env.PORT || 5000));
        app.use(cors());
        app.use(body_parser.urlencoded({ extended: false }));
        app.use(body_parser.json({ limit: '10mb' }));
        autoCb(null, app);
    },
    'routes': ['app', 'db', 'service', function (autoCb, results) {
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
    'server': ['app', 'routes', function (autoCb, results) {
            autoCb(null, http.createServer(results.app));
        }],
    'sockets': ['server', function (autoCb, results) {
            var sockets = new Sockets.Sockets(results.server);
            console.log("websocket server created");
            autoCb(null, sockets);
        }],
    'listen': ['server', 'sockets', function (autoCb, results) {
            results.server.listen(results.app.get('port'), function () {
                console.info('Express server listening', { port: results.app.get('port') });
                autoCb(null, null);
            });
        }],
    'pubsub': ['db', 'service', 'sockets', function (autoCb, results) {
            results.db.chat.onGlobalChat(results.sockets.emitGlobalChat);
            results.service.onActionReminder(results.sockets.emitActionReminder);
            results.db.game.onPushedCard(results.service.handleCardPushed);
            results.db.game.onPushedCard(results.sockets.emitCardPushed);
            results.db.game.onPlayerStateChange(results.service.handleStateChange);
            results.db.game.onPlayerStateChange(results.sockets.emitPlayerStateChange);
            autoCb(null, null);
        }]
}, function (err, results) {
    console.info('Setup completed', { err: err });
});
