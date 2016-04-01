/// <reference path="../../typings/main.d.ts" />
"use strict";
/// <reference path="../api.d.ts" />
var _ = require('lodash');
var async = require('async');
var GameConstants = require('../services/GameConstants');
var RouteErrors = require('./RouteErrors');
var RoomRouteController = (function () {
    function RoomRouteController(api, service) {
        this.api = null;
        this.service = null;
        this.api = api;
        this.service = service;
    }
    RoomRouteController.prototype.getRoom = function (roomId, callback) {
        var _this = this;
        async.auto({
            'game': [function (autoCb, results) { return _this.api.room.getGame(roomId, autoCb); }],
            'players': [function (autoCb, results) { return _this.api.room.getPlayers(roomId, autoCb); }]
        }, function (err, results) {
            if (err) {
                return callback(err, null);
            }
            var response = {
                room_id: roomId,
                game_id: results.game,
                players: results.players
            };
            callback(null, response);
        });
    };
    RoomRouteController.prototype.getRooms = function (callback) {
        var _this = this;
        async.auto({
            'roomIds': function (autoCb, results) { return _this.api.room.getRooms(autoCb); },
            'rooms': ['roomIds', function (autoCb, results) {
                    async.mapLimit(results.roomIds, 10, function (roomId, mapCb) {
                        _this.getRoom(roomId, mapCb);
                    }, autoCb);
                }]
        }, function (err, results) {
            if (err) {
                return callback(err, null);
            }
            callback(null, results.rooms);
        });
    };
    RoomRouteController.prototype.postPlayer = function (roomId, player, callback) {
        if (player !== 'player') {
            return callback(new Error(RouteErrors.ERROR_INVALID_PLAYER), null);
        }
        this.api.room.putPlayer(roomId, player, callback);
    };
    RoomRouteController.prototype.postGame = function (roomId, callback) {
        var _this = this;
        async.auto({
            'game': [function (autoCb, results) { return _this.api.room.getGame(roomId, autoCb); }],
            'players': [function (autoCb, results) { return _this.api.room.getPlayers(roomId, autoCb); }],
            'states': ['game', function (autoCb, results) { return _this.api.game.getPlayerStates(results.game, autoCb); }],
            'new_game': ['game', 'players', function (autoCb, results) {
                    var gameEnded = _this.service.isGameEnded(results.states);
                    if (results.game && !gameEnded) {
                    }
                    if (!results.players || !results.players.length) {
                        return autoCb(new Error(RouteErrors.ERROR_MISSING_PLAYER), null);
                    }
                    _this.api.game.postGame(autoCb);
                }],
            'assignGame': ['new_game', function (autoCb, results) {
                    return _this.api.room.setGame(roomId, results.new_game, autoCb);
                }],
            'shuffle': ['new_game', function (autoCb, results) {
                    _this.service.shuffle(results.new_game, autoCb);
                }],
            'player_states': ['players', 'new_game', 'shuffle', function (autoCb, results) {
                    var players = results.players.concat(GameConstants.DEALER);
                    return autoCb(null, _.map(players, function (player) {
                        return {
                            player: player,
                            state: GameConstants.PLAYER_STATES.DEALING
                        };
                    }));
                }],
            'set_states': ['player_states', function (autoCb, results) {
                    async.eachLimit(results.player_states, 3, function (state, eachCb) {
                        _this.api.game.setPlayerState(results.new_game, state.player, state.state, eachCb);
                    }, autoCb);
                }]
        }, function (err, results) {
            if (err) {
                return callback(err, null);
            }
            var players = {};
            _.forEach(results.player_states, function (value) {
                players[value.player] = {
                    state: value.state,
                    cards: []
                };
            });
            var game = {
                id: results.new_game,
                players: players,
                ended: false
            };
            callback(null, game);
        });
    };
    return RoomRouteController;
}());
module.exports = RoomRouteController;
