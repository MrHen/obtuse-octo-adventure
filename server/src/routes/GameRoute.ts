/// <reference path="../../typings/tsd.d.ts" />

import _ = require('lodash');
import async = require('async');
import express = require('express');
import http_status = require('http-status');

import {GameDataStoreInterface} from '../datastore/DataStoreInterfaces.ts';
import {GameRouteInterface} from './RouteInterfaces.ts';

module GameRouteModule {
    var PLAYER_STATES = {
        CURRENT: 'current', DEALING: 'deal', DONE: 'done', WAITING: 'wait'
    };

    var PLAYER_ACTIONS = {
        DEAL: 'deal', HIT: 'hit', STAY: 'stay'
    };

    var DEALER = 'dealer';

    export interface Game {
        id: string;
        players: {[name:string]:GamePlayer};
    }

    export interface GamePlayer {
        state: string;
        cards: string[];
    }

    export interface GameCurrentTurn {
        player: string;
        actions: string[];
    }

    export class GameRouteController implements GameRouteInterface {
        public static ERROR_INVALID_ACTION = 'Invalid action';
        public static ERROR_INVALID_GAME = 'Invalid game';
        public static ERROR_INVALID_PLAYER = 'Invalid player';
        public static ERROR_INVALID_PLAYERNAME = 'Invalid player name';
        public static ERROR_INVALID_TURN = 'Different player turn';

        private api:GameDataStoreInterface = null;

        public constructor(api:GameDataStoreInterface) {
            this.api = api;
        }

        public getGame(gameId:string, callback:(err:Error, game:Game)=>any):any {
            async.auto({
                'states': (autoCb, results) => this.api.getPlayerStates(gameId, autoCb),
                'players': ['states', (autoCb, results) => autoCb(null, _.pluck(results.states, 'player'))],
                'cards': ['players', (autoCb, results) => {
                    async.mapLimit<string, string[]>(results.players, 3, (player, eachCb) => this.api.getPlayerCards(gameId, player, eachCb), autoCb);
                }]
            }, (err, results) => {
                if (err) {
                    callback(err, null);
                }

                var players:{[name:string]:GamePlayer} = {};

                _.forEach<{player:string; state:string}>(results.states, (value, key) => {
                    players[value.player] = {
                        state: value.state,
                        cards: results.cards[key]
                    }
                });

                var game:Game = {
                    id: gameId,
                    players: players
                };

                callback(null, game);
            });
        }

        public getCurrentTurn(gameId:string, callback:(err:Error, currentTurn:GameCurrentTurn)=>any):any {
            this.api.getPlayerStates(gameId, (err:Error, states:{player:string; state:string}[]) => {
                if (err) {
                    callback(err, null);
                }

                var player = _.find<{player:string; state:string}>(states, "state", PLAYER_STATES.CURRENT).player;
                var actions = [PLAYER_ACTIONS.HIT, PLAYER_ACTIONS.STAY];
                if (!player) {
                    player = _.find<{player:string; state:string}>(states, "player", PLAYER_STATES.DEALING).player;
                    actions = [PLAYER_ACTIONS.DEAL];
                }

                callback(null, {
                    player: player, actions: actions
                });
            });
        }

        public postAction(gameId:string, player:string, action:string, callback:(err:Error)=>any):any {
            this.api.getPlayerStates(gameId, (err:Error, states:{player:string; state:string}[]) => {
                if (err) {
                    callback(err);
                }

                var state = _.find<{player:string; state:string}>(states, "player", player).state;
                console.log("TODO: Do something", {action: action, state: state});

                if (action === PLAYER_ACTIONS.HIT) {
                    if (state !== PLAYER_STATES.CURRENT) {
                        return callback(new Error(GameRouteController.ERROR_INVALID_TURN));
                    }
                    this.api.rpoplpush(gameId, player, callback);
                }
            });
        }

        //public postGame(newPlayers:string[], callback:(err:Error, game:Game)=>any):any {
        //    var players = _.map(newPlayers, (player) => player.toLowerCase());
        //
        //    if (_.include(players, DEALER)) {
        //        return callback(new Error(GameRouteController.ERROR_INVALID_PLAYERNAME), null);
        //    }
        //
        //    async.auto({
        //        'gameId': (autoCb, results) => this.api.postGame(autoCb), 'dealer': ['gameId', (autoCb, results) => {
        //            this.api.setPlayerState(results.gameId, DEALER, PLAYER_STATES.DEALING, autoCb)
        //        }],
        //        'states': ['gameId', (autoCb, results) => {
        //            async.eachLimit(players, 2, (player, eachCb) => {
        //                this.api.setPlayerState(results.gameId, player, PLAYER_STATES.WAITING, eachCb)
        //            }, autoCb);
        //        }]
        //    }, (err, results:any) => {
        //        if (err) {
        //            return callback(err, null);
        //        }
        //
        //        var gamePlayers:{[name:string]:GamePlayer} = {};
        //
        //        _.forEach<string>(players, (name) => {
        //            gamePlayers[name] = {
        //                state: PLAYER_STATES.WAITING, cards: []
        //            }
        //        });
        //
        //        gamePlayers[DEALER] = {
        //            state: PLAYER_STATES.DEALING, cards: []
        //        };
        //
        //        var game:Game = {
        //            id: <string>results.gameId, players: gamePlayers
        //        };
        //
        //        callback(null, game);
        //    });
        //}
    }

    function sendErrorResponse(res:express.Response, err:Error) {
        var status:number = null;
        // TODO This is not entirely appropriate
        var message:string = err.message;
        switch (err.message) {
            case GameRouteController.ERROR_INVALID_ACTION:
            case GameRouteController.ERROR_INVALID_PLAYER:
            case GameRouteController.ERROR_INVALID_TURN:
                status = http_status.BAD_REQUEST;
                break;
            default:
                status = http_status.INTERNAL_SERVER_ERROR;
        }
        return res.status(status).send({message: message});
    }

    export var init = (app:express.Express, base:string, api:GameDataStoreInterface) => {
        var controller = new GameRouteController(api);

        app.get(base + '/:game_id/current', (req, res) => {
            var gameId = req.params.game_id;

            controller.getCurrentTurn(gameId, (err:Error, currentTurn:GameCurrentTurn) => {
                if (err) {
                    return sendErrorResponse(res, err);
                }

                res.json(currentTurn);
            });
        });

        app.post(base + '/:game_id/action', (req, res) => {
            var gameId = req.params.game_id;
            var player = req.body.player;
            var action = req.body.action;

            controller.postAction(gameId, player, action, (err:Error) => {
                if (err) {
                    return sendErrorResponse(res, err);
                }

                res.json(action);
            });
        });

        app.get(base + '/:game_id', (req, res) => {
            var gameId = req.params.game_id;

            controller.getGame(gameId, (err:Error, game:Game) => {
                if (err) {
                    return sendErrorResponse(res, err);
                }

                res.json(game);
            });
        });

        //app.post(base, (req, res) => {
        //    var players:string[] = req.body.players;
        //
        //    controller.postGame(players, (err:Error, game:Game) => {
        //        if (err) {
        //            return sendErrorResponse(res, err);
        //        }
        //
        //        res.json(game);
        //    });
        //});
    }
}

export = GameRouteModule;
