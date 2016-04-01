/// <reference path="../../typings/main.d.ts" />
"use strict";
var _ = require('lodash');
var DataStoreInterfaces_1 = require('./DataStoreInterfaces');
var RoomMemory = (function () {
    function RoomMemory() {
        this.games = {};
        this.players = {};
    }
    RoomMemory.prototype.deletePlayer = function (roomId, player, callback) {
        if (this.players[roomId]) {
            this.players[roomId] = _.without(this.players[roomId], player);
        }
        callback(null);
    };
    RoomMemory.prototype.getRooms = function (callback) {
        callback(null, [RoomMemory.roomName]);
    };
    RoomMemory.prototype.getGame = function (roomId, callback) {
        callback(null, this.games[roomId]);
    };
    RoomMemory.prototype.getPlayers = function (roomId, callback) {
        callback(null, this.players[roomId] || []);
    };
    RoomMemory.prototype.putPlayer = function (roomId, player, callback) {
        if (!player) {
            return callback(new Error(DataStoreInterfaces_1.ERRORS.ROOM.INVALID_PLAYER), null);
        }
        if (!this.players[roomId]) {
            this.players[roomId] = [];
        }
        if (!_.includes(this.players[roomId], player)) {
            this.players[roomId].push(player);
        }
        callback(null, player);
    };
    RoomMemory.prototype.setGame = function (roomId, game, callback) {
        if (!game) {
            return callback(new Error(DataStoreInterfaces_1.ERRORS.ROOM.INVALID_GAME));
        }
        this.games[roomId] = game;
        callback(null);
    };
    RoomMemory.roomName = 'demo';
    return RoomMemory;
}());
module.exports = RoomMemory;
