/// <reference path="../../typings/main.d.ts" />
"use strict";
var should = require("should");
var DataStore = require('./DataStore');
// These tests run against whichever data store is active for the environment. Using `gulp deploy` will endure the tests
// run on heroku/redis before the deploy is accepted.
describe('DataStore', function () {
    var dataStore = null;
    beforeEach(function (done) {
        dataStore = DataStore.create();
        dataStore.connect(done);
    });
    afterEach(function (done) {
        dataStore.reset(done);
    });
    describe('ChatDataStore', function () {
        it('gets empty chat', function (done) {
            dataStore.chat.getGlobalChat(10, function (err, result) {
                should.not.exist(err);
                should.exist(result);
                result.should.eql([]);
                done();
            });
        });
        it('posts and retrieves chat', function (done) {
            dataStore.chat.pushGlobalChat("Yay!", function (err, result) {
                dataStore.chat.getGlobalChat(10, function (err, result) {
                    should.not.exist(err);
                    should.exist(result);
                    result.should.eql(['Yay!']);
                    done();
                });
            });
        });
        it('gets with default limit', function (done) {
            dataStore.chat.pushGlobalChat("Yay!", function (err, result) {
                dataStore.chat.getGlobalChat(null, function (err, result) {
                    should.not.exist(err);
                    should.exist(result);
                    result.should.eql(["Yay!"]);
                    done();
                });
            });
        });
        it('gets with negative limit', function (done) {
            dataStore.chat.pushGlobalChat("Yay!", function (err, result) {
                dataStore.chat.getGlobalChat(-1, function (err, result) {
                    should.not.exist(err);
                    should.exist(result);
                    result.should.eql([]);
                    done();
                });
            });
        });
        it('cannot post with null message', function (done) {
            dataStore.chat.pushGlobalChat(null, function (err, result) {
                should.exist(err);
                should.not.exist(result);
                done();
            });
        });
        it('cannot post with empty message', function (done) {
            dataStore.chat.pushGlobalChat("", function (err, result) {
                should.exist(err);
                should.not.exist(result);
                done();
            });
        });
        it('fires event on post', function (done) {
            dataStore.chat.onGlobalChat(function (message) {
                should.exist(message);
                message.should.eql("Yay!");
                done();
            });
            dataStore.chat.pushGlobalChat("Yay!", function (err, result) {
                should.not.exist(err);
            });
        });
    });
    describe('GameDataStore', function () {
        describe("postGame", function () {
            it('increments game id', function (done) {
                dataStore.game.postGame(function (err, createdGameId) {
                    should.not.exist(err);
                    should.exist(createdGameId);
                    createdGameId.should.eql('1');
                    dataStore.game.postGame(function (err, createdGameId) {
                        should.not.exist(err);
                        should.exist(createdGameId);
                        createdGameId.should.eql('2');
                        done();
                    });
                });
            });
        });
        describe('with missing game', function () {
            it('getPlayerCards', function (done) {
                dataStore.game.getPlayerCards("bogus game", "bogus player", function (err, result) {
                    should.not.exist(err);
                    should.exist(result);
                    result.should.eql([]);
                    done();
                });
            });
            it('getPlayerStates', function (done) {
                dataStore.game.getPlayerStates("bogus game", function (err, result) {
                    should.not.exist(err);
                    should.exist(result);
                    result.should.eql([]);
                    done();
                });
            });
            it('setPlayerState', function (done) {
                dataStore.game.setPlayerState("bogus game", "bogus player", "state", function (err) {
                    should.not.exist(err);
                    done();
                });
            });
            it('postPlayerCard', function (done) {
                dataStore.game.postPlayerCard("bogus game", "bogus player", "card", function (err) {
                    should.not.exist(err);
                    done();
                });
            });
        });
        describe('player cards', function () {
            var gameId = null;
            beforeEach(function (done) {
                dataStore.game.postGame(function (err, createdGameId) {
                    should.not.exist(err);
                    should.exist(createdGameId);
                    gameId = createdGameId;
                    done();
                });
            });
            it('get with no players', function (done) {
                dataStore.game.getPlayerCards(gameId, "bogus player", function (err, result) {
                    should.not.exist(err);
                    should.exist(result);
                    result.should.eql([]);
                    done();
                });
            });
            it('post to new player', function (done) {
                dataStore.game.postPlayerCard(gameId, "new player", "AH", function (err) {
                    should.not.exist(err);
                    dataStore.game.getPlayerCards(gameId, "new player", function (err, result) {
                        should.not.exist(err);
                        should.exist(result);
                        result.should.eql(["AH"]);
                        done();
                    });
                });
            });
            it('post to multiple players', function (done) {
                dataStore.game.postPlayerCard(gameId, "new player", "AH", function (err) {
                    should.not.exist(err);
                    dataStore.game.postPlayerCard(gameId, "other player", "AC", function (err) {
                        should.not.exist(err);
                        dataStore.game.getPlayerCards(gameId, "new player", function (err, result) {
                            should.not.exist(err);
                            should.exist(result);
                            result.should.eql(["AH"]);
                            done();
                        });
                    });
                });
            });
            it('post multiple cards', function (done) {
                dataStore.game.postPlayerCard(gameId, "new player", "AH", function (err) {
                    should.not.exist(err);
                    dataStore.game.postPlayerCard(gameId, "new player", "AC", function (err) {
                        should.not.exist(err);
                        dataStore.game.getPlayerCards(gameId, "new player", function (err, result) {
                            should.not.exist(err);
                            should.exist(result);
                            result.should.eql(["AC", "AH"]);
                            done();
                        });
                    });
                });
            });
            it('post card event', function (done) {
                dataStore.game.onPushedCard(function (pushedCard) {
                    should.exist(pushedCard);
                    pushedCard.should.eql({
                        gameId: gameId,
                        player: 'new player',
                        card: 'AH'
                    });
                    done();
                });
                dataStore.game.postPlayerCard(gameId, "new player", "AH", function (err) {
                    should.not.exist(err);
                });
            });
            it('post empty card', function (done) {
                dataStore.game.postPlayerCard(gameId, "new player", "", function (err) {
                    should.exist(err);
                    done();
                });
            });
            it('post null card', function (done) {
                dataStore.game.postPlayerCard(gameId, "new player", null, function (err) {
                    should.exist(err);
                    done();
                });
            });
        });
        describe('player states', function () {
            var gameId = null;
            beforeEach(function (done) {
                dataStore.game.postGame(function (err, createdGameId) {
                    should.not.exist(err);
                    should.exist(createdGameId);
                    gameId = createdGameId;
                    done();
                });
            });
            it('get with no players', function (done) {
                dataStore.game.getPlayerStates(gameId, function (err, result) {
                    should.not.exist(err);
                    should.exist(result);
                    result.should.eql([]);
                    done();
                });
            });
            it('set and get states', function (done) {
                dataStore.game.setPlayerState(gameId, "new player", "state", function (err) {
                    should.not.exist(err);
                    dataStore.game.getPlayerStates(gameId, function (err, result) {
                        should.not.exist(err);
                        should.exist(result);
                        result.should.eql([{ player: "new player", state: "state" }]);
                        done();
                    });
                });
            });
            it('set and get multiple states', function (done) {
                dataStore.game.setPlayerState(gameId, "new player", "state", function (err) {
                    should.not.exist(err);
                    dataStore.game.setPlayerState(gameId, "other player", "other state", function (err) {
                        should.not.exist(err);
                        dataStore.game.getPlayerStates(gameId, function (err, result) {
                            should.not.exist(err);
                            should.exist(result);
                            result.should.eql([
                                { player: "new player", state: "state" },
                                { player: "other player", state: "other state" }
                            ]);
                            done();
                        });
                    });
                });
            });
            it('update existing state', function (done) {
                dataStore.game.setPlayerState(gameId, "new player", "state", function (err) {
                    should.not.exist(err);
                    dataStore.game.setPlayerState(gameId, "new player", "other state", function (err) {
                        should.not.exist(err);
                        dataStore.game.getPlayerStates(gameId, function (err, result) {
                            should.not.exist(err);
                            should.exist(result);
                            result.should.eql([{ player: "new player", state: "other state" }]);
                            done();
                        });
                    });
                });
            });
            it('change state event', function (done) {
                dataStore.game.onPlayerStateChange(function (playerState) {
                    should.exist(playerState);
                    playerState.should.eql({
                        gameId: gameId,
                        player: 'new player',
                        state: 'state'
                    });
                    done();
                });
                dataStore.game.setPlayerState(gameId, "new player", "state", function (err) {
                    should.not.exist(err);
                });
            });
            it('set empty state', function (done) {
                dataStore.game.setPlayerState(gameId, "new player", "", function (err) {
                    should.not.exist(err);
                    done();
                });
            });
            it('set null state', function (done) {
                dataStore.game.setPlayerState(gameId, "new player", null, function (err) {
                    should.not.exist(err);
                    done();
                });
            });
        });
        describe('deck', function () {
            it('count empty deck', function (done) {
                dataStore.game.countDeck('game_id', function (err, result) {
                    should.not.exist(err);
                    should.exist(result);
                    result.should.eql(0);
                    done();
                });
            });
            it('set deck', function (done) {
                dataStore.game.setDeck('game_id', ['a', 'b', 'c'], function (err) {
                    should.not.exist(err);
                    dataStore.game.countDeck('game_id', function (err, result) {
                        should.not.exist(err);
                        should.exist(result);
                        result.should.eql(3);
                        done();
                    });
                });
            });
            it('rpoplpush', function (done) {
                dataStore.game.setDeck('game_id', ['a', 'b', 'c'], function (err) {
                    should.not.exist(err);
                    dataStore.game.rpoplpush('game_id', 'player_id', function (err, result) {
                        should.not.exist(err);
                        should.exist(result);
                        result.should.eql('c');
                        dataStore.game.rpoplpush('game_id', 'player_id', function (err, result) {
                            should.not.exist(err);
                            should.exist(result);
                            result.should.eql('b');
                            dataStore.game.getPlayerCards('game_id', 'player_id', function (err, cards) {
                                should.not.exist(err);
                                should.exist(cards);
                                cards.should.eql(['b', 'c']);
                                done();
                            });
                        });
                    });
                });
            });
        });
    });
    describe('RoomDataStore', function () {
        describe('with missing room', function () {
            it('deletePlayer', function (done) {
                dataStore.room.deletePlayer("bogus", "player", function (err, result) {
                    should.not.exist(err);
                    should.not.exist(result);
                    done();
                });
            });
            it('getGame', function (done) {
                dataStore.room.getGame("bogus", function (err, result) {
                    should.not.exist(err);
                    should.not.exist(result);
                    done();
                });
            });
            it('getPlayers', function (done) {
                dataStore.room.getPlayers("bogus", function (err, result) {
                    should.not.exist(err);
                    should.exist(result);
                    result.should.eql([]);
                    done();
                });
            });
            it('putPlayer', function (done) {
                dataStore.room.putPlayer("bogus", "player", function (err, result) {
                    should.not.exist(err);
                    should.exist(result);
                    result.should.eql("player");
                    done();
                });
            });
            it('setGame', function (done) {
                dataStore.room.setGame("bogus", "game", function (err) {
                    should.not.exist(err);
                    done();
                });
            });
        });
        describe('getRooms', function () {
            it('gets demo room', function (done) {
                dataStore.room.getRooms(function (err, rooms) {
                    should.not.exist(err);
                    should.exist(rooms);
                    rooms.should.eql(['demo']);
                    done();
                });
            });
        });
        describe('game', function () {
            it('set and get game', function (done) {
                dataStore.room.setGame('demo', 'game', function (err) {
                    should.not.exist(err);
                    dataStore.room.getGame('demo', function (err, game) {
                        should.not.exist(err);
                        should.exist(game);
                        game.should.eql('game');
                        done();
                    });
                });
            });
            it('set empty game', function (done) {
                dataStore.room.setGame('demo', 'game', function (err) {
                    should.not.exist(err);
                    dataStore.room.setGame('demo', '', function (err) {
                        should.exist(err);
                        dataStore.room.getGame('demo', function (err, game) {
                            should.not.exist(err);
                            should.exist(game);
                            game.should.eql('game');
                            done();
                        });
                    });
                });
            });
            it('set null game', function (done) {
                dataStore.room.setGame('demo', 'game', function (err) {
                    should.not.exist(err);
                    dataStore.room.setGame('demo', null, function (err) {
                        should.exist(err);
                        dataStore.room.getGame('demo', function (err, game) {
                            should.not.exist(err);
                            should.exist(game);
                            game.should.eql('game');
                            done();
                        });
                    });
                });
            });
        });
        describe('players', function () {
            it('put and get player', function (done) {
                dataStore.room.putPlayer('demo', 'player', function (err, player) {
                    should.not.exist(err);
                    should.exist(player);
                    player.should.eql('player');
                    dataStore.room.getPlayers('demo', function (err, players) {
                        should.not.exist(err);
                        should.exist(players);
                        players.should.eql(['player']);
                        done();
                    });
                });
            });
            it('put and get multiple player', function (done) {
                dataStore.room.putPlayer('demo', 'player', function (err, player) {
                    should.not.exist(err);
                    dataStore.room.putPlayer('demo', 'other', function (err, player) {
                        should.not.exist(err);
                        should.exist(player);
                        player.should.eql('other');
                        dataStore.room.getPlayers('demo', function (err, players) {
                            should.not.exist(err);
                            should.exist(players);
                            players.length.should.eql(2);
                            players.should.containDeep(['player', 'other']);
                            done();
                        });
                    });
                });
            });
            it('put and get multiple times', function (done) {
                dataStore.room.putPlayer('demo', 'player', function (err, player) {
                    should.not.exist(err);
                    dataStore.room.putPlayer('demo', 'player', function (err, player) {
                        should.not.exist(err);
                        should.exist(player);
                        player.should.eql('player');
                        dataStore.room.getPlayers('demo', function (err, players) {
                            should.not.exist(err);
                            should.exist(players);
                            players.should.eql(['player']);
                            done();
                        });
                    });
                });
            });
            it('delete player', function (done) {
                dataStore.room.putPlayer('demo', 'player', function (err, player) {
                    should.not.exist(err);
                    dataStore.room.deletePlayer('demo', 'player', function (err) {
                        should.not.exist(err);
                        dataStore.room.getPlayers('demo', function (err, players) {
                            should.not.exist(err);
                            should.exist(players);
                            players.should.eql([]);
                            done();
                        });
                    });
                });
            });
            it('delete missing player', function (done) {
                dataStore.room.deletePlayer('demo', 'player', function (err) {
                    should.not.exist(err);
                    dataStore.room.getPlayers('demo', function (err, players) {
                        should.not.exist(err);
                        should.exist(players);
                        players.should.eql([]);
                        done();
                    });
                });
            });
            it('set empty players', function (done) {
                dataStore.room.putPlayer('demo', '', function (err) {
                    should.exist(err);
                    dataStore.room.getPlayers('demo', function (err, players) {
                        should.not.exist(err);
                        should.exist(players);
                        players.should.eql([]);
                        done();
                    });
                });
            });
            it('set null game', function (done) {
                dataStore.room.putPlayer('demo', null, function (err) {
                    should.exist(err);
                    dataStore.room.getPlayers('demo', function (err, players) {
                        should.not.exist(err);
                        should.exist(players);
                        players.should.eql([]);
                        done();
                    });
                });
            });
            it('delete empty player', function (done) {
                dataStore.room.deletePlayer('demo', '', function (err) {
                    should.not.exist(err);
                    dataStore.room.getPlayers('demo', function (err, players) {
                        should.not.exist(err);
                        should.exist(players);
                        players.should.eql([]);
                        done();
                    });
                });
            });
            it('delete null player', function (done) {
                dataStore.room.deletePlayer('demo', null, function (err) {
                    should.not.exist(err);
                    dataStore.room.getPlayers('demo', function (err, players) {
                        should.not.exist(err);
                        should.exist(players);
                        players.should.eql([]);
                        done();
                    });
                });
            });
        });
    });
    describe('ResultDataStore', function () {
        describe('player wins', function () {
            it('record win', function (done) {
                dataStore.result.addPlayerWin('player', function (err, wins) {
                    should.not.exist(err);
                    should.exist(wins);
                    wins.should.eql(1);
                    dataStore.result.getPlayerWins('player', function (err, wins) {
                        should.not.exist(err);
                        should.exist(wins);
                        wins.should.eql(1);
                        done();
                    });
                });
            });
            it('record multiple wins', function (done) {
                dataStore.result.addPlayerWin('player', function (err, wins) {
                    should.not.exist(err);
                    dataStore.result.addPlayerWin('player', function (err, wins) {
                        should.not.exist(err);
                        dataStore.result.getPlayerWins('player', function (err, wins) {
                            should.not.exist(err);
                            should.exist(wins);
                            wins.should.eql(2);
                            done();
                        });
                    });
                });
            });
            it('record wins for multiple players', function (done) {
                dataStore.result.addPlayerWin('player', function (err, wins) {
                    should.not.exist(err);
                    dataStore.result.addPlayerWin('other', function (err, wins) {
                        should.not.exist(err);
                        dataStore.result.getPlayerWins('player', function (err, wins) {
                            should.not.exist(err);
                            should.exist(wins);
                            wins.should.eql(1);
                            done();
                        });
                    });
                });
            });
            it('leaderboard', function (done) {
                dataStore.result.addPlayerWin('player', function (err, wins) {
                    should.not.exist(err);
                    dataStore.result.addPlayerWin('other', function (err, wins) {
                        should.not.exist(err);
                        dataStore.result.addPlayerWin('player', function (err, wins) {
                            should.not.exist(err);
                            dataStore.result.getMostWins(0, -1, function (err, leaderboard) {
                                should.not.exist(err);
                                should.exist(leaderboard);
                                leaderboard.length.should.eql(2);
                                leaderboard[0].should.eql({ player: 'player', wins: 2 });
                                leaderboard[1].should.eql({ player: 'other', wins: 1 });
                                done();
                            });
                        });
                    });
                });
            });
        });
        describe('results', function () {
            it('set and get results', function (done) {
                dataStore.result.pushResult('game', { 'dealer': 20, 'player': 18 }, function (err) {
                    should.not.exist(err);
                    dataStore.result.getResults(-1, -1, function (err, results) {
                        should.not.exist(err);
                        should.exist(results);
                        results.should.containEql({ game: 'game', scores: { 'dealer': 20, 'player': 18 } });
                        done();
                    });
                });
            });
            it('bad range', function (done) {
                dataStore.result.getResults(0, 10, function (err, results) {
                    should.not.exist(err);
                    should.exist(results);
                    results.should.eql([]);
                    done();
                });
            });
        });
    });
});
