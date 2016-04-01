/// <reference path="../../typings/main.d.ts" />
"use strict";
var _ = require('lodash');
var events = require('events');
var GameConstants_1 = require('../services/GameConstants');
var DataStoreInterfaces_1 = require('./DataStoreInterfaces');
var GameMemory = (function () {
    function GameMemory() {
        this.nextGameId = 1;
        this.games = {};
        this.emitter = new events.EventEmitter();
    }
    GameMemory.prototype.countDeck = function (gameId, callback) {
        if (!this.getGame(gameId).deck) {
            return callback(null, 0);
        }
        callback(null, this.getGame(gameId).deck.length);
    };
    GameMemory.prototype.getGame = function (gameId) {
        if (!this.games[gameId]) {
            this.games[gameId] = {
                deck: null,
                players: {}
            };
        }
        return this.games[gameId];
    };
    GameMemory.prototype.getPlayer = function (gameId, player) {
        var game = this.getGame(gameId);
        if (!game.players[player]) {
            game.players[player] = {
                cards: null,
                state: null
            };
        }
        return game.players[player];
    };
    GameMemory.prototype.getPlayerCards = function (gameId, player, callback) {
        callback(null, _.clone(this.getPlayer(gameId, player).cards) || []);
    };
    GameMemory.prototype.getPlayerStates = function (gameId, callback) {
        var players = this.getGame(gameId).players;
        var mapped = _.map(players, function (value, key) {
            return { player: key, state: value.state };
        });
        callback(null, _.clone(mapped));
    };
    GameMemory.prototype.setDeck = function (gameId, cards, callback) {
        console.log('DataStoreMemory.setDeck', gameId, cards);
        this.getGame(gameId).deck = _.clone(cards);
        callback(null);
    };
    GameMemory.prototype.setPlayerState = function (gameId, player, state, callback) {
        this.getPlayer(gameId, player).state = state;
        this.emitter.emit(GameConstants_1.EVENTS.DATA.PLAYER_STATE, { gameId: gameId, player: player, state: state });
        callback(null);
    };
    GameMemory.prototype.rpoplpush = function (gameId, player, callback) {
        if (!this.getGame(gameId).deck || !this.getGame(gameId).deck.length) {
            return callback(null, null);
        }
        var card = this.getGame(gameId).deck.pop();
        this.postPlayerCard(gameId, player, card, callback);
    };
    GameMemory.prototype.postGame = function (callback) {
        callback(null, "" + this.nextGameId++);
    };
    GameMemory.prototype.postPlayerCard = function (gameId, player, card, callback) {
        if (!card) {
            return callback(new Error(DataStoreInterfaces_1.ERRORS.GAME.INVALID_CARD), null);
        }
        var playerData = this.getPlayer(gameId, player);
        if (!playerData.cards) {
            playerData.cards = [];
        }
        playerData.cards.unshift(card);
        this.emitter.emit(GameConstants_1.EVENTS.DATA.PUSHED_CARD, { gameId: gameId, player: player, card: card });
        callback(null, card);
    };
    GameMemory.prototype.onPushedCard = function (callback) {
        this.emitter.on(GameConstants_1.EVENTS.DATA.PUSHED_CARD, callback);
    };
    GameMemory.prototype.onPlayerStateChange = function (callback) {
        this.emitter.on(GameConstants_1.EVENTS.DATA.PLAYER_STATE, callback);
    };
    return GameMemory;
}());
module.exports = GameMemory;
