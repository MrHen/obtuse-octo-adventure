/// <reference path="../../typings/tsd.d.ts" />

import _ = require('lodash');
import events = require('events');
import redis = require('redis');

import {ChatApiInterface} from '../routes/ChatRoute';
import {GameApiInterface} from '../routes/GameRoute';

module StateService {
    export interface StateInterface extends ChatApiInterface, GameApiInterface {
        connect(callback:(err:Error)=>any):any;

        onGlobalChat(callback:(message:string)=>any):any;
    }

    export interface StateConfigInterface {
        max_chat?: number;
    }

    var config_defaults:StateConfigInterface = {
        max_chat: 20
    };

    var EVENT_GLOBALCHAT = 'globalchat:created';

    var config:StateConfigInterface = _.cloneDeep(config_defaults);

    var stateInstance:StateInterface = null;

    export function create(options?:StateConfigInterface):StateInterface {
        if (!stateInstance) {
            options = options || {};
            _.assign(config, options); // don't override config if we already have an instance set up

            if (process.env.REDIS_URL) {
                stateInstance = new StateRedis();
            } else {
                stateInstance = new StateMemory();
            }
        }

        return stateInstance;
    }

    // Used for local development
    class StateMemory implements StateInterface {
        private globalChat:string[] = [];

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

        private emitter:events.EventEmitter = new events.EventEmitter();

        connect(callback:(err:Error)=>any) {
            process.nextTick(() => callback(null));
        }

        getPlayerCards(gameId:string, player:string, callback:(err:Error, cards:string[])=>any):any {
            callback(null, this.games[gameId].players[player].cards);
        }

        getPlayerStates(gameId:string, callback:(err:Error, players:{[player:string]:string})=>any):any {
            var players = this.games[gameId].players;
            var mapped = _.mapValues(players, (value) => value.state);
            console.log('getPlayerStates', players, mapped);
            callback(null, mapped);
        }

        setPlayerState(gameId:string, player:string, state:string, callback:(err:Error)=>any):any {
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

        postGame(callback:(err:Error, gameId:string)=>any):any {
            callback(null, "" + this.nextGameId++);
        }
        postPlayerCard(gameId:string, player:string, card:string, callback:(err:Error)=>any):any {
            this.games[gameId].players[player].cards.push(card);
            callback(null);
        }
        postResult(player:string, playerResult:number, dealerResult:number, callback:(err:Error)=>any):any {
            callback(null);
        }

        getGlobalChat(callback:(err:Error, allMessages:string[])=>any) {
            process.nextTick(() => callback(null, _.cloneDeep(this.globalChat)));
        }

        pushGlobalChat(message:string, callback:(err:Error, allMessages:string[])=>any) {
            this.globalChat.push(message);
            console.log("pushGlobalChat saw " + this.globalChat.length + " of " + config.max_chat);
            if (this.globalChat.length > config.max_chat) {
                this.globalChat.shift();
            }

            this.emitter.emit(EVENT_GLOBALCHAT, message);
            process.nextTick(() => callback(null, _.cloneDeep(this.globalChat)));
        }

        onGlobalChat(callback:(message:string)=>any) {
            this.emitter.on(EVENT_GLOBALCHAT, callback);
        }
    }

    // Used on heroku box
    class StateRedis implements StateInterface {
        private static redisClient:redis.RedisClient = null;

        private static redisSubcriber:redis.RedisClient = null;

        private static KEY_GLOBALCHAT = 'globalchat';
        private static KEY_GAME = 'game';
        private static KEY_PLAYER = 'player';
        private static KEY_STATE = 'state';
        private static KEY_CARDS = 'cards';

        private static DELIMETER = ':';

        public static ERROR_UNKNOWN = 'Unknown redis failure';

        private emitter:events.EventEmitter = new events.EventEmitter();

        connect(callback:(err:Error)=>any) {
            if (StateRedis.redisClient) {
                return process.nextTick(() => callback(null));
            }

            try {
                StateRedis.redisClient = redis.createClient(process.env.REDIS_URL);
                StateRedis.redisSubcriber = redis.createClient(process.env.REDIS_URL);

                StateRedis.redisSubcriber.on('message', (channel, message) => {
                    this.emitter.emit(channel, message);
                });

                process.nextTick(() => callback(null));
            } catch (e) {
                process.nextTick(() => callback(e));
            }
        }

        getPlayerCards(gameId:string, player:string, callback:(err:Error, cards:string[])=>any):any {
            var key = [StateRedis.KEY_GAME, gameId, StateRedis.KEY_PLAYER, player, StateRedis.KEY_CARDS].join(StateRedis.DELIMETER);
            StateRedis.redisClient.lrange(key, 0, -1, callback);
        }

        getPlayerStates(gameId:string, callback:(err:Error, players:{[player:string]:string})=>any):any {
            var key = [StateRedis.KEY_GAME, gameId, StateRedis.KEY_STATE].join(StateRedis.DELIMETER);
            StateRedis.redisClient.hgetall(key, (err, result:string[]) => {
                if (err) {
                    return callback(err, null);
                }

                callback(null, _.zipObject(_.chunk(result, 2)));
            });
        }

        setPlayerState(gameId:string, player:string, state:string, callback:(err:Error)=>any):any {
            var key = [StateRedis.KEY_GAME, gameId, StateRedis.KEY_STATE].join(StateRedis.DELIMETER);
            var success = StateRedis.redisClient.hset(key, player, state);

            if (!success) {
                return callback(new Error(StateRedis.ERROR_UNKNOWN));
            }
            callback(null);
        }

        postGame(callback:(err:Error, gameId:string)=>any):any {
            StateRedis.redisClient.incr(StateRedis.KEY_GAME, (err, result:number) => {
                callback(err, _.isFinite(result) ? "" + result : null);
            });
        }
        postPlayerCard(gameId:string, player:string, card:string, callback:(err:Error)=>any):any {
            var key = [StateRedis.KEY_GAME, gameId, StateRedis.KEY_PLAYER, player, StateRedis.KEY_CARDS].join(StateRedis.DELIMETER);
            var success = StateRedis.redisClient.rpush(key, card);

            if (!success) {
                return callback(new Error(StateRedis.ERROR_UNKNOWN));
            }
            callback(null);
        }
        postResult(player:string, playerResult:number, dealerResult:number, callback:(err:Error)=>any):any {
            callback(null);
        }

        getGlobalChat(callback:(err:Error, allMessages:string[])=>any) {
            StateRedis.redisClient.lrange(StateRedis.KEY_GLOBALCHAT, - config.max_chat, -1, callback);
        }

        pushGlobalChat(message:string, callback:(err:Error, allMessages:string[])=>any) {
            var success = StateRedis.redisClient.rpush(StateRedis.KEY_GLOBALCHAT, message);
            if (!success) {
                return callback(new Error(StateRedis.ERROR_UNKNOWN), []);
            }

            StateRedis.redisClient.publish(EVENT_GLOBALCHAT, message);
            StateRedis.redisClient.lrange(StateRedis.KEY_GLOBALCHAT, - config.max_chat, -1, callback);
        }

        onGlobalChat(handler:(message:string)=>any) {
            this.emitter.on(EVENT_GLOBALCHAT, handler);

            // TODO should only sub once
            StateRedis.redisSubcriber.subscribe(EVENT_GLOBALCHAT);
        }
    }
}

export = StateService;
