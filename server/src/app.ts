/// <reference path="../typings/tsd.d.ts" />

import async = require('async');
import body_parser = require('body-parser');
import cors = require('cors');
import express = require('express');
import http = require('http');
import ws = require('ws');

import DataStoreModule = require('./datastore/DataStore')
import {DataStoreInterface} from './datastore/DataStoreInterfaces';

import ChatRoute = require('./routes/ChatRoute');
import GameRoute = require('./routes/GameRoute');
import RoomRoute = require('./routes/RoomRoute');

import Sockets = require('./services/Sockets');

async.auto({
    'db': (autoCb, results) => {
        var state = DataStoreModule.create();
        state.connect((err) => {
            autoCb(err, state);
        })
    },
    'prepGame': ['db', (autoCb, results) => {
        var api:DataStoreInterface = results.db;

        var room_id = 'demo';

        async.auto({
            'addDealer': [(prepCb, results) => {
                api.room.putPlayer(room_id, 'dealer', prepCb)
            }],
            'addPlayer': (prepCb, results) => {
                api.room.putPlayer(room_id, 'player', prepCb)
            },
            'players': ['addDealer', 'addPlayer', (prepCb, results) => {
                api.room.getPlayers(room_id, prepCb)
            }],
            'existing_game': (prepCb, results) => {
                api.room.getGame(room_id, prepCb);
            },
            'new_game': ['existing_game', (prepCb, results) => {
                if (results.existing_game) {
                    return prepCb(null, results.existing_game);
                }

                api.game.postGame(prepCb);
            }],
            'assignGame': ['existing_game', 'new_game', (prepCb, results) => {
                if (results.existing_game !== results.new_game) {
                    return api.room.setGame(room_id, results.new_game, prepCb);
                }

                prepCb(null, null);
            }],
            'player_states': ['players', 'new_game', (prepCb, results) => {
                async.eachLimit(results.players, 3, (player:string, eachCb) => {
                    var state = player === 'dealer' ? 'deal' : 'wait';
                    api.game.setPlayerState(results.new_game, player, state, eachCb)
                })
            }]
        }, (err, results:any) => {
            autoCb(err, null);
        });
    }],
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
        RoomRoute.init(results.app, '/rooms', results.db.room);

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
