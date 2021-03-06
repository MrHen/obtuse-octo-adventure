import _ = require('lodash');
import async = require('async');
import events = require('events');
import redis = require('redis');

import {EVENTS} from '../services/GameConstants';
import {DataStoreInterface, ChatDataStoreInterface, GameDataStoreInterface, ResultDataStoreInterface, RoomDataStoreInterface, ERRORS} from './DataStoreInterfaces';

// Used on heroku box

// All of the Redis data classes are in one file so they can reference the same redis client and constants. Ideally they
// would be split up into seperate files like the in-memory data classes.
module DataStoreRedisModule {
    var redisClient:redis.RedisClient = null;
    var redisSubcriber:redis.RedisClient = null;
    var emitter:events.EventEmitter = null;

    var DELIMETER = ':';
    var ERROR_UNKNOWN = 'Unknown redis failure';

    export class RedisDataStore implements DataStoreInterface {
        public chat = new ChatRedis();
        public game = new GameRedis();
        public room = new RoomRedis();
        public result = new ResultRedis();

        public connect(callback:(err:Error)=>any) {
            if (!redisClient) {
                emitter = new events.EventEmitter();
                try {
                    redisClient = redis.createClient(process.env.REDIS_URL);
                    redisSubcriber = redis.createClient(process.env.REDIS_URL);
                } catch (e) {
                    return process.nextTick(() => callback(e));
                }
            }

            redisSubcriber.on('message', (channel, message) => {
                console.log("DataStoreRedis pubsub hit", channel, message);
                emitter.emit(channel, message);
            });
            redisSubcriber.subscribe(EVENTS.DATA.GLOBAL_CHAT, EVENTS.DATA.PUSHED_CARD, EVENTS.DATA.PLAYER_STATE, callback);
        }

        // WARNING: Deletes all data!
        public reset(callback:(err:Error)=>any) {
            if (redisClient) {
                emitter.removeAllListeners(EVENTS.DATA.GLOBAL_CHAT);
                emitter.removeAllListeners(EVENTS.DATA.PUSHED_CARD);
                emitter.removeAllListeners(EVENTS.DATA.PLAYER_STATE);
                redisSubcriber.removeAllListeners('message');

                async.series([
                    (cb) => redisClient.flushdb(cb),
                    (cb) => redisSubcriber.unsubscribe(EVENTS.DATA.GLOBAL_CHAT, EVENTS.DATA.PUSHED_CARD, EVENTS.DATA.PLAYER_STATE, cb)
                ], callback);
            }
        }
    }

    class ChatRedis implements ChatDataStoreInterface {
        private static KEY_GLOBALCHAT = 'globalchat';

        public getGlobalChat(limit:number, callback:(err:Error, allMessages:string[])=>any) {
            redisClient.lrange(ChatRedis.KEY_GLOBALCHAT, -limit, -1, callback);
        }

        public pushGlobalChat(message:string, callback:(err:Error, message:string)=>any) {
            if (!message) {
                return callback(new Error(ERRORS.CHAT.INVALID_MESSAGE), null);
            }

            redisClient.rpush(ChatRedis.KEY_GLOBALCHAT, message, (err:Error, result:string) => {
                if (err) {
                    return callback(err, null);
                }

                redisClient.publish(EVENTS.DATA.GLOBAL_CHAT, message);
                callback(null, message);
            });
        }

        public onGlobalChat(handler:(message:string)=>any) {
            emitter.on(EVENTS.DATA.GLOBAL_CHAT, handler);
        }
    }

    class GameRedis implements GameDataStoreInterface {
        private static KEY_GAME = 'game';
        private static KEY_PLAYER = 'player';
        private static KEY_STATE = 'state';
        private static KEY_CARDS = 'cards';

        public countDeck(gameId:string, callback:(err:Error, count:number)=>any):any {
            var key = [GameRedis.KEY_GAME,
                       gameId,
                       GameRedis.KEY_CARDS].join(DELIMETER);
            redisClient.llen(key, (err, result:number) => {
                console.log('DataStoreRedis.setDeck countDeck', err, result);
                callback(err, result);
            });
        }

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
            redisClient.hgetall(key, (err, result:{[player:string]:string}) => {
                if (err) {
                    return callback(err, null);
                }
                console.log('DataStoreRedis.getPlayerStates resolved', result);

                callback(null, _.map(result, (value, key) => {
                    return {player: key, state: value};
                }));
            });
        }

        public setDeck(gameId:string, cards:string[], callback:(err:Error)=>any):any {
            var key = [GameRedis.KEY_GAME, gameId, GameRedis.KEY_CARDS].join(DELIMETER);
            redisClient.del(key, (err, result) => {
                console.log('DataStoreRedis.setDeck (del) resolved', err, result);
                if (err) {
                    return callback(err);
                }

                // use rpush so the cards end up in the expected order
                redisClient.rpush(key, cards, (err, result) => {
                    console.log('DataStoreRedis.setDeck (rpush) resolved', err, result);
                    callback(err);
                });
            });
        }

        public setPlayerState(gameId:string, player:string, state:string, callback:(err:Error)=>any):any {
            var key = [GameRedis.KEY_GAME, gameId, GameRedis.KEY_STATE].join(DELIMETER);
            redisClient.hset(key, player, state, (err, result) => {
                console.log('DataStoreRedis.setPlayerState resolved', err, result);
                if (err) {
                    return callback(new Error(err));
                }
                redisClient.publish(EVENTS.DATA.PLAYER_STATE, JSON.stringify({game_id:gameId, player:player, state:state}));
                callback(null);
            });
        }

        public rpoplpush(gameId:string, player:string, callback:(err:Error, card:string)=>any):any {
            var popkey = [GameRedis.KEY_GAME, gameId, GameRedis.KEY_CARDS].join(DELIMETER);
            var pushkey = [GameRedis.KEY_GAME, gameId, GameRedis.KEY_PLAYER, player, GameRedis.KEY_CARDS].join(DELIMETER);
            redisClient.rpoplpush(popkey, pushkey, (err, result:string) => {
                console.log('DataStoreRedis.rpoplpush resolved', err, result);
                redisClient.publish(EVENTS.DATA.PUSHED_CARD, JSON.stringify({game_id:gameId, player:player, card:result}));
                callback(err, result);
            });
        }

        public postGame(callback:(err:Error, gameId:string)=>any):any {
            redisClient.incr(GameRedis.KEY_GAME, (err, result:number) => {
                callback(err, _.isFinite(result) ? "" + result : null);
            });
        }

        public postPlayerCard(gameId:string, player:string, card:string, callback:(err:Error, count:number)=>any):any {
            if (!card) {
                return callback(new Error(ERRORS.GAME.INVALID_CARD), null);
            }

            var key = [GameRedis.KEY_GAME,
                       gameId,
                       GameRedis.KEY_PLAYER,
                       player,
                       GameRedis.KEY_CARDS].join(DELIMETER);
            var success = redisClient.lpush(key, card, (err, result:number) => {
                console.log('DataStoreRedis.postPlayerCard resolved', err, result);

                redisClient.publish(EVENTS.DATA.PUSHED_CARD, JSON.stringify({game_id:gameId, player:player, card:card}));
                return callback(err, result);
            });
        }

        public onPushedCard(handler:(pushedCard:{gameId:string; player:string; card:string})=>any) {
            emitter.on(EVENTS.DATA.PUSHED_CARD, (message:string) => {
                console.log("DataStoreRedis.onPushedCard resolved", message);
                var data = JSON.parse(message);
                handler({gameId:data.game_id, player:data.player, card:data.card});
            });
        }

        public onPlayerStateChange(handler:(playerState:{gameId:string; player:string; state:string})=>any) {
            emitter.on(EVENTS.DATA.PLAYER_STATE, (message:string) => {
                console.log("DataStoreRedis.onPlayerStateChange resolved", message);
                var data = JSON.parse(message);
                handler({gameId:data.game_id, player:data.player, state:data.state});
            });
        }
    }

    class RoomRedis implements RoomDataStoreInterface {
        private static KEY_ROOM = 'room';
        private static KEY_GAME = 'game';
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

        putPlayer(roomId:string, player:string, callback:(err:Error, player:string)=>any):any {
            if (!player) {
                return callback(new Error(ERRORS.ROOM.INVALID_PLAYER), null);
            }

            var key = [RoomRedis.KEY_ROOM, roomId, RoomRedis.KEY_PLAYER].join(DELIMETER);
            var success = redisClient.sadd(key, player);
            if (!success) {
                return callback(new Error(ERROR_UNKNOWN), null);
            }
            callback(null, player);
        }

        setGame(roomId:string, game:string, callback:(err:Error)=>any):any {
            if (!game) {
                return callback(new Error(ERRORS.ROOM.INVALID_GAME));
            }

            var key = [RoomRedis.KEY_ROOM, roomId, RoomRedis.KEY_GAME].join(DELIMETER);
            var success = redisClient.set(key, game);
            if (!success) {
                return callback(new Error(ERROR_UNKNOWN));
            }
            callback(null);
        }
    }

    class ResultRedis implements ResultDataStoreInterface {
        private static KEY_RESULTS = 'results';
        private static KEY_LEADERBOARD = 'leaderboard';

        getResults(start:number, end:number, callback:(err:Error, results:{game:string; scores:{[player:string]:number}}[])=>any):any {
            redisClient.lrange(ResultRedis.KEY_RESULTS, start, end, (err:Error, payloads:string[]) => {
                if (err) {
                    return callback(err, null);
                }

                callback(null, _.map(payloads, (payload) => JSON.parse(payload)));
            });
        }
        pushResult(gameId:string, scores:{[player:string]:number}, callback:(err:Error)=>any):any {
            redisClient.rpush(ResultRedis.KEY_RESULTS, JSON.stringify({game:gameId, scores:scores}), callback);
        }

        addPlayerWin(player:string, callback:(err:Error, wins:number)=>any):any {
            redisClient.zincrby(ResultRedis.KEY_LEADERBOARD, 1, player, (err:Error, result:string) => {
                if (err) {
                    return callback(err, null);
                }

                callback(null, +result);
            });
        }
        getPlayerWins(player:string, callback:(err:Error, wins:number)=>any):any {
            redisClient.zscore(ResultRedis.KEY_LEADERBOARD, player, (err:Error, result:string) => {
                if (err) {
                    return callback(err, null);
                }

                callback(null, +result);
            });
        }
        getMostWins(start:number, end:number, callback:(err:Error, results:{player:string; wins:number}[])=>any):any {
            redisClient.zrevrange(ResultRedis.KEY_LEADERBOARD, start, end, 'WITHSCORES', (err:Error, result:string[]) => {
                if (err) {
                    return callback(err, null);
                }

                console.log('getMostWins resolved', result);

                callback(null, _.map(_.chunk(result, 2), (pair) => {
                    return {player: pair[0], wins: +pair[1]};
                }));
            });
        }
    }
}

export = DataStoreRedisModule;
