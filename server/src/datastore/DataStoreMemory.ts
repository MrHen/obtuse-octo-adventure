import _ = require('lodash');
import events = require('events');

import {DataStoreInterface, ChatDataStoreInterface, GameDataStoreInterface, ResultDataStoreInterface, RoomDataStoreInterface, ERRORS, EVENTS} from './DataStoreInterfaces';

// Used for local development
module DataStoreMemory {
    export class MemoryDataStore implements DataStoreInterface {
        public chat = new ChatMemory();
        public game = new GameMemory();
        public room = new RoomMemory();
        public result = new ResultMemory();

        public connect(callback:(err:Error)=>any) {
            process.nextTick(() => callback(null));
        }

        public reset(callback:(err:Error)=>any) {
            // TODO tear down any listeners
            this.chat = new ChatMemory();
            this.game = new GameMemory();
            this.room = new RoomMemory();
            this.result = new ResultMemory();
            callback(null);
        }
    }

    class ChatMemory implements ChatDataStoreInterface {
        private globalChat:string[] = [];

        private emitter:events.EventEmitter = new events.EventEmitter();

        public getGlobalChat(limit:number, callback:(err:Error, allMessages:string[])=>any) {
            limit = limit || 20;

            while (this.globalChat.length > limit && this.globalChat.length > 0) {
                this.globalChat.shift();
            }

            process.nextTick(() => callback(null, _.cloneDeep(this.globalChat)));
        }

        public pushGlobalChat(message:string, callback:(err:Error, message:string)=>any) {
            if (!message) {
                return callback(new Error(ERRORS.CHAT.INVALID_MESSAGE), null);
            }
            this.globalChat.push(message);

            this.emitter.emit(EVENTS.GLOBALCHAT, message);
            process.nextTick(() => callback(null, message));
        }

        public onGlobalChat(callback:(message:string)=>any) {
            this.emitter.on(EVENTS.GLOBALCHAT, callback);
        }
    }

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
            callback(null, this.getPlayer(gameId, player).cards || []);
        }

        public getPlayerStates(gameId:string, callback:(err:Error, players:{player:string; state:string}[])=>any):any {
            var players = this.getGame(gameId).players;

            var mapped = _.map(players, (value, key) => {
                return {player: key, state:value.state};
            });

            callback(null, mapped);
        }

        public setDeck(gameId:string, cards:string[], callback:(err:Error)=>any):any {
            console.log('DataStoreMemory.setDeck', gameId, cards);
            this.getGame(gameId).deck = _.clone(cards);
            callback(null);
        }

        public setPlayerState(gameId:string, player:string, state:string, callback:(err:Error)=>any):any {
            this.getPlayer(gameId, player).state = state;
            this.emitter.emit(EVENTS.PLAYERSTATE, gameId, player, state);
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
            this.emitter.emit(EVENTS.PUSHEDCARD, gameId, player, card);
            callback(null, card);
        }
        public postResult(player:string, playerResult:number, dealerResult:number, callback:(err:Error)=>any):any {
            callback(null);
        }

        public onPushedCard(callback:(gameId:string, player:string, card:string)=>any) {
            this.emitter.on(EVENTS.PUSHEDCARD, callback);
        }

        public onPlayerStateChange(callback:(gameId:string, player:string, state:string)=>any) {
            this.emitter.on(EVENTS.PLAYERSTATE, callback);
        }
    }

    class RoomMemory implements RoomDataStoreInterface {
        private static roomName:string = 'demo';

        private games:Dict<string> = {};

        private players:Dict<string[]> = {};

        deletePlayer(roomId:string, player:string, callback:(err:Error)=>any):any {
            if (this.players[roomId]) {
                this.players[roomId] = _.without(this.players[roomId], player);
            }
            callback(null);
        }

        getRooms(callback:(err:Error, rooms:string[])=>any):any {
            callback(null, [RoomMemory.roomName]);
        }

        getGame(roomId:string, callback:(err:Error, game:string)=>any):any {
            callback(null, this.games[roomId]);
        }

        getPlayers(roomId:string, callback:(err:Error, players:string[])=>any):any {
            callback(null, this.players[roomId] || []);
        }

        putPlayer(roomId:string, player:string, callback:(err:Error, player:string)=>any):any {
            if (!player) {
                return callback(new Error(ERRORS.ROOM.INVALID_PLAYER), null);
            }

            if (!this.players[roomId]) {
                this.players[roomId] = [];
            }
            if (!_.include(this.players[roomId], player)) {
                this.players[roomId].push(player);
            }
            callback(null, player);
        }

        setGame(roomId:string, game:string, callback:(err:Error)=>any):any {
            if (!game) {
                return callback(new Error(ERRORS.ROOM.INVALID_GAME));
            }

            this.games[roomId] = game;
            callback(null);
        }
    }

    class ResultMemory implements ResultDataStoreInterface {
        // mimic how redis will store this info
        private results:string[] = [];

        private wins:Dict<number> = {};

        getResults(start:number, end:number, callback:(err:Error, results:{game:string; scores:{[player:string]:number}}[])=>any):any {
            var realEnd = end === -1 ? this.results.length : end + 1; // redis uses inclusive matching so adjust accordingly
            var payloads = this.results.slice(start, realEnd);
            console.log("payloads", payloads);
            callback(null, _.map(payloads, (payload) => JSON.parse(payload)));
        }

        pushResult(gameId:string, scores:{[player:string]:number}, callback:(err:Error)=>any):any {
            this.results.push(JSON.stringify({game:gameId, scores:scores}));
            callback(null);
        }
        addPlayerWin(player:string, callback:(err:Error, wins:number)=>any):any {
            this.wins[player] ? this.wins[player]++ : (this.wins[player] = 1);
            callback(null, this.wins[player]);
        }
        getPlayerWins(player:string, callback:(err:Error, wins:number)=>any):any {
            callback(null, this.wins[player]);
        }
    }

    interface Dict<T> {[index:string]:T}
}

export = DataStoreMemory;
