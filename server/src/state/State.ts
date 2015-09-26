/// <reference path="../../typings/tsd.d.ts" />

import _ = require('lodash');
import events = require('events');
import redis = require('redis');

import {ChatStateInterface} from '../routes/ChatRoute';

module StateService {
    export interface StateInterface extends ChatStateInterface {
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

        private emitter:events.EventEmitter = new events.EventEmitter();

        connect(callback:(err:Error)=>any) {
            process.nextTick(() => callback(null));
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

        private static GLOBALCHAT = 'globalchat';

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

        getGlobalChat(callback:(err:Error, allMessages:string[])=>any) {
            StateRedis.redisClient.lrange(StateRedis.GLOBALCHAT, - config.max_chat, -1, callback);
        }

        pushGlobalChat(message:string, callback:(err:Error, allMessages:string[])=>any) {
            var success = StateRedis.redisClient.rpush(StateRedis.GLOBALCHAT, message);
            if (!success) {
                return callback(new Error(StateRedis.ERROR_UNKNOWN), []);
            }

            StateRedis.redisClient.publish(EVENT_GLOBALCHAT, message);
            StateRedis.redisClient.lrange(StateRedis.GLOBALCHAT, - config.max_chat, -1, callback);
        }

        onGlobalChat(handler:(message:string)=>any) {
            this.emitter.on(EVENT_GLOBALCHAT, handler);

            // TODO should only sub once
            StateRedis.redisSubcriber.subscribe(EVENT_GLOBALCHAT);
        }
    }
}

export = StateService;
