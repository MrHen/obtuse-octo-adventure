/// <reference path="../../typings/tsd.d.ts" />

import _ = require('lodash');
import redis = require('redis');

module StateService {
    export interface StateInterface {
        connect(callback:(err:Error)=>any):any;

        pushGlobalChat(message:string, callback:(err:Error, allMessages:string[])=>any):any;
    }

    export interface StateConfigInterface {
        max_chat?: number;
    }

    var config_defaults:StateConfigInterface = {
        max_chat: 20
    };

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

        connect(callback:(err:Error)=>any) {
            process.nextTick(() => callback(null));
        }

        pushGlobalChat(message:string, callback:(err:Error, allMessages:string[])=>any) {
            this.globalChat.push(message);
            console.log("pushGlobalChat saw " + this.globalChat.length + " of " + config.max_chat);
            if (this.globalChat.length > config.max_chat) {
                this.globalChat.shift();
            }

            process.nextTick(() => callback(null, _.cloneDeep(this.globalChat)));
        }
    }

    // Used on heroku box
    class StateRedis implements StateInterface {
        private static redisClient:redis.RedisClient = null;

        private static GLOBALCHAT = 'globalchat';

        public static ERROR_UNKNOWN = 'Unknown redis failure';

        connect(callback:(err:Error)=>any) {
            if (StateRedis.redisClient) {
                return process.nextTick(() => callback(null));
            }

            try {
                StateRedis.redisClient = redis.createClient(process.env.REDIS_URL);
            } catch (e) {
                process.nextTick(() => callback(e));
            }
        }

        pushGlobalChat(message:string, callback:(err:Error, allMessages:string[])=>any) {
            var success = StateRedis.redisClient.rpush(StateRedis.GLOBALCHAT, message);
            if (!success) {
                return callback(new Error(StateRedis.ERROR_UNKNOWN), []);
            }

            StateRedis.redisClient.lrange(- config.max_chat, -1, callback);
        }
    }
}

export = StateService;
