/// <reference path="../../typings/main.d.ts" />
"use strict";
/// <reference path="../api.d.ts" />
var _ = require('lodash');
var async = require('async');
var GameConstants = require('../services/GameConstants');
var RouteErrors = require('./RouteErrors');
var GameRouteController = (function () {
    function GameRouteController(api, service) {
        this.api = null;
        this.service = null;
        this.api = api;
        this.service = service;
    }
    GameRouteController.prototype.getGame = function (gameId, callback) {
        var _this = this;
        async.auto({
            'states': function (autoCb, results) { return _this.api.getPlayerStates(gameId, autoCb); },
            'players': ['states', function (autoCb, results) { return autoCb(null, _.map(results.states, 'player')); }],
            'cards': ['players', function (autoCb, results) {
                    async.mapLimit(results.players, 3, function (player, eachCb) { return _this.api.getPlayerCards(gameId, player, eachCb); }, autoCb);
                }]
        }, function (err, results) {
            if (err) {
                callback(err, null);
            }
            var players = {};
            _.forEach(results.states, function (value, key) {
                players[value.player] = {
                    state: value.state,
                    cards: results.cards[key],
                    score: _this.service.valueForCards(results.cards[key])
                };
            });
            var game = {
                id: gameId,
                players: players,
                ended: _this.service.isGameEnded(results.states)
            };
            // Hide one dealer card and the dealer score when necessary
            if (!game.ended) {
                var states = _.reject(results.states, { player: GameConstants.DEALER });
                states = _.reject(states, { 'state': GameConstants.PLAYER_STATES.STAY });
                states = _.reject(states, { 'state': GameConstants.PLAYER_STATES.BUST });
                if (states.length) {
                    players[GameConstants.DEALER].score = null;
                    if (players[GameConstants.DEALER].cards.length > 1) {
                        players[GameConstants.DEALER].cards[0] = GameConstants.CARD_HIDDEN;
                    }
                }
            }
            callback(null, game);
        });
    };
    GameRouteController.prototype.getCurrentTurn = function (gameId, callback) {
        this.api.getPlayerStates(gameId, function (err, states) {
            if (err) {
                callback(err, null);
            }
            var player = _.find(states, "state", GameConstants.PLAYER_STATES.CURRENT).player;
            var actions = [GameConstants.PLAYER_ACTIONS.HIT, GameConstants.PLAYER_ACTIONS.STAY];
            if (!player) {
                player = _.find(states, "player", GameConstants.PLAYER_STATES.DEALING).player;
                actions = [GameConstants.PLAYER_ACTIONS.DEAL];
            }
            callback(null, { player: player, actions: actions });
        });
    };
    GameRouteController.prototype.postAction = function (gameId, player, action, callback) {
        var _this = this;
        this.api.getPlayerStates(gameId, function (err, states) {
            if (err) {
                callback(err);
            }
            var playerState = _.find(states, "player", player);
            if (!playerState) {
                return callback(new Error(RouteErrors.ERROR_INVALID_PLAYER));
            }
            var state = playerState.state;
            if (action === GameConstants.PLAYER_ACTIONS.HIT) {
                if (state !== GameConstants.PLAYER_STATES.CURRENT) {
                    return callback(new Error(RouteErrors.ERROR_INVALID_TURN));
                }
                return _this.api.rpoplpush(gameId, player, callback);
            }
            if (action === GameConstants.PLAYER_ACTIONS.STAY) {
                if (state !== GameConstants.PLAYER_STATES.CURRENT) {
                    return callback(new Error(RouteErrors.ERROR_INVALID_TURN));
                }
                return _this.api.setPlayerState(gameId, player, GameConstants.PLAYER_STATES.STAY, callback);
            }
            return callback(new Error(RouteErrors.ERROR_INVALID_ACTION));
        });
    };
    return GameRouteController;
}());
module.exports = GameRouteController;
