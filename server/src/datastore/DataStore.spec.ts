/// <reference path="../../typings/tsd.d.ts" />

import should = require("should");

import DataStore = require('./DataStore');

import DataStoreModule = require('./DataStoreInterfaces');
import DataStoreInterface = DataStoreModule.DataStoreInterface;

describe('DataStore', () => {
    var dataStore:DataStoreInterface = null;

    beforeEach((done) => {
        dataStore = DataStore.create();
        dataStore.connect(done);
    });

    afterEach(() => {
        DataStore.reset();
    });

    describe('ChatDataStore', () => {
        it('gets empty chat', (done) => {
            dataStore.chat.getGlobalChat(10, (err, results) => {
                should.not.exist(err);
                should.exist(results);
                results.should.eql([]);
                done();
            });
        });

        it('posts and retrieves chat', (done) => {
            dataStore.chat.pushGlobalChat("Yay!", (err, results) => {
                dataStore.chat.getGlobalChat(10, (err, results) => {
                    should.not.exist(err);
                    should.exist(results);
                    results.should.eql(['Yay!']);
                    done();
                });
            });
        });

        it('gets with default limit', (done) => {
            dataStore.chat.pushGlobalChat("Yay!", (err, results) => {
                dataStore.chat.getGlobalChat(null, (err, results) => {
                    should.not.exist(err);
                    should.exist(results);
                    results.should.eql(["Yay!"]);
                    done();
                });
            });
        });

        it('gets with negative limit', (done) => {
            dataStore.chat.pushGlobalChat("Yay!", (err, results) => {
                dataStore.chat.getGlobalChat(-1, (err, results) => {
                    should.not.exist(err);
                    should.exist(results);
                    results.should.eql([]);
                    done();
                });
            });
        });

        it('cannot post with null message', (done) => {
            dataStore.chat.pushGlobalChat(null, (err, results) => {
                should.exist(err);
                should.not.exist(results);
                done();
            });
        });

        it('cannot post with empty message', (done) => {
            dataStore.chat.pushGlobalChat("", (err, results) => {
                should.exist(err);
                should.not.exist(results);
                done();
            });
        });

        it('fires event on post', (done) => {
            dataStore.chat.onGlobalChat((message:string) => {
                should.exist(message);
                message.should.eql("Yay!");
                done();
            });

            dataStore.chat.pushGlobalChat("Yay!", (err, results) => {
                should.not.exist(err);
            });
        });
    });

    describe('GameDataStore', () => {
        describe('with missing game', () => {
            it('getPlayerCards', (done) => {
                dataStore.game.getPlayerCards("bogus game", "bogus player", (err, results) => {
                    should.not.exist(err);
                    should.not.exist(results);
                    done();
                });
            });

            it('getPlayerStates', (done) => {
                dataStore.game.getPlayerStates("bogus game", (err, results) => {
                    should.not.exist(err);
                    should.not.exist(results);
                    done();
                });
            });

            it('setPlayerState', (done) => {
                dataStore.game.setPlayerState("bogus game", "bogus player", "state", (err) => {
                    should.not.exist(err);
                    done();
                });
            });

            it('postPlayerCard', (done) => {
                dataStore.game.postPlayerCard("bogus game", "bogus player", "card", (err) => {
                    should.not.exist(err);
                    done();
                });
            });
        });

        describe('player cards', () => {
            var gameId:string = null;

            beforeEach((done) => {
                dataStore.game.postGame((err:Error, createdGameId:string) => {
                    should.not.exist(err);
                    should.exist(createdGameId);
                    gameId = createdGameId;
                    done();
                })
            });

            it('get with no players', (done) => {
                dataStore.game.getPlayerCards(gameId, "bogus player", (err, results) => {
                    should.not.exist(err);
                    should.not.exist(results);
                    done();
                });
            });

            it('post to new player', (done) => {
                dataStore.game.postPlayerCard(gameId, "new player", "AH", (err) => {
                    should.not.exist(err);

                    dataStore.game.getPlayerCards(gameId, "new player", (err, results) => {
                        should.not.exist(err);
                        should.exist(results);
                        results.should.eql(["AH"]);
                        done();
                    });
                });
            });

            it('post to multiple players', (done) => {
                dataStore.game.postPlayerCard(gameId, "new player", "AH", (err) => {
                    should.not.exist(err);

                    dataStore.game.postPlayerCard(gameId, "other player", "AC", (err) => {
                        should.not.exist(err);

                        dataStore.game.getPlayerCards(gameId, "new player", (err, results) => {
                            should.not.exist(err);
                            should.exist(results);
                            results.should.eql(["AH"]);
                            done();
                        });
                    });
                });
            });

            it('post multiple cards', (done) => {
                dataStore.game.postPlayerCard(gameId, "new player", "AH", (err) => {
                    should.not.exist(err);

                    dataStore.game.postPlayerCard(gameId, "new player", "AC", (err) => {
                        should.not.exist(err);

                        dataStore.game.getPlayerCards(gameId, "new player", (err, results) => {
                            should.not.exist(err);
                            should.exist(results);
                            results.should.eql(["AH", "AC"]);
                            done();
                        });
                    });
                });
            });

            it('post empty card', (done) => {
                dataStore.game.postPlayerCard(gameId, "new player", "", (err) => {
                    should.exist(err);
                    done();
                });
            });

            it('post null card', (done) => {
                dataStore.game.postPlayerCard(gameId, "new player", null, (err) => {
                    should.exist(err);
                    done();
                });
            });
        });

        describe('player states', () => {
            var gameId:string = null;

            beforeEach((done) => {
                dataStore.game.postGame((err:Error, createdGameId:string) => {
                    should.not.exist(err);
                    should.exist(createdGameId);
                    gameId = createdGameId;
                    done();
                })
            });

            it('get with no players', (done) => {
                dataStore.game.getPlayerStates(gameId, (err, results) => {
                    should.not.exist(err);
                    should.not.exist(results);
                    done();
                });
            });

            it('set and get states', (done) => {
                dataStore.game.setPlayerState(gameId, "new player", "state", (err) => {
                    should.not.exist(err);

                    dataStore.game.getPlayerStates(gameId, (err, results) => {
                        should.not.exist(err);
                        should.exist(results);
                        results.should.eql({"new player": "state"});
                        done();
                    });
                });
            });

            it('set and get multiple states', (done) => {
                dataStore.game.setPlayerState(gameId, "new player", "state", (err) => {
                    should.not.exist(err);

                    dataStore.game.setPlayerState(gameId, "other player", "other state", (err) => {
                        should.not.exist(err);

                        dataStore.game.getPlayerStates(gameId, (err, results) => {
                            should.not.exist(err);
                            should.exist(results);
                            results.should.eql({
                                "new player": "state",
                                "other player": "other state"
                            });
                            done();
                        });
                    });
                });
            });

            it('update existing state', (done) => {
                dataStore.game.setPlayerState(gameId, "new player", "state", (err) => {
                    should.not.exist(err);

                    dataStore.game.setPlayerState(gameId, "new player", "other state", (err) => {
                        should.not.exist(err);

                        dataStore.game.getPlayerStates(gameId, (err, results) => {
                            should.not.exist(err);
                            should.exist(results);
                            results.should.eql({
                                "new player": "other state"
                            });
                            done();
                        });
                    });
                });
            });

            it('set empty state', (done) => {
                dataStore.game.setPlayerState(gameId, "new player", "", (err) => {
                    should.not.exist(err);
                    done();
                });
            });

            it('set null state', (done) => {
                dataStore.game.setPlayerState(gameId, "new player", null, (err) => {
                    should.not.exist(err);
                    done();
                });
            });
        });
    });
});
