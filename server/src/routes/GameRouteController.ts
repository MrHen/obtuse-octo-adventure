/// <reference path="../../typings/main.d.ts" />

/// <reference path="../api.d.ts" />

import _ = require('lodash');
import async = require('async');

import GameConstants = require('../services/GameConstants');
import {GameDataStoreInterface} from '../datastore/DataStoreInterfaces';
import {GameServiceInterface} from '../services/GameService'

import {GameRouteControllerInterface} from './Routes';

import RouteErrors = require('./RouteErrors');

class GameRouteController implements GameRouteControllerInterface {
    private api:GameDataStoreInterface = null;
    private service:GameServiceInterface = null;

    public constructor(api:GameDataStoreInterface, service:GameServiceInterface) {
        this.api = api;
        this.service = service;
    }

    public getGame(gameId:string, callback:(err:Error, game:ApiResponses.GameResponse)=>any):any {
        async.auto({
            'states': (autoCb, results) => this.api.getPlayerStates(gameId, autoCb),
            'players': ['states', (autoCb, results) => autoCb(null, _.map(results.states, 'player'))],
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

            // Hide one dealer card and the dealer score when necessary
            if (!game.ended) {
                var states = _.reject(results.states, {player: GameConstants.DEALER});
                states = _.reject(states, {'state': GameConstants.PLAYER_STATES.STAY});
                states = _.reject(states, {'state': GameConstants.PLAYER_STATES.BUST});
                if (states.length) {
                    players[GameConstants.DEALER].score = null;
                    if (players[GameConstants.DEALER].cards.length > 1) {
                        players[GameConstants.DEALER].cards[0] = GameConstants.CARD_HIDDEN;
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

            var player = _.find<{player:string; state:string}>(states, "state", GameConstants.PLAYER_STATES.CURRENT).player;
            var actions = [GameConstants.PLAYER_ACTIONS.HIT, GameConstants.PLAYER_ACTIONS.STAY];
            if (!player) {
                player = _.find<{player:string; state:string}>(states, "player", GameConstants.PLAYER_STATES.DEALING).player;
                actions = [GameConstants.PLAYER_ACTIONS.DEAL];
            }

            callback(null, {player: player, actions: actions});
        });
    }

    public postAction(gameId:string, player:string, action:string, callback:(err:Error)=>any):any {
        this.api.getPlayerStates(gameId, (err:Error, states:{player:string; state:string}[]) => {
            if (err) {
                callback(err);
            }

            var playerState = _.find<{player:string; state:string}>(states, "player", player);
            if (!playerState) {
                return callback(new Error(RouteErrors.ERROR_INVALID_PLAYER));
            }

            var state = playerState.state;

            if (action === GameConstants.PLAYER_ACTIONS.HIT) {
                if (state !== GameConstants.PLAYER_STATES.CURRENT) {
                    return callback(new Error(RouteErrors.ERROR_INVALID_TURN));
                }
                return this.api.rpoplpush(gameId, player, callback);
            }

            if (action === GameConstants.PLAYER_ACTIONS.STAY) {
                if (state !== GameConstants.PLAYER_STATES.CURRENT) {
                    return callback(new Error(RouteErrors.ERROR_INVALID_TURN));
                }
                return this.api.setPlayerState(gameId, player, GameConstants.PLAYER_STATES.STAY, callback);
            }

            return callback(new Error(RouteErrors.ERROR_INVALID_ACTION));
        });
    }
}

export = GameRouteController;
