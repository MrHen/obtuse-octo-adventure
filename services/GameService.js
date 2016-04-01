/// <reference path="../../typings/main.d.ts" />
"use strict";
var _ = require('lodash');
var async = require('async');
var events = require('events');
var GameConstants = require('./GameConstants');
var GameServiceModule;
(function (GameServiceModule) {
    var GameServiceController = (function () {
        function GameServiceController(api) {
            var _this = this;
            this.api = api;
            this.emitter = new events.EventEmitter();
            // Player was dealt a card; check if a state change is necessary
            this.handleCardPushed = function (cardPush) {
                console.log('handleCardPushed -> updatePlayerState');
                _this.updatePlayerState(cardPush.gameId, cardPush.player);
            };
            // Kick off the main action loop after every state change.
            // TODO Make this scaling friendly by pulling from a queue instead of listening to events.
            this.handleStateChange = function (playerState) {
                // Ignore WIN state change since that only happens after the game has already ended
                if (playerState.state !== GameConstants.PLAYER_STATES.WIN) {
                    console.log('handleStateChange -> actionLoop');
                    _this.actionLoop(playerState.gameId);
                }
            };
            // The main action loop. This will check a particular game and identify the next actor
            this.actionLoop = function (gameId, callback) {
                if (!callback) {
                    callback = function (err) {
                        if (err) {
                            console.warn("Saw unprocessed error from actionLoop", err);
                        }
                    };
                }
                console.log('actionLoop started', gameId);
                async.auto({
                    'states': [function (autoCb, results) {
                            _this.api.game.getPlayerStates(gameId, autoCb);
                        }],
                    'next_action': ['states', function (autoCb, results) {
                            console.log('\tactionLoop saw findNextActionableState');
                            autoCb(null, _this.findNextActionableState(results.states));
                        }],
                    'do_action': ['next_action', function (autoCb, results) {
                            if (results.next_action) {
                                console.log('\tactionLoop saw doNextAction');
                                return _this.doNextAction(gameId, results.next_action, autoCb);
                            }
                            // No further actions to take
                            console.log('\tactionLoop saw endGame');
                            _this.endGame(gameId, callback);
                        }]
                }, callback);
            };
            this.updatePlayerState = function (gameId, player, callback) {
                if (!callback) {
                    callback = function (err) {
                        if (err) {
                            console.warn("Saw unprocessed error from handleCardPushed", err);
                        }
                    };
                }
                console.log('updatePlayerState started', gameId, player);
                async.auto({
                    'cards': [function (autoCb, results) {
                            _this.api.game.getPlayerCards(gameId, player, autoCb);
                        }],
                    'score': ['cards', function (autoCb, results) {
                            autoCb(null, _this.valueForCards(results.cards));
                        }],
                    'states': [function (autoCb, results) {
                            _this.api.game.getPlayerStates(gameId, autoCb);
                        }],
                    'state': ['states', function (autoCb, results) {
                            console.log('\tupdatePlayerState state', results);
                            autoCb(null, _.find(results.states, 'player', player).state);
                        }],
                    'process': ['cards', 'state', function (autoCb, results) {
                            console.log('\tupdatePlayerState process', results);
                            var state = null;
                            var end = false;
                            if (results.cards.length < 2) {
                                console.log('\tupdatePlayerState saw dealing');
                                state = GameConstants.PLAYER_STATES.DEALING;
                            }
                            if (!state && results.score > GameConstants.MAX) {
                                console.log('\tupdatePlayerState saw bust');
                                state = GameConstants.PLAYER_STATES.BUST;
                            }
                            if (!state && player === GameConstants.DEALER && results.score >= GameConstants.DEALER_STAY) {
                                console.log('\tupdatePlayerState saw dealer stay');
                                end = results.score === GameConstants.MAX; // Prematurely end the game once the dealer hits max
                                state = GameConstants.PLAYER_STATES.STAY;
                            }
                            // If we were waiting for cards and got enough, update to WAITING state
                            if (!state && results.state === GameConstants.PLAYER_STATES.DEALING && results.cards.length >= 2) {
                                console.log('\tupdatePlayerState saw dealer wait');
                                state = GameConstants.PLAYER_STATES.WAITING;
                            }
                            // Don't bother updating the player state before ending the game. endGame() will update things
                            // appropriately
                            if (end) {
                                console.log('\tupdatePlayerState saw game end');
                                return _this.endGame(gameId, autoCb);
                            }
                            if (state && state !== results.state) {
                                console.log('\tupdatePlayerState saw state change', { old: results.state, new: state });
                                return _this.api.game.setPlayerState(gameId, player, state, autoCb);
                            }
                            // If no state changes hit, run the action loop again. If a state change _did_ hit, the listener
                            // will automatically detect it.
                            console.log('\tupdatePlayerState saw actionLoop');
                            _this.actionLoop(gameId, autoCb);
                        }]
                }, function (err, results) {
                    callback(err);
                });
            };
            this.endGame = function (gameId, callback) {
                console.log('endGame started', gameId);
                async.auto({
                    'states': [function (autoCb, results) {
                            _this.api.game.getPlayerStates(gameId, autoCb);
                        }],
                    'players': ['states', function (autoCb, results) {
                            autoCb(null, _.map(results.states, 'player'));
                        }],
                    'cards': ['players', function (autoCb, results) {
                            async.mapLimit(results.players, 3, function (player, mapCb) { return _this.api.game.getPlayerCards(gameId, player, mapCb); }, autoCb);
                        }],
                    'scores': ['cards', function (autoCb, results) {
                            autoCb(null, _.map(results.cards, function (cards) { return _this.valueForCards(cards); }));
                        }],
                    'player_scores': ['scores', function (autoCb, results) {
                            autoCb(null, _.zipObject(results.players, results.scores));
                        }],
                    'save_scores': ['player_scores', function (autoCb, results) {
                            _this.api.result.pushResult(gameId, results.player_scores, autoCb);
                        }],
                    'winners': ['player_scores', function (autoCb, results) {
                            autoCb(null, _this.getWinners(results.states, results.player_scores));
                        }],
                    'leaderboard': ['winners', function (autoCb, results) {
                            async.eachLimit(results.winners, 3, function (winner, eachCb) {
                                _this.api.result.addPlayerWin(winner, eachCb);
                            }, autoCb);
                        }],
                    'winState': ['winners', function (autoCb, results) {
                            async.eachLimit(results.winners, 3, function (winner, eachCb) {
                                _this.api.game.setPlayerState(gameId, winner, GameConstants.PLAYER_STATES.WIN, eachCb);
                            }, autoCb);
                        }]
                }, function (err, results) {
                    if (err) {
                        return callback(err);
                    }
                    console.log('endGame finished', gameId);
                    callback(null);
                });
            };
            this.dealTimer = null;
            this.api = api;
        }
        Object.defineProperty(GameServiceController, "DECK", {
            get: function () {
                if (!GameServiceController._DECK) {
                    var cards = _.flatten(_.map(GameConstants.CARD_VALUES, function (value) {
                        return _.map(GameConstants.CARD_SUITS, function (suit) { return value + suit; });
                    }));
                    var all = _.clone(cards);
                    for (var i = 1; i < GameConstants.DECK_COUNT; i++) {
                        all.concat(_.clone(cards));
                    }
                    GameServiceController._DECK = all;
                }
                return GameServiceController._DECK;
            },
            enumerable: true,
            configurable: true
        });
        GameServiceController.prototype.doNextAction = function (gameId, playerState, callback) {
            var _this = this;
            console.log('doNextAction entered');
            if (playerState.state === GameConstants.PLAYER_STATES.DEALING) {
                console.log('\tdoNextAction saw dealing');
                this.deal(function () { return _this.api.game.rpoplpush(gameId, playerState.player, function (err) {
                    if (err) {
                        console.log('Unhandled error from rpoplpush', err);
                    }
                }); });
            }
            if (playerState.state === GameConstants.PLAYER_STATES.CURRENT) {
                if (playerState.player !== GameConstants.DEALER) {
                    console.log('\tdoNextAction saw player current');
                    var action = { player: playerState.player, action: [GameConstants.PLAYER_ACTIONS.HIT, GameConstants.PLAYER_ACTIONS.STAY] };
                    this.emitter.emit(GameConstants.EVENTS.GAME.ACTION_REMINDER, action);
                }
                else {
                    console.log('\tdoNextAction saw dealer current');
                    // The dealer will automatically change state to STAY when appropriate so if we got this far, they
                    // should get another card.
                    this.deal(function () { return _this.api.game.rpoplpush(gameId, playerState.player, function (err) {
                        if (err) {
                            console.log('Unhandled error from rpoplpush', err);
                        }
                    }); });
                }
            }
            if (playerState.state === GameConstants.PLAYER_STATES.WAITING) {
                console.log('\tdoNextAction saw waiting');
                return this.api.game.setPlayerState(gameId, playerState.player, GameConstants.PLAYER_STATES.CURRENT, callback);
            }
            callback(null);
        };
        GameServiceController.prototype.findNextActionableState = function (states) {
            console.log('findNextActionableState started');
            // Check if someone needs to be dealt a card.
            // TODO Mimic standard dealing patterns
            var dealing = _.find(states, { "state": GameConstants.PLAYER_STATES.DEALING });
            if (dealing) {
                console.log('\tfindNextActionableState saw dealing');
                return dealing;
            }
            // If no one needs cards, remind the current player it is their turn
            var current = _.find(states, { "state": GameConstants.PLAYER_STATES.CURRENT });
            if (current) {
                console.log('\tfindNextActionableState saw current');
                return current;
            }
            // If it is nobody's turn, look for a non-dealer to make the current player
            // TODO The current player could theoretically alternate after every action. This behavior should be
            // configurable and the "current player" should switch back to WAIT state after relevant actions.
            var waiting = _.find(states, function (value) {
                return value && value.player !== GameConstants.DEALER && value.state === GameConstants.PLAYER_STATES.WAITING;
            });
            if (waiting) {
                console.log('\tfindNextActionableState saw player waiting');
                return waiting;
            }
            // The only player left to act is the dealer, so make them the current player
            var dealer = _.find(states, { "player": GameConstants.DEALER });
            if (dealer && dealer.state === GameConstants.PLAYER_STATES.WAITING) {
                console.log('\tfindNextActionableState saw dealer waiting');
                return dealer;
            }
            console.log('\tfindNextActionableState saw nothing');
            return null;
        };
        GameServiceController.prototype.getWinners = function (states, scores) {
            var winners = _.map(_.reject(states, { 'state': GameConstants.PLAYER_STATES.BUST }), 'player');
            var dealerBust = !_.includes(winners, GameConstants.DEALER);
            if (!dealerBust && scores) {
                var dealerScore = scores[GameConstants.DEALER];
                winners = _.filter(winners, function (player) { return scores[player] > dealerScore; });
            }
            if (!winners.length) {
                winners = [GameConstants.DEALER];
            }
            return winners;
        };
        GameServiceController.prototype.isGameEnded = function (states) {
            var playing = _.map(states, 'state');
            if (_.includes(playing, GameConstants.PLAYER_STATES.WIN)) {
                return true;
            }
            playing = _.without(playing, GameConstants.PLAYER_STATES.BUST, GameConstants.PLAYER_STATES.STAY, GameConstants.PLAYER_STATES.WIN);
            return _.isEmpty(playing);
        };
        GameServiceController.prototype.shuffle = function (game, callback) {
            var newDeck = _.shuffle(GameServiceController.DECK);
            this.api.game.setDeck(game, newDeck, callback);
        };
        GameServiceController.prototype.valueForCards = function (cards) {
            return _.sumBy(cards, function (card) {
                if (!card) {
                    return 0;
                }
                if (+card[0] > 0) {
                    return +card[0];
                }
                return card[0] === 'A' ? 11 : 10;
            });
        };
        GameServiceController.prototype.deal = function (func) {
            var _this = this;
            if (this.dealTimer) {
                return;
            }
            this.dealTimer = setTimeout(function () {
                clearTimeout(_this.dealTimer);
                _this.dealTimer = null;
                func();
            }, GameServiceController.DEAL_DELAY);
        };
        GameServiceController.prototype.onActionReminder = function (callback) {
            this.emitter.on(GameConstants.EVENTS.GAME.ACTION_REMINDER, callback);
        };
        GameServiceController._DECK = null;
        // Deal card but use a throttle to prevent all the cards from getting dealt too suddenly
        // TODO the first card dealt should be snappy; it's the follow up cards that should be delayed
        GameServiceController.DEAL_DELAY = 1200;
        return GameServiceController;
    }());
    GameServiceModule.GameServiceController = GameServiceController;
})(GameServiceModule || (GameServiceModule = {}));
module.exports = GameServiceModule;
