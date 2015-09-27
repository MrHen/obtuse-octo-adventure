import _ = require('lodash');
import events = require('events');
import redis = require('redis');

import {DataStoreInterface, ChatDataStoreInterface, GameDataStoreInterface, RoomDataStoreInterface, EVENTS} from './DataStoreInterfaces';

module DataStoreRedisModule {
    var redisClient:redis.RedisClient = null;
    var redisSubcriber:redis.RedisClient = null;
    var emitter:events.EventEmitter = null;

    var DELIMETER = ':';
    var ERROR_UNKNOWN = 'Unknown redis failure';

    function init() {
        emitter = new events.EventEmitter();
        redisClient = redis.createClient(process.env.REDIS_URL);
        redisSubcriber = redis.createClient(process.env.REDIS_URL);

        redisSubcriber.on('message', (channel, message) => {
            emitter.emit(channel, message);
        });
    }

    export class RedisDataStore implements DataStoreInterface {
        public chat = new ChatRedis();
        public game = new GameRedis();
        public room = new RoomRedis();

        public connect(callback:(err:Error)=>any) {
            if (redisClient) {
                return process.nextTick(() => callback(null));
            }

            try {
                init();
                process.nextTick(() => callback(null));
            } catch (e) {
                process.nextTick(() => callback(e));
            }
        }
    }

    // Used on heroku box
    class ChatRedis implements ChatDataStoreInterface {
        private static KEY_GLOBALCHAT = 'globalchat';

        public getGlobalChat(limit:number, callback:(err:Error, allMessages:string[])=>any) {
            redisClient.lrange(ChatRedis.KEY_GLOBALCHAT, -limit, -1, callback);
        }

        public pushGlobalChat(message:string, callback:(err:Error, message:string)=>any) {
            var success = redisClient.rpush(ChatRedis.KEY_GLOBALCHAT, message);
            if (!success) {
                return callback(new Error(ERROR_UNKNOWN), null);
            }

            redisClient.publish(EVENTS.GLOBALCHAT, message);
            callback(null, message);
        }

        public onGlobalChat(handler:(message:string)=>any) {
            emitter.on(EVENTS.GLOBALCHAT, handler);

            // TODO should only sub once
            redisSubcriber.subscribe(EVENTS.GLOBALCHAT);
        }
    }

    class GameRedis implements GameDataStoreInterface {
        private static KEY_GAME = 'game';
        private static KEY_PLAYER = 'player';
        private static KEY_STATE = 'state';
        private static KEY_CARDS = 'cards';

        public getPlayerCards(gameId:string, player:string, callback:(err:Error, cards:string[])=>any):any {
            var key = [GameRedis.KEY_GAME,
                       gameId,
                       GameRedis.KEY_PLAYER,
                       player,
                       GameRedis.KEY_CARDS].join(DELIMETER);
            redisClient.lrange(key, 0, -1, callback);
        }

        public getPlayerStates(gameId:string, callback:(err:Error, players:{player:string; state:string}[])=>any):any {
            var key = [GameRedis.KEY_GAME, gameId, GameRedis.KEY_STATE].join(DELIMETER);
            redisClient.hgetall(key, (err, result:string[]) => {
                if (err) {
                    return callback(err, null);
                }

                callback(null, _.map(_.chunk(result, 2), (chunk) => {
                    return {player: chunk[0], state: chunk[1]};
                }));
            });
        }

        public setPlayerState(gameId:string, player:string, state:string, callback:(err:Error)=>any):any {
            var key = [GameRedis.KEY_GAME, gameId, GameRedis.KEY_STATE].join(DELIMETER);
            var success = redisClient.hset(key, player, state);

            if (!success) {
                return callback(new Error(ERROR_UNKNOWN));
            }
            callback(null);
        }

        public postGame(callback:(err:Error, gameId:string)=>any):any {
            redisClient.incr(GameRedis.KEY_GAME, (err, result:number) => {
                callback(err, _.isFinite(result) ? "" + result : null);
            });
        }

        public postPlayerCard(gameId:string, player:string, card:string, callback:(err:Error)=>any):any {
            var key = [GameRedis.KEY_GAME,
                       gameId,
                       GameRedis.KEY_PLAYER,
                       player,
                       GameRedis.KEY_CARDS].join(DELIMETER);
            var success = redisClient.rpush(key, card);

            if (!success) {
                return callback(new Error(ERROR_UNKNOWN));
            }
            callback(null);
        }

        public postResult(player:string, playerResult:number, dealerResult:number, callback:(err:Error)=>any):any {
            callback(null);
        }
    }

    class RoomRedis implements RoomDataStoreInterface {
        private static KEY_ROOM = 'room';
        private static KEY_GAME = 'player';
        private static KEY_PLAYER = 'player';

        private static roomName:string = 'demo';

        deletePlayer(roomId:string, player:string, callback:(err:Error)=>any):any {
            var key = [RoomRedis.KEY_ROOM, roomId, RoomRedis.KEY_PLAYER].join(DELIMETER);
            var success = redisClient.srem(key, player);
            if (!success) {
                return callback(new Error(ERROR_UNKNOWN));
            }
            callback(null);
        }

        getRooms(callback:(err:Error, rooms:string[])=>any):any {
            callback(null, [RoomRedis.roomName]);
        }

        getGame(roomId:string, callback:(err:Error, game:string)=>any):any {
            var key = [RoomRedis.KEY_ROOM, roomId, RoomRedis.KEY_GAME].join(DELIMETER);
            redisClient.get(key, (err, result:string) => {
                if (err) {
                    return callback(err, null);
                }

                callback(null, result);
            });
        }

        getPlayers(roomId:string, callback:(err:Error, players:string[])=>any):any {
            var key = [RoomRedis.KEY_ROOM, roomId, RoomRedis.KEY_PLAYER].join(DELIMETER);
            redisClient.smembers(key, (err, result:string[]) => {
                if (err) {
                    return callback(err, null);
                }

                callback(null, result);
            });
        }

        putPlayer(roomId:string, player:string, callback:(err:Error)=>any):any {
            var key = [RoomRedis.KEY_ROOM, roomId, RoomRedis.KEY_PLAYER].join(DELIMETER);
            var success = redisClient.sadd(key, player);
            if (!success) {
                return callback(new Error(ERROR_UNKNOWN));
            }
            callback(null);
        }

        setGame(roomId:string, game:string, callback:(err:Error)=>any):any {
            var key = [RoomRedis.KEY_ROOM, roomId, RoomRedis.KEY_GAME].join(DELIMETER);
            var success = redisClient.set(key, game);
            if (!success) {
                return callback(new Error(ERROR_UNKNOWN));
            }
            callback(null);
        }
    }
}

export = DataStoreRedisModule;
