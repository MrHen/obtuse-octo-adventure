/// <reference path="../../typings/tsd.d.ts" />

import _ = require('lodash');
import events = require('events');

import {EVENTS} from '../services/GameConstants';
import {GameDataStoreInterface, ERRORS} from './DataStoreInterfaces';

interface Dict<T> {[index:string]:T}

class GameMemory implements GameDataStoreInterface {
    private nextGameId:number = 1;
    private games:Dict<{deck:string[]; players:Dict<{cards: string[]; state: string;}>}> = {};

    private emitter:events.EventEmitter = new events.EventEmitter();

    public countDeck(gameId:string, callback:(err:Error, count:number)=>any):any {
        if (!this.getGame(gameId).deck) {
            return callback(null, 0);
        }

        callback(null, this.getGame(gameId).deck.length);
    }

    private getGame(gameId:string) {
        if (!this.games[gameId]) {
            this.games[gameId] = {
                deck: null,
                players: {}
            }
        }
        return this.games[gameId];
    }

    private getPlayer(gameId:string, player:string) {
        var game = this.getGame(gameId);
        if (!game.players[player]) {
            game.players[player] = {
                cards: null,
                state: null
            }
        }
        return game.players[player];
    }

    public getPlayerCards(gameId:string, player:string, callback:(err:Error, cards:string[])=>any):any {
        callback(null, _.clone(this.getPlayer(gameId, player).cards) || []);
    }

    public getPlayerStates(gameId:string, callback:(err:Error, players:{player:string; state:string}[])=>any):any {
        var players = this.getGame(gameId).players;

        var mapped = _.map(players, (value, key) => {
            return {player: key, state:value.state};
        });

        callback(null, _.clone(mapped));
    }

    public setDeck(gameId:string, cards:string[], callback:(err:Error)=>any):any {
        console.log('DataStoreMemory.setDeck', gameId, cards);
        this.getGame(gameId).deck = _.clone(cards);
        callback(null);
    }

    public setPlayerState(gameId:string, player:string, state:string, callback:(err:Error)=>any):any {
        this.getPlayer(gameId, player).state = state;
        this.emitter.emit(EVENTS.DATA.PLAYER_STATE, {gameId:gameId, player:player, state:state});
        callback(null);
    }

    public rpoplpush(gameId:string, player:string, callback:(err:Error, card:string)=>any):any {
        if (!this.getGame(gameId).deck || !this.getGame(gameId).deck.length) {
            return callback(null, null);
        }

        var card:string = this.getGame(gameId).deck.pop();
        this.postPlayerCard(gameId, player, card, callback);
    }

    public postGame(callback:(err:Error, gameId:string)=>any):any {
        callback(null, "" + this.nextGameId++);
    }
    public postPlayerCard(gameId:string, player:string, card:string, callback:(err:Error, card:string)=>any):any {
        if (!card) {
            return callback(new Error(ERRORS.GAME.INVALID_CARD), null);
        }
        var playerData = this.getPlayer(gameId, player);
        if (!playerData.cards) {
            playerData.cards = [];
        }
        playerData.cards.unshift(card);
        this.emitter.emit(EVENTS.DATA.PUSHED_CARD, {gameId:gameId, player:player, card:card});
        callback(null, card);
    }

    public onPushedCard(callback:(pushedCard:{gameId:string; player:string; card:string})=>any) {
        this.emitter.on(EVENTS.DATA.PUSHED_CARD, callback);
    }

    public onPlayerStateChange(callback:(playerState:{gameId:string; player:string; state:string})=>any) {
        this.emitter.on(EVENTS.DATA.PLAYER_STATE, callback);
    }
}

export = GameMemory;
