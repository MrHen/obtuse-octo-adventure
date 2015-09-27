import _ = require('lodash');
import events = require('events');

import {DataStoreInterface, ChatDataStoreInterface, GameDataStoreInterface, ERRORS, EVENTS} from './DataStoreInterfaces';

module DataStoreMemory {
    export class MemoryDataStore implements DataStoreInterface {
        public chat = new ChatMemory();
        public game = new GameMemory();

        public connect(callback:(err:Error)=>any) {
            process.nextTick(() => callback(null));
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

    // Used for local development
    class GameMemory implements GameDataStoreInterface {
        private nextGameId:number = 0;
        private games:{
            [id:string]:{
                players: {
                    [name:string]: {
                        cards: string[];
                        state: string;
                    }
                }
            }
        } = {};

        public getPlayerCards(gameId:string, player:string, callback:(err:Error, cards:string[])=>any):any {
            callback(null, this.games[gameId].players[player].cards);
        }

        public getPlayerStates(gameId:string, callback:(err:Error, players:{[player:string]:string})=>any):any {
            var players = this.games[gameId].players;
            var mapped = _.mapValues(players, (value) => value.state);
            console.log('getPlayerStates', players, mapped);
            callback(null, mapped);
        }

        public setPlayerState(gameId:string, player:string, state:string, callback:(err:Error)=>any):any {
            if (!this.games[gameId]) {
                this.games[gameId] = {
                    players: {}
                }
            }

            if (!this.games[gameId].players[player]) {
                this.games[gameId].players[player] = {
                    cards: [],
                    state: state
                }
            }

            this.games[gameId].players[player].state = state;
            callback(null);
        }

        public postGame(callback:(err:Error, gameId:string)=>any):any {
            callback(null, "" + this.nextGameId++);
        }
        public postPlayerCard(gameId:string, player:string, card:string, callback:(err:Error)=>any):any {
            this.games[gameId].players[player].cards.push(card);
            callback(null);
        }
        public postResult(player:string, playerResult:number, dealerResult:number, callback:(err:Error)=>any):any {
            callback(null);
        }
    }
}

export = DataStoreMemory;
