"use strict";
var _ = require('lodash');
var async = require('async');
var events = require('events');
var redis = require('redis');
var GameConstants_1 = require('../services/GameConstants');
var DataStoreInterfaces_1 = require('./DataStoreInterfaces');
// Used on heroku box
// All of the Redis data classes are in one file so they can reference the same redis client and constants. Ideally they
// would be split up into seperate files like the in-memory data classes.
var DataStoreRedisModule;
(function (DataStoreRedisModule) {
    var redisClient = null;
    var redisSubcriber = null;
    var emitter = null;
    var DELIMETER = ':';
    var ERROR_UNKNOWN = 'Unknown redis failure';
    var RedisDataStore = (function () {
        function RedisDataStore() {
            this.chat = new ChatRedis();
            this.game = new GameRedis();
            this.room = new RoomRedis();
            this.result = new ResultRedis();
        }
        RedisDataStore.prototype.connect = function (callback) {
            if (!redisClient) {
                emitter = new events.EventEmitter();
                try {
                    redisClient = redis.createClient(process.env.REDIS_URL);
                    redisSubcriber = redis.createClient(process.env.REDIS_URL);
                }
                catch (e) {
                    return process.nextTick(function () { return callback(e); });
                }
            }
            redisSubcriber.on('message', function (channel, message) {
                console.log("DataStoreRedis pubsub hit", channel, message);
                emitter.emit(channel, message);
            });
            redisSubcriber.subscribe(GameConstants_1.EVENTS.DATA.GLOBAL_CHAT, GameConstants_1.EVENTS.DATA.PUSHED_CARD, GameConstants_1.EVENTS.DATA.PLAYER_STATE, callback);
        };
        // WARNING: Deletes all data!
        RedisDataStore.prototype.reset = function (callback) {
            if (redisClient) {
                emitter.removeAllListeners(GameConstants_1.EVENTS.DATA.GLOBAL_CHAT);
                emitter.removeAllListeners(GameConstants_1.EVENTS.DATA.PUSHED_CARD);
                emitter.removeAllListeners(GameConstants_1.EVENTS.DATA.PLAYER_STATE);
                redisSubcriber.removeAllListeners('message');
                async.series([
                    function (cb) { return redisClient.flushdb(cb); },
                    function (cb) { return redisSubcriber.unsubscribe(GameConstants_1.EVENTS.DATA.GLOBAL_CHAT, GameConstants_1.EVENTS.DATA.PUSHED_CARD, GameConstants_1.EVENTS.DATA.PLAYER_STATE, cb); }
                ], callback);
            }
        };
        return RedisDataStore;
    }());
    DataStoreRedisModule.RedisDataStore = RedisDataStore;
    var ChatRedis = (function () {
        function ChatRedis() {
        }
        ChatRedis.prototype.getGlobalChat = function (limit, callback) {
            redisClient.lrange(ChatRedis.KEY_GLOBALCHAT, -limit, -1, callback);
        };
        ChatRedis.prototype.pushGlobalChat = function (message, callback) {
            if (!message) {
                return callback(new Error(DataStoreInterfaces_1.ERRORS.CHAT.INVALID_MESSAGE), null);
            }
            redisClient.rpush(ChatRedis.KEY_GLOBALCHAT, message, function (err, result) {
                if (err) {
                    return callback(err, null);
                }
                redisClient.publish(GameConstants_1.EVENTS.DATA.GLOBAL_CHAT, message);
                callback(null, message);
            });
        };
        ChatRedis.prototype.onGlobalChat = function (handler) {
            emitter.on(GameConstants_1.EVENTS.DATA.GLOBAL_CHAT, handler);
        };
        ChatRedis.KEY_GLOBALCHAT = 'globalchat';
        return ChatRedis;
    }());
    var GameRedis = (function () {
        function GameRedis() {
        }
        GameRedis.prototype.countDeck = function (gameId, callback) {
            var key = [GameRedis.KEY_GAME,
                gameId,
                GameRedis.KEY_CARDS].join(DELIMETER);
            redisClient.llen(key, function (err, result) {
                console.log('DataStoreRedis.setDeck countDeck', err, result);
                callback(err, result);
            });
        };
        GameRedis.prototype.getPlayerCards = function (gameId, player, callback) {
            var key = [GameRedis.KEY_GAME,
                gameId,
                GameRedis.KEY_PLAYER,
                player,
                GameRedis.KEY_CARDS].join(DELIMETER);
            redisClient.lrange(key, 0, -1, callback);
        };
        GameRedis.prototype.getPlayerStates = function (gameId, callback) {
            var key = [GameRedis.KEY_GAME, gameId, GameRedis.KEY_STATE].join(DELIMETER);
            redisClient.hgetall(key, function (err, result) {
                if (err) {
                    return callback(err, null);
                }
                console.log('DataStoreRedis.getPlayerStates resolved', result);
                callback(null, _.map(result, function (value, key) {
                    return { player: key, state: value };
                }));
            });
        };
        GameRedis.prototype.setDeck = function (gameId, cards, callback) {
            var key = [GameRedis.KEY_GAME, gameId, GameRedis.KEY_CARDS].join(DELIMETER);
            redisClient.del(key, function (err, result) {
                console.log('DataStoreRedis.setDeck (del) resolved', err, result);
                if (err) {
                    return callback(err);
                }
                // use rpush so the cards end up in the expected order
                redisClient.rpush(key, cards, function (err, result) {
                    console.log('DataStoreRedis.setDeck (rpush) resolved', err, result);
                    callback(err);
                });
            });
        };
        GameRedis.prototype.setPlayerState = function (gameId, player, state, callback) {
            var key = [GameRedis.KEY_GAME, gameId, GameRedis.KEY_STATE].join(DELIMETER);
            redisClient.hset(key, player, state, function (err, result) {
                console.log('DataStoreRedis.setPlayerState resolved', err, result);
                if (err) {
                    return callback(new Error(err));
                }
                redisClient.publish(GameConstants_1.EVENTS.DATA.PLAYER_STATE, JSON.stringify({ game_id: gameId, player: player, state: state }));
                callback(null);
            });
        };
        GameRedis.prototype.rpoplpush = function (gameId, player, callback) {
            var popkey = [GameRedis.KEY_GAME, gameId, GameRedis.KEY_CARDS].join(DELIMETER);
            var pushkey = [GameRedis.KEY_GAME, gameId, GameRedis.KEY_PLAYER, player, GameRedis.KEY_CARDS].join(DELIMETER);
            redisClient.rpoplpush(popkey, pushkey, function (err, result) {
                console.log('DataStoreRedis.rpoplpush resolved', err, result);
                redisClient.publish(GameConstants_1.EVENTS.DATA.PUSHED_CARD, JSON.stringify({ game_id: gameId, player: player, card: result }));
                callback(err, result);
            });
        };
        GameRedis.prototype.postGame = function (callback) {
            redisClient.incr(GameRedis.KEY_GAME, function (err, result) {
                callback(err, _.isFinite(result) ? "" + result : null);
            });
        };
        GameRedis.prototype.postPlayerCard = function (gameId, player, card, callback) {
            if (!card) {
                return callback(new Error(DataStoreInterfaces_1.ERRORS.GAME.INVALID_CARD), null);
            }
            var key = [GameRedis.KEY_GAME,
                gameId,
                GameRedis.KEY_PLAYER,
                player,
                GameRedis.KEY_CARDS].join(DELIMETER);
            var success = redisClient.lpush(key, card, function (err, result) {
                console.log('DataStoreRedis.postPlayerCard resolved', err, result);
                redisClient.publish(GameConstants_1.EVENTS.DATA.PUSHED_CARD, JSON.stringify({ game_id: gameId, player: player, card: card }));
                return callback(err, result);
            });
        };
        GameRedis.prototype.onPushedCard = function (handler) {
            emitter.on(GameConstants_1.EVENTS.DATA.PUSHED_CARD, function (message) {
                console.log("DataStoreRedis.onPushedCard resolved", message);
                var data = JSON.parse(message);
                handler({ gameId: data.game_id, player: data.player, card: data.card });
            });
        };
        GameRedis.prototype.onPlayerStateChange = function (handler) {
            emitter.on(GameConstants_1.EVENTS.DATA.PLAYER_STATE, function (message) {
                console.log("DataStoreRedis.onPlayerStateChange resolved", message);
                var data = JSON.parse(message);
                handler({ gameId: data.game_id, player: data.player, state: data.state });
            });
        };
        GameRedis.KEY_GAME = 'game';
        GameRedis.KEY_PLAYER = 'player';
        GameRedis.KEY_STATE = 'state';
        GameRedis.KEY_CARDS = 'cards';
        return GameRedis;
    }());
    var RoomRedis = (function () {
        function RoomRedis() {
        }
        RoomRedis.prototype.deletePlayer = function (roomId, player, callback) {
            var key = [RoomRedis.KEY_ROOM, roomId, RoomRedis.KEY_PLAYER].join(DELIMETER);
            var success = redisClient.srem(key, player);
            if (!success) {
                return callback(new Error(ERROR_UNKNOWN));
            }
            callback(null);
        };
        RoomRedis.prototype.getRooms = function (callback) {
            callback(null, [RoomRedis.roomName]);
        };
        RoomRedis.prototype.getGame = function (roomId, callback) {
            var key = [RoomRedis.KEY_ROOM, roomId, RoomRedis.KEY_GAME].join(DELIMETER);
            redisClient.get(key, function (err, result) {
                if (err) {
                    return callback(err, null);
                }
                callback(null, result);
            });
        };
        RoomRedis.prototype.getPlayers = function (roomId, callback) {
            var key = [RoomRedis.KEY_ROOM, roomId, RoomRedis.KEY_PLAYER].join(DELIMETER);
            redisClient.smembers(key, function (err, result) {
                if (err) {
                    return callback(err, null);
                }
                callback(null, result);
            });
        };
        RoomRedis.prototype.putPlayer = function (roomId, player, callback) {
            if (!player) {
                return callback(new Error(DataStoreInterfaces_1.ERRORS.ROOM.INVALID_PLAYER), null);
            }
            var key = [RoomRedis.KEY_ROOM, roomId, RoomRedis.KEY_PLAYER].join(DELIMETER);
            var success = redisClient.sadd(key, player);
            if (!success) {
                return callback(new Error(ERROR_UNKNOWN), null);
            }
            callback(null, player);
        };
        RoomRedis.prototype.setGame = function (roomId, game, callback) {
            if (!game) {
                return callback(new Error(DataStoreInterfaces_1.ERRORS.ROOM.INVALID_GAME));
            }
            var key = [RoomRedis.KEY_ROOM, roomId, RoomRedis.KEY_GAME].join(DELIMETER);
            var success = redisClient.set(key, game);
            if (!success) {
                return callback(new Error(ERROR_UNKNOWN));
            }
            callback(null);
        };
        RoomRedis.KEY_ROOM = 'room';
        RoomRedis.KEY_GAME = 'game';
        RoomRedis.KEY_PLAYER = 'player';
        RoomRedis.roomName = 'demo';
        return RoomRedis;
    }());
    var ResultRedis = (function () {
        function ResultRedis() {
        }
        ResultRedis.prototype.getResults = function (start, end, callback) {
            redisClient.lrange(ResultRedis.KEY_RESULTS, start, end, function (err, payloads) {
                if (err) {
                    return callback(err, null);
                }
                callback(null, _.map(payloads, function (payload) { return JSON.parse(payload); }));
            });
        };
        ResultRedis.prototype.pushResult = function (gameId, scores, callback) {
            redisClient.rpush(ResultRedis.KEY_RESULTS, JSON.stringify({ game: gameId, scores: scores }), callback);
        };
        ResultRedis.prototype.addPlayerWin = function (player, callback) {
            redisClient.zincrby(ResultRedis.KEY_LEADERBOARD, 1, player, function (err, result) {
                if (err) {
                    return callback(err, null);
                }
                callback(null, +result);
            });
        };
        ResultRedis.prototype.getPlayerWins = function (player, callback) {
            redisClient.zscore(ResultRedis.KEY_LEADERBOARD, player, function (err, result) {
                if (err) {
                    return callback(err, null);
                }
                callback(null, +result);
            });
        };
        ResultRedis.prototype.getMostWins = function (start, end, callback) {
            redisClient.zrevrange(ResultRedis.KEY_LEADERBOARD, start, end, 'WITHSCORES', function (err, result) {
                if (err) {
                    return callback(err, null);
                }
                console.log('getMostWins resolved', result);
                callback(null, _.map(_.chunk(result, 2), function (pair) {
                    return { player: pair[0], wins: +pair[1] };
                }));
            });
        };
        ResultRedis.KEY_RESULTS = 'results';
        ResultRedis.KEY_LEADERBOARD = 'leaderboard';
        return ResultRedis;
    }());
})(DataStoreRedisModule || (DataStoreRedisModule = {}));
module.exports = DataStoreRedisModule;
