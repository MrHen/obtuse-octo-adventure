/// <reference path="../../typings/tsd.d.ts" />

/// <reference path="../api.d.ts" />

import _ = require('lodash');
import async = require('async');
import express = require('express');
import http_status = require('http-status');

import {GameDataStoreInterface} from '../datastore/DataStoreInterfaces';
import {GameRouteInterface} from './RouteInterfaces';
import {GameServiceInterface} from '../services/GameService'

module GameRouteModule {
    var PLAYER_STATES = {
        CURRENT: 'current',
        DEALING: 'deal',
        DONE: 'stay',
        WAITING: 'wait'
    };

    var PLAYER_ACTIONS = {
        DEAL: 'deal', HIT: 'hit', STAY: 'stay'
    };

    var DEALER = 'dealer';

    export class GameRouteController implements GameRouteInterface {
        public static ERROR_INVALID_ACTION = 'Invalid action';
        public static ERROR_INVALID_GAME = 'Invalid game';
        public static ERROR_INVALID_PLAYER = 'Invalid player';
        public static ERROR_INVALID_PLAYERNAME = 'Invalid player name';
        public static ERROR_INVALID_TURN = 'Different player turn';

        private api:GameDataStoreInterface = null;
        private service:GameServiceInterface = null;

        public constructor(api:GameDataStoreInterface, service:GameServiceInterface) {
            this.api = api;
            this.service = service;
        }

        public getGame(gameId:string, callback:(err:Error, game:ApiResponses.GameResponse)=>any):any {
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

                var players:{[name:string]:ApiResponses.GamePlayerResponse} = {};

                _.forEach<{player:string; state:string}>(results.states, (value, key) => {
                    players[value.player] = {
                        state: value.state,
                        cards: results.cards[key],
                        score: this.service.valueForCards(results.cards[key])
                    }
                });

                var game:ApiResponses.GameResponse = {
                    id: gameId,
                    players: players,
                    ended: this.service.isGameEnded(results.states)
                };

                if (!game.ended) {
                    var states = _.reject(results.states, {player: 'dealer'});
                    states = _.reject(states, {'state': PLAYER_STATES.DONE});
                    states = _.reject(states, {'state': 'bust'});
                    if (states.length) {
                        players['dealer'].score = null;
                        if (players['dealer'].cards.length > 1) {
                            players['dealer'].cards[0] = 'XX';
                        }
                    }
                }

                callback(null, game);
            });
        }

        public getCurrentTurn(gameId:string, callback:(err:Error, currentTurn:ApiResponses.GameCurrentTurnResponse)=>any):any {
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

                var playerstate = _.find<{player:string; state:string}>(states, "player", player);
                if (!playerstate) {
                    return callback(new Error(GameRouteController.ERROR_INVALID_PLAYER));
                }

                var state = playerstate.state;
                console.log("TODO: Do something", {action: action, state: state});

                if (action === PLAYER_ACTIONS.HIT) {
                    if (state !== PLAYER_STATES.CURRENT) {
                        return callback(new Error(GameRouteController.ERROR_INVALID_TURN));
                    }
                    return this.api.rpoplpush(gameId, player, callback);
                }

                if (action === PLAYER_ACTIONS.STAY) {
                    if (state !== PLAYER_STATES.CURRENT) {
                        return callback(new Error(GameRouteController.ERROR_INVALID_TURN));
                    }
                    return this.api.setPlayerState(gameId, player, PLAYER_STATES.DONE, callback);
                }

                return callback(new Error(GameRouteController.ERROR_INVALID_ACTION));
            });
        }
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

    export var init = (app:express.Express, base:string, api:GameDataStoreInterface, service:GameServiceInterface) => {
        var controller = new GameRouteController(api, service);

        app.get(base + '/:game_id/current', (req, res) => {
            var gameId = req.params.game_id;

            controller.getCurrentTurn(gameId, (err:Error, currentTurn:ApiResponses.GameCurrentTurnResponse) => {
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

            controller.getGame(gameId, (err:Error, game:ApiResponses.GameResponse) => {
                if (err) {
                    return sendErrorResponse(res, err);
                }

                res.json(game);
            });
        });
    }
}

export = GameRouteModule;
