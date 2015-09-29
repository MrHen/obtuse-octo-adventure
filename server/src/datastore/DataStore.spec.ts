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

    afterEach((done) => {
        dataStore.reset(done);
    });

    describe('ChatDataStore', () => {
        it('gets empty chat', (done) => {
            dataStore.chat.getGlobalChat(10, (err, result) => {
                should.not.exist(err);
                should.exist(result);
                result.should.eql([]);
                done();
            });
        });

        it('posts and retrieves chat', (done) => {
            dataStore.chat.pushGlobalChat("Yay!", (err, result) => {
                dataStore.chat.getGlobalChat(10, (err, result) => {
                    should.not.exist(err);
                    should.exist(result);
                    result.should.eql(['Yay!']);
                    done();
                });
            });
        });

        it('gets with default limit', (done) => {
            dataStore.chat.pushGlobalChat("Yay!", (err, result) => {
                dataStore.chat.getGlobalChat(null, (err, result) => {
                    should.not.exist(err);
                    should.exist(result);
                    result.should.eql(["Yay!"]);
                    done();
                });
            });
        });

        it('gets with negative limit', (done) => {
            dataStore.chat.pushGlobalChat("Yay!", (err, result) => {
                dataStore.chat.getGlobalChat(-1, (err, result) => {
                    should.not.exist(err);
                    should.exist(result);
                    result.should.eql([]);
                    done();
                });
            });
        });

        it('cannot post with null message', (done) => {
            dataStore.chat.pushGlobalChat(null, (err, result) => {
                should.exist(err);
                should.not.exist(result);
                done();
            });
        });

        it('cannot post with empty message', (done) => {
            dataStore.chat.pushGlobalChat("", (err, result) => {
                should.exist(err);
                should.not.exist(result);
                done();
            });
        });

        it('fires event on post', (done) => {
            dataStore.chat.onGlobalChat((message:string) => {
                should.exist(message);
                message.should.eql("Yay!");
                done();
            });

            dataStore.chat.pushGlobalChat("Yay!", (err, result) => {
                should.not.exist(err);
            });
        });
    });

    describe('GameDataStore', () => {
        describe("postGame", () => {
            it('increments game id', (done) => {
                dataStore.game.postGame((err:Error, createdGameId:string) => {
                    should.not.exist(err);
                    should.exist(createdGameId);
                    createdGameId.should.eql('1');

                    dataStore.game.postGame((err:Error, createdGameId:string) => {
                        should.not.exist(err);
                        should.exist(createdGameId);
                        createdGameId.should.eql('2');
                        done();
                    })
                })
            });
        });

        describe('with missing game', () => {
            it('getPlayerCards', (done) => {
                dataStore.game.getPlayerCards("bogus game", "bogus player", (err, result) => {
                    should.not.exist(err);
                    should.exist(result);
                    result.should.eql([]);
                    done();
                });
            });

            it('getPlayerStates', (done) => {
                dataStore.game.getPlayerStates("bogus game", (err, result) => {
                    should.not.exist(err);
                    should.exist(result);
                    result.should.eql([]);
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
                dataStore.game.getPlayerCards(gameId, "bogus player", (err, result) => {
                    should.not.exist(err);
                    should.exist(result);
                    result.should.eql([]);
                    done();
                });
            });

            it('post to new player', (done) => {
                dataStore.game.postPlayerCard(gameId, "new player", "AH", (err) => {
                    should.not.exist(err);

                    dataStore.game.getPlayerCards(gameId, "new player", (err, result) => {
                        should.not.exist(err);
                        should.exist(result);
                        result.should.eql(["AH"]);
                        done();
                    });
                });
            });

            it('post to multiple players', (done) => {
                dataStore.game.postPlayerCard(gameId, "new player", "AH", (err) => {
                    should.not.exist(err);

                    dataStore.game.postPlayerCard(gameId, "other player", "AC", (err) => {
                        should.not.exist(err);

                        dataStore.game.getPlayerCards(gameId, "new player", (err, result) => {
                            should.not.exist(err);
                            should.exist(result);
                            result.should.eql(["AH"]);
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

                        dataStore.game.getPlayerCards(gameId, "new player", (err, result) => {
                            should.not.exist(err);
                            should.exist(result);
                            result.should.eql(["AC", "AH"]);
                            done();
                        });
                    });
                });
            });

            it('post card event', (done) => {
                dataStore.game.onPushedCard((game:string, player:string, card:string) => {
                    should.exist(game);
                    game.should.eql(gameId);
                    should.exist(player);
                    player.should.eql("new player");
                    should.exist(card);
                    card.should.eql("AH");
                    done();
                });

                dataStore.game.postPlayerCard(gameId, "new player", "AH", (err) => {
                    should.not.exist(err);
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
                dataStore.game.getPlayerStates(gameId, (err, result) => {
                    should.not.exist(err);
                    should.exist(result);
                    result.should.eql([]);
                    done();
                });
            });

            it('set and get states', (done) => {
                dataStore.game.setPlayerState(gameId, "new player", "state", (err) => {
                    should.not.exist(err);

                    dataStore.game.getPlayerStates(gameId, (err, result) => {
                        should.not.exist(err);
                        should.exist(result);
                        result.should.eql([{player:"new player", state: "state"}]);
                        done();
                    });
                });
            });

            it('set and get multiple states', (done) => {
                dataStore.game.setPlayerState(gameId, "new player", "state", (err) => {
                    should.not.exist(err);

                    dataStore.game.setPlayerState(gameId, "other player", "other state", (err) => {
                        should.not.exist(err);

                        dataStore.game.getPlayerStates(gameId, (err, result) => {
                            should.not.exist(err);
                            should.exist(result);
                            result.should.eql([
                                {player: "new player", state: "state"},
                                {player: "other player", state: "other state"}
                            ]);
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

                        dataStore.game.getPlayerStates(gameId, (err, result) => {
                            should.not.exist(err);
                            should.exist(result);
                            result.should.eql([{player: "new player", state: "other state"}]);
                            done();
                        });
                    });
                });
            });

            it('change state event', (done) => {
                dataStore.game.onPlayerStateChange((game:string, player:string, state:string) => {
                    should.exist(game);
                    game.should.eql(gameId);
                    should.exist(player);
                    player.should.eql("new player");
                    should.exist(state);
                    state.should.eql("state");
                    done();
                });

                dataStore.game.setPlayerState(gameId, "new player", "state", (err) => {
                    should.not.exist(err);
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

        describe('deck', () => {
            it('count empty deck', (done) => {
                dataStore.game.countDeck('game_id', (err, result) => {
                    should.not.exist(err);
                    should.exist(result);
                    result.should.eql(0);
                    done();
                });
            });

            it('set deck', (done) => {
                dataStore.game.setDeck('game_id', ['a','b','c'], (err) => {
                    should.not.exist(err);

                    dataStore.game.countDeck('game_id', (err, result) => {
                        should.not.exist(err);
                        should.exist(result);
                        result.should.eql(3);
                        done();
                    });
                });
            });

            it('rpoplpush', (done) => {
                dataStore.game.setDeck('game_id', ['a','b','c'], (err) => {
                    should.not.exist(err);

                    dataStore.game.rpoplpush('game_id', 'player_id', (err, result:string) => {
                        should.not.exist(err);
                        should.exist(result);
                        result.should.eql('c');

                        dataStore.game.rpoplpush('game_id', 'player_id', (err, result:string) => {
                            should.not.exist(err);
                            should.exist(result);
                            result.should.eql('b');

                            dataStore.game.getPlayerCards('game_id', 'player_id', (err, cards:string[]) => {
                                should.not.exist(err);
                                should.exist(cards);
                                cards.should.eql(['b', 'c']);

                                done();
                            });
                        });
                    });
                });
            });
        })
    });

    describe('RoomDataStore', () => {
        describe('with missing room', () => {
            it('deletePlayer', (done) => {
                dataStore.room.deletePlayer("bogus", "player", (err, result) => {
                    should.not.exist(err);
                    should.not.exist(result);
                    done();
                });
            });
            it('getGame', (done) => {
                dataStore.room.getGame("bogus", (err, result) => {
                    should.not.exist(err);
                    should.not.exist(result);
                    done();
                });
            });
            it('getPlayers', (done) => {
                dataStore.room.getPlayers("bogus", (err, result) => {
                    should.not.exist(err);
                    should.exist(result);
                    result.should.eql([]);
                    done();
                });
            });
            it('putPlayer', (done) => {
                dataStore.room.putPlayer("bogus", "player", (err, result) => {
                    should.not.exist(err);
                    should.exist(result);
                    result.should.eql("player");
                    done();
                });
            });
            it('setGame', (done) => {
                dataStore.room.setGame("bogus", "game", (err) => {
                    should.not.exist(err);
                    done();
                });
            });
        });

        describe('getRooms', () => {
            it('gets demo room', (done) => {
                dataStore.room.getRooms((err:Error, rooms:string[]) => {
                    should.not.exist(err);
                    should.exist(rooms);
                    rooms.should.eql(['demo']);
                    done();
                })
            });
        });

        describe('game', () => {
            it('set and get game', (done) => {
                dataStore.room.setGame('demo', 'game', (err:Error) => {
                    should.not.exist(err);

                    dataStore.room.getGame('demo', (err:Error, game:string) => {
                        should.not.exist(err);
                        should.exist(game);
                        game.should.eql('game');
                        done();
                    });
                })
            });

            it('set empty game', (done) => {
                dataStore.room.setGame('demo', 'game', (err:Error) => {
                    should.not.exist(err);

                    dataStore.room.setGame('demo', '', (err:Error) => {
                        should.exist(err);

                        dataStore.room.getGame('demo', (err:Error, game:string) => {
                            should.not.exist(err);
                            should.exist(game);
                            game.should.eql('game');
                            done();
                        });
                    })
                });
            });

            it('set null game', (done) => {
                dataStore.room.setGame('demo', 'game', (err:Error) => {
                    should.not.exist(err);

                    dataStore.room.setGame('demo', null, (err:Error) => {
                        should.exist(err);

                        dataStore.room.getGame('demo', (err:Error, game:string) => {
                            should.not.exist(err);
                            should.exist(game);
                            game.should.eql('game');
                            done();
                        });
                    })
                });
            });
        });

        describe('players', () => {
            it('put and get player', (done) => {
                dataStore.room.putPlayer('demo', 'player', (err:Error, player:string) => {
                    should.not.exist(err);
                    should.exist(player);
                    player.should.eql('player');

                    dataStore.room.getPlayers('demo', (err:Error, players:string[]) => {
                        should.not.exist(err);
                        should.exist(players);
                        players.should.eql(['player']);
                        done();
                    });
                })
            });

            it('put and get multiple player', (done) => {
                dataStore.room.putPlayer('demo', 'player', (err:Error, player:string) => {
                    should.not.exist(err);

                    dataStore.room.putPlayer('demo', 'other', (err:Error, player:string) => {
                        should.not.exist(err);
                        should.exist(player);
                        player.should.eql('other');

                        dataStore.room.getPlayers('demo', (err:Error, players:string[]) => {
                            should.not.exist(err);
                            should.exist(players);
                            players.should.eql(['player', 'other']);
                            done();
                        });
                    });
                })
            });

            it('put and get multiple times', (done) => {
                dataStore.room.putPlayer('demo', 'player', (err:Error, player:string) => {
                    should.not.exist(err);

                    dataStore.room.putPlayer('demo', 'player', (err:Error, player:string) => {
                        should.not.exist(err);
                        should.exist(player);
                        player.should.eql('player');

                        dataStore.room.getPlayers('demo', (err:Error, players:string[]) => {
                            should.not.exist(err);
                            should.exist(players);
                            players.should.eql(['player']);
                            done();
                        });
                    });
                })
            });

            it('delete player', (done) => {
                dataStore.room.putPlayer('demo', 'player', (err:Error, player:string) => {
                    should.not.exist(err);

                    dataStore.room.deletePlayer('demo', 'player', (err:Error) => {
                        should.not.exist(err);

                        dataStore.room.getPlayers('demo', (err:Error, players:string[]) => {
                            should.not.exist(err);
                            should.exist(players);
                            players.should.eql([]);
                            done();
                        });
                    });
                })
            });

            it('delete missing player', (done) => {
                dataStore.room.deletePlayer('demo', 'player', (err:Error) => {
                    should.not.exist(err);

                    dataStore.room.getPlayers('demo', (err:Error, players:string[]) => {
                        should.not.exist(err);
                        should.exist(players);
                        players.should.eql([]);
                        done();
                    });
                });
            });

            it('set empty players', (done) => {
                dataStore.room.putPlayer('demo', '', (err:Error) => {
                    should.exist(err);

                    dataStore.room.getPlayers('demo', (err:Error, players:string[]) => {
                        should.not.exist(err);
                        should.exist(players);
                        players.should.eql([]);
                        done();
                    });
                })
            });

            it('set null game', (done) => {
                dataStore.room.putPlayer('demo', null, (err:Error) => {
                    should.exist(err);

                    dataStore.room.getPlayers('demo', (err:Error, players:string[]) => {
                        should.not.exist(err);
                        should.exist(players);
                        players.should.eql([]);
                        done();
                    });
                })
            });

            it('delete empty player', (done) => {
                dataStore.room.deletePlayer('demo', '', (err:Error) => {
                    should.not.exist(err);

                    dataStore.room.getPlayers('demo', (err:Error, players:string[]) => {
                        should.not.exist(err);
                        should.exist(players);
                        players.should.eql([]);
                        done();
                    });
                });
            });

            it('delete null player', (done) => {
                dataStore.room.deletePlayer('demo', null, (err:Error) => {
                    should.not.exist(err);

                    dataStore.room.getPlayers('demo', (err:Error, players:string[]) => {
                        should.not.exist(err);
                        should.exist(players);
                        players.should.eql([]);
                        done();
                    });
                });
            });
        });
    });

    describe('ResultDataStore', () => {
        describe('player wins', () => {
            it('record win', (done) => {
                dataStore.result.addPlayerWin('player', (err:Error, wins:number) => {
                    should.not.exist(err);
                    should.exist(wins);
                    wins.should.eql(1);

                    dataStore.result.getPlayerWins('player', (err:Error, wins:number) => {
                        should.not.exist(err);
                        should.exist(wins);
                        wins.should.eql(1);
                        done();
                    });
                });
            });

            it('record multiple wins', (done) => {
                dataStore.result.addPlayerWin('player', (err:Error, wins:number) => {
                    should.not.exist(err);

                    dataStore.result.addPlayerWin('player', (err:Error, wins:number) => {
                        should.not.exist(err);

                        dataStore.result.getPlayerWins('player', (err:Error, wins:number) => {
                            should.not.exist(err);
                            should.exist(wins);
                            wins.should.eql(2);
                            done();
                        });
                    });
                });
            });

            it('record wins for multiple players', (done) => {
                dataStore.result.addPlayerWin('player', (err:Error, wins:number) => {
                    should.not.exist(err);

                    dataStore.result.addPlayerWin('other', (err:Error, wins:number) => {
                        should.not.exist(err);

                        dataStore.result.getPlayerWins('player', (err:Error, wins:number) => {
                            should.not.exist(err);
                            should.exist(wins);
                            wins.should.eql(1);
                            done();
                        });
                    });
                });
            });
        });

        describe('results', () => {
            it('set and get results', (done) => {
                dataStore.result.pushResult('game', {'dealer': 20, 'player': 18}, (err:Error) => {
                    should.not.exist(err);

                    dataStore.result.getResults(-1, -1, (err:Error, results:{game:string; scores:{[player:string]:number}}[]) => {
                        should.not.exist(err);
                        should.exist(results);
                        results.should.containEql({game: 'game', scores: {'dealer': 20, 'player': 18}});
                        done();
                    });
                });
            });

            it('bad range', (done) => {
                dataStore.result.getResults(0, 10, (err:Error, results:{game:string; scores:{[player:string]:number}}[]) => {
                    should.not.exist(err);
                    should.exist(results);
                    results.should.eql([]);
                    done();
                });
            });
        });
    });
});
