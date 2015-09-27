/// <reference path="../../typings/tsd.d.ts" />

import _ = require('lodash');
import async = require('async');
import express = require('express');
import http_status = require('http-status');

module GameRoute {
    var PLAYER_STATES = {
        CURRENT: 'current',
        DEALING: 'deal',
        DONE: 'done',
        WAITING: 'wait'
    };

    var PLAYER_ACTIONS = {
        DEAL: 'deal',
        HIT: 'hit',
        STAY: 'stay'
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

    export interface GameApiInterface {
        getPlayerCards(gameId:string, player:string, callback:(err:Error, cards:string[])=>any):any;
        getPlayerStates(gameId:string, callback:(err:Error, players:{[player:string]:string})=>any):any;

        setPlayerState(gameId:string, player:string, state:string, callback:(err:Error)=>any):any;

        postGame(callback:(err:Error, gameId:string)=>any):any;
        postPlayerCard(gameId:string, player:string, card:string, callback:(err:Error)=>any):any;
        postResult(player:string, playerResult:number, dealerResult:number, callback:(err:Error)=>any):any;
    }

    export class GameRouteController {
        public static ERROR_INVALID_ACTION = 'Invalid action';
        public static ERROR_INVALID_GAME = 'Invalid game';
        public static ERROR_INVALID_PLAYER = 'Invalid player';
        public static ERROR_INVALID_PLAYERNAME = 'Invalid player name';
        public static ERROR_INVALID_TURN = 'Different player turn';

        private api:GameApiInterface = null;

        public constructor(app:express.Express, base:string, api:GameApiInterface) {
            this.api = api;
            this.init(app, base);
        }

        private getGame(gameId:string, callback:(err:Error, game:Game)=>any):any {
            async.auto({
                'states': (autoCb, results) => this.api.getPlayerStates(gameId, autoCb),
                'players': ['states', (autoCb, results) => autoCb(null, _.keys(results.states))],
                'cards': ['players', (autoCb, results) => {
                    async.mapLimit<string, string[]>(results.players, 3, (player, eachCb) => this.api.getPlayerCards(gameId, player, eachCb), autoCb);
                }]
            }, (err, results) => {
                if (err) {
                    callback(err, null);
                }

                var players:{[name:string]:GamePlayer} = {};

                _.forEach<string>(results.players, (name, key) => {
                    players[name] = {
                        state: results.states[name],
                        cards: results.cards[key]
                    }
                });

                var game:Game = {
                    id: gameId,
                    players:players
                };

                callback(null, game);
            });
        }

        private getCurrentTurn(gameId:string, callback:(err:Error, currentTurn:GameCurrentTurn)=>any):any {
            this.api.getPlayerStates(gameId, (err:Error, players:{[player:string]:string}) => {
                if (err) {
                    callback(err, null);
                }

                var player = _.get<string>(_.invert(players), PLAYER_STATES.CURRENT);
                var actions = [PLAYER_ACTIONS.HIT, PLAYER_ACTIONS.STAY];
                if (!player) {
                    player = _.get<string>(_.invert(players), PLAYER_STATES.DEALING);
                    actions = [PLAYER_ACTIONS.DEAL];
                }

                callback(null, {
                    player: player,
                    actions: actions
                });
            });
        }

        private postAction(gameId:string, player:string, action:string, callback:(err:Error)=>any):any {
            this.api.getPlayerStates(gameId, (err:Error, players:{[player:string]:string}) => {
                if (err) {
                    callback(err);
                }

                var state = players[player];
                console.log("TODO: Do something", {action: action, state: state});

                callback(null);
            });
        }

        private postGame(newPlayers:string[], callback:(err:Error, game:Game)=>any):any {
            var players = _.map(newPlayers, (player) => player.toLowerCase());

            if (_.include(players, DEALER)) {
                return callback(new Error(GameRouteController.ERROR_INVALID_PLAYERNAME), null);
            }

            async.auto({
                'gameId': (autoCb, results) => this.api.postGame(autoCb),
                'dealer': ['gameId', (autoCb, results) => {
                    this.api.setPlayerState(results.gameId, DEALER, PLAYER_STATES.DEALING, autoCb)
                }],
                'states': ['gameId', (autoCb, results) => {
                    async.eachLimit(players, 2, (player, eachCb) => {
                        this.api.setPlayerState(results.gameId, player, PLAYER_STATES.WAITING, eachCb)
                    }, autoCb);
                }]
            }, (err, results:any) => {
                if (err) {
                    return callback(err, null);
                }

                var gamePlayers:{[name:string]:GamePlayer} = {};

                _.forEach<string>(players, (name) => {
                    gamePlayers[name] = {
                        state: PLAYER_STATES.WAITING,
                        cards: []
                    }
                });

                gamePlayers[DEALER] = {
                    state: PLAYER_STATES.DEALING,
                    cards: []
                };

                var game:Game = {
                    id: <string>results.gameId,
                    players:gamePlayers
                };

                callback(null, game);
            });
        }

        private static sendErrorResponse(res:express.Response, err:Error) {
            var status:number = null;
            // TODO This is not entirely appropriate
            var message:string = err.message;
            switch(err.message) {
                case GameRouteController.ERROR_INVALID_ACTION:
                case GameRouteController.ERROR_INVALID_PLAYER:
                case GameRouteController.ERROR_INVALID_TURN:
                    status = http_status.BAD_REQUEST;
                    break;
                default:
                    status = http_status.INTERNAL_SERVER_ERROR;
            }
            return res.status(status).send({message:message});
        }

        private init = (app:express.Express, base:string) => {

            app.get(base + '/:game_id', (req, res) => {
                var gameId = req.params.game_id;

                this.getGame(gameId, (err:Error, game:Game) => {
                    if (err) {
                        return GameRouteController.sendErrorResponse(res, err);
                    }

                    res.json(game);
                });
            });

            app.get(base + '/:game_id/current', (req, res) => {
                var gameId = req.params.game_id;

                this.getCurrentTurn(gameId, (err:Error, currentTurn:GameCurrentTurn) => {
                    if (err) {
                        return GameRouteController.sendErrorResponse(res, err);
                    }

                    res.json(currentTurn);
                });
            });

            app.post(base, (req, res) => {
                var players:string[] = req.body.players;

                this.postGame(players, (err:Error, game:Game) => {
                    if (err) {
                        return GameRouteController.sendErrorResponse(res, err);
                    }

                    res.json(game);
                });
            });

            app.post(base + '/:game_id/actions', (req, res) => {
                var gameId = req.params.game_id;
                var player = req.body.player;
                var action = req.body.action;

                this.postAction(gameId, player, action, (err:Error) => {
                    if (err) {
                        return GameRouteController.sendErrorResponse(res, err);
                    }

                    res.json(action);
                });
            });
        }
    }
}

export = GameRoute;
