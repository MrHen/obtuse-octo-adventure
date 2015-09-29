/// <reference path="../../typings/tsd.d.ts" />

import _ = require('lodash');
import async = require('async');
import express = require('express');
import http_status = require('http-status');

import {RoomEventController} from '../services/GameService';
import {DataStoreInterface} from '../datastore/DataStoreInterfaces';
import {RoomRouteInterface, GameResponse, RoomResponse} from './RouteInterfaces';

module RoomRoute {
    export interface Game {
        id: string;
        players: {[name:string]:GamePlayer};
    }

    export interface GamePlayer {
        state: string;
        cards: string[];
    }

    export interface PlayerState {
        player: string;
        state: string;
    }

    export class RoomRouteController implements RoomRouteInterface {
        private static DEALER = 'dealer';
        private static PLAYER = 'player';

        public static ERROR_GAME_EXISTS = 'Game started';
        public static ERROR_MISSING_PLAYER = 'No players';
        public static ERROR_INVALID_PLAYER = 'Invalid player';

        private api:DataStoreInterface = null;
        private service:RoomEventController = null;

        constructor(api:DataStoreInterface, service:RoomEventController) {
            this.api = api;
            this.service = service;
        }

        getRoom(roomId:string, callback:(err:Error, room:RoomResponse)=>any):any {
            async.auto({
                'game': [(autoCb, results) => this.api.room.getGame(roomId, autoCb)],
                'players': [(autoCb, results) => this.api.room.getPlayers(roomId, autoCb)]
            }, (err, results) => {
                if (err) {
                    return callback(err, null);
                }

                var response:RoomResponse = {
                    room_id: roomId,
                    game_id: results.game,
                    players: results.players
                };

                callback(null, response);
            });
        }
        getRooms(callback:(err:Error, rooms:RoomResponse[])=>any):any {

            async.auto({
                'roomIds': (autoCb, results) => this.api.room.getRooms(autoCb),
                'rooms': ['roomIds', (autoCb, results) => {
                    async.mapLimit(results.roomIds, 10, (roomId:string, mapCb) => {
                        this.getRoom(roomId, mapCb)
                    }, autoCb);
                }]
            }, (err, results) => {
                if (err) {
                    return callback(err, null);
                }

                callback(null, results.rooms);
            });
        }

        postPlayer(roomId:string, player:string, callback:(err:Error, player:string)=>any):any {
            if (player !== 'player') {
                return callback(new Error(RoomRouteController.ERROR_INVALID_PLAYER), null);
            }
            this.api.room.putPlayer(roomId, player, callback);
        }

        postGame(roomId:string, callback:(err:Error, game:GameResponse)=>any):any {
            async.auto({
                'game': [(autoCb, results) => this.api.room.getGame(roomId, autoCb)],
                'players': [(autoCb, results) => this.api.room.getPlayers(roomId, autoCb)],
                'states': ['game', (autoCb, results) => this.api.game.getPlayerStates(results.game, autoCb)],
                'new_game': ['game', 'players', (autoCb, results) => {
                    var gameEnded = this.service.isGameEnded(results.states);

                    if (results.game && !gameEnded) {
                        // TODO reset game -- mark game as a loss/quit? detect "ended" game?
                        return autoCb(new Error(RoomRouteController.ERROR_GAME_EXISTS), null);
                    }

                    if (!results.players || !results.players.length) {
                        return autoCb(new Error(RoomRouteController.ERROR_MISSING_PLAYER), null);
                    }

                    this.api.game.postGame(autoCb);
                }],
                'assignGame': ['new_game', (autoCb, results) => {
                    return this.api.room.setGame(roomId, results.new_game, autoCb);
                }],
                'shuffle': ['new_game', (autoCb, results) => {
                    this.service.handleShuffle(results.new_game, autoCb);
                }],
                'player_states': ['players', 'new_game', 'shuffle', (autoCb, results) => {
                    var players = results.players.concat('dealer');

                    return autoCb(null, _.map(players, (player) => {
                        return {
                            player: player,
                            state: 'deal'
                        };
                    }));
                }],
                'set_states': ['player_states', (autoCb, results) => {
                    async.eachLimit<PlayerState>(results.player_states, 3, (state, eachCb) => {
                        this.api.game.setPlayerState(results.new_game, state.player, state.state, eachCb)
                    }, autoCb);
                }]
            }, (err, results:any) => {
                if (err) {
                    return callback(err, null);
                }

                var players:{[name:string]:GamePlayer} = {};

                _.forEach<{player:string; state:string}>(results.player_states, (value, key) => {
                    players[value.player] = {
                        state: value.state,
                        cards: []
                    }
                });

                var game = {
                    id: results.new_game,
                    players: players,
                    ended: false // TODO auto-end on dealer 21
                };

                callback(null, game);
            });
        }
    }

    function sendErrorResponse(res:express.Response, err:Error) {
        var status:number = null;
        // TODO This is not entirely appropriate
        var message:string = err.message;
        switch(err.message) {
            default:
                status = http_status.INTERNAL_SERVER_ERROR;
        }
        return res.status(status).send({message:message});
    }

    export function init(app:express.Express, base:string, api:DataStoreInterface, service:RoomEventController) {
        var controller = new RoomRouteController(api, service);

        app.put(base + '/:room_id/players/:player_id', function (req, res) {
            var roomId = req.params.room_id;
            var playerId = req.params.player_id;

            controller.postPlayer(roomId, playerId, (err:Error, message:string) => {
                if (err) {
                    return sendErrorResponse(res, err);
                }

                res.send(message);
            });
        });

        app.post(base + '/:room_id/game', function (req, res) {
            var roomId = req.params.room_id;

            controller.postGame(roomId, (err:Error, game:GameResponse) => {
                if (err) {
                    return sendErrorResponse(res, err);
                }

                res.send(game);
            });
        });

        app.get(base + '/:room_id', function (req, res) {
            var roomId = req.params.room_id;

            controller.getRoom(roomId, (err:Error, room:RoomResponse) => {
                if (err) {
                    return sendErrorResponse(res, err);
                }

                res.json(room);
            });
        });

        app.get(base, function (req, res) {
            controller.getRooms((err:Error, messages:RoomResponse[]) => {
                if (err) {
                    return sendErrorResponse(res, err);
                }

                res.send(messages);
            });
        });
    }
}

export = RoomRoute;
