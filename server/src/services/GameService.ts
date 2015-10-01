/// <reference path="../../typings/tsd.d.ts" />

import _ = require('lodash');
import async = require('async');
import events = require('events');

import GameConstants = require('./GameConstants');
import {DataStoreInterface} from '../datastore/DataStoreInterfaces';

module GameServiceModule {
    export interface GameServiceInterface {
        shuffle(game_id:string, callback:(err:Error)=>any);
        isGameEnded(states:{player:string; state:string}[]):boolean;
        valueForCards(cards:string[]):number;
    }

    export class GameServiceController implements GameServiceInterface {
        private static _DECK:string[] = null;
        public static get DECK():string[] {
            if (!GameServiceController._DECK) {
                var cards:string[] = _.flatten(_.map<string, string[]>(GameConstants.CARD_VALUES, (value) => {
                    return _.map(GameConstants.CARD_SUITS, (suit) => value + suit);
                }));

                var all = _.clone(cards);
                for (var i = 1; i < GameConstants.DECK_COUNT; i++) {
                    all.concat(_.clone(cards));
                }
                GameServiceController._DECK = all;
            }
            return GameServiceController._DECK;
        }

        private emitter:events.EventEmitter = new events.EventEmitter();

        public constructor(private api:DataStoreInterface) {
            this.api = api;
        }

        public doNextAction(gameId:string, playerState:{player:string; state:string}, callback:(err:Error)=>any) {
            console.log('doNextAction entered');
            if (playerState.state === GameConstants.PLAYER_STATES.DEALING) {
                console.log('\tdoNextAction saw dealing');
                this.deal(() => this.api.game.rpoplpush(gameId, playerState.player, (err) => {
                    if (err) {
                        console.log('Unhandled error from rpoplpush', err);
                    }
                }));
            }

            if (playerState.state === GameConstants.PLAYER_STATES.CURRENT) {
                if (playerState.player !== GameConstants.DEALER) {
                    console.log('\tdoNextAction saw player current');
                    var action = {player: playerState.player, action: [GameConstants.PLAYER_ACTIONS.HIT, GameConstants.PLAYER_ACTIONS.STAY]};
                    this.emitter.emit(GameConstants.EVENTS.GAME.ACTION_REMINDER, action);
                } else {
                    console.log('\tdoNextAction saw dealer current');
                    // The dealer will automatically change state to STAY when appropriate so if we got this far, they
                    // should get another card.
                    this.deal(() => this.api.game.rpoplpush(gameId, playerState.player, (err) => {
                        if (err) {
                            console.log('Unhandled error from rpoplpush', err);
                        }
                    }));
                }
            }

            if (playerState.state === GameConstants.PLAYER_STATES.WAITING) {
                console.log('\tdoNextAction saw waiting');
                return this.api.game.setPlayerState(gameId, playerState.player, GameConstants.PLAYER_STATES.CURRENT, callback);
            }

            callback(null);
        }

        public findNextActionableState(states:{player:string; state:string}[]):{player:string; state:string} {
            console.log('findNextActionableState started');
            // Check if someone needs to be dealt a card.
            // TODO Mimic standard dealing patterns
            var dealing = _.find<{player:string; state:string}>(states, "state", GameConstants.PLAYER_STATES.DEALING);
            if (dealing) {
                console.log('\tfindNextActionableState saw dealing');
                return dealing;
            }

            // If no one needs cards, remind the current player it is their turn
            var current = _.find<{player:string; state:string}>(states, "state", GameConstants.PLAYER_STATES.CURRENT);
            if (current) {
                console.log('\tfindNextActionableState saw current');
                return current;
            }

            // If it is nobody's turn, look for a non-dealer to make the current player
            // TODO The current player could theoretically alternate after every action. This behavior should be
            // configurable and the "current player" should switch back to WAIT state after relevant actions.
            var waiting = _.find<{player:string; state:string}>(states, (value) => {
                return value && value.player !== GameConstants.DEALER && value.state === GameConstants.PLAYER_STATES.WAITING
            });
            if (waiting) {
                console.log('\tfindNextActionableState saw player waiting');
                return waiting;
            }

            // The only player left to act is the dealer, so make them the current player
            var dealer = _.find<{player:string; state:string}>(states, "player", GameConstants.DEALER);
            if (dealer && dealer.state === GameConstants.PLAYER_STATES.WAITING) {
                console.log('\tfindNextActionableState saw dealer waiting');
                return dealer;
            }

            console.log('\tfindNextActionableState saw nothing');
            return null;
        }

        public getWinners(states:{player:string; state:string}[], scores:{[player:string]:number}):string[] {
            var winners = _.pluck(_.reject(states, {'state': GameConstants.PLAYER_STATES.BUST}), 'player');

            var dealerBust = !_.includes(winners, GameConstants.DEALER);

            if (!dealerBust && scores) {
                var dealerScore = scores[GameConstants.DEALER];
                winners = _.filter(winners, (player:string) => scores[player] > dealerScore);
            }

            if (!winners.length) {
                winners = [GameConstants.DEALER];
            }
            return winners;
        }

        // Player was dealt a card; check if a state change is necessary
        public handleCardPushed = (cardPush:ApiResponses.CardDealtResponse) => {
            console.log('handleCardPushed -> updatePlayerState');
            this.updatePlayerState(cardPush.gameId, cardPush.player);
        };

        // Kick off the main action loop after every state change.
        // TODO Make this scaling friendly by pulling from a queue instead of listening to events.
        public handleStateChange = (playerState:ApiResponses.PlayerStateResponse) => {
            // Ignore WIN state change since that only happens after the game has already ended
            if (playerState.state !== GameConstants.PLAYER_STATES.WIN) {
                console.log('handleStateChange -> actionLoop');
                this.actionLoop(playerState.gameId);
            }
        };

        public isGameEnded(states:{player:string; state:string}[]):boolean {
            var playing = _.pluck(states, 'state');
            if (_.include(playing, GameConstants.PLAYER_STATES.WIN)) {
                return true;
            }
            playing = _.without(playing, GameConstants.PLAYER_STATES.BUST, GameConstants.PLAYER_STATES.STAY, GameConstants.PLAYER_STATES.WIN);
            return _.isEmpty(playing);
        }

        public shuffle(game:string, callback:(err:Error)=>any) {
            var newDeck = _.shuffle<string>(GameServiceController.DECK);
            this.api.game.setDeck(game, newDeck, callback);
        }

        public valueForCards(cards:string[]):number {
            return _.sum(cards, (card:string) => {
                if (!card) {
                    return 0;
                }

                if (+card[0] > 0) {
                    return +card[0];
                }

                return card[0] === 'A' ? 11 : 10;
            })
        }

        // The main action loop. This will check a particular game and identify the next actor
        public actionLoop = (gameId:string, callback?:(err:Error)=>any) => {
            if (!callback) {
                callback = (err:Error) => {
                    if (err) {
                        console.warn("Saw unprocessed error from actionLoop", err);
                    }
                }
            }

            console.log('actionLoop started', gameId);

            async.auto({
                'states': [(autoCb, results) => {
                    this.api.game.getPlayerStates(gameId, autoCb)
                }],
                'next_action': ['states', (autoCb, results) => {
                    console.log('\tactionLoop saw findNextActionableState');
                    autoCb(null, this.findNextActionableState(results.states));
                }],
                'do_action': ['next_action', (autoCb, results) => {
                    if (results.next_action) {
                        console.log('\tactionLoop saw doNextAction');
                        return this.doNextAction(gameId, results.next_action, autoCb);
                    }

                    // No further actions to take
                    console.log('\tactionLoop saw endGame');
                    this.endGame(gameId, callback);
                }]
            }, callback);
        };

        public updatePlayerState = (gameId:string, player:string, callback?:(err:Error)=>any) => {
            if (!callback) {
                callback = (err:Error) => {
                    if (err) {
                        console.warn("Saw unprocessed error from handleCardPushed", err);
                    }
                }
            }

            console.log('updatePlayerState started', gameId, player);

            async.auto({
                'cards': [(autoCb, results) => {
                    this.api.game.getPlayerCards(gameId, player, autoCb);
                }],
                'score': ['cards', (autoCb, results) => {
                    autoCb(null, this.valueForCards(results.cards));
                }],
                'states': [(autoCb, results) => {
                    this.api.game.getPlayerStates(gameId, autoCb)
                }],
                'state': ['states', (autoCb, results) => {
                    console.log('\tupdatePlayerState state', results);
                    autoCb(null, _.find<{player:string; state:string}>(results.states, 'player', player).state);
                }],
                'process': ['cards', 'state', (autoCb, results) => {
                    console.log('\tupdatePlayerState process', results);

                    var state:string = null;
                    var end:boolean = false;

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
                        return this.endGame(gameId, autoCb);
                    }

                    if (state && state !== results.state) {
                        console.log('\tupdatePlayerState saw state change', {old: results.state, new: state});
                        return this.api.game.setPlayerState(gameId, player, state, autoCb);
                    }

                    // If no state changes hit, run the action loop again. If a state change _did_ hit, the listener
                    // will automatically detect it.
                    console.log('\tupdatePlayerState saw actionLoop');
                    this.actionLoop(gameId, autoCb);
                }]
            }, (err, results:any) => {
                callback(err);
            });
        };

        public endGame = (gameId:string, callback:(err:Error)=>any) => {
            console.log('endGame started', gameId);

            async.auto({
                'states': [(autoCb, results) => {
                    this.api.game.getPlayerStates(gameId, autoCb)
                }],
                'players': ['states', (autoCb, results) => {
                    autoCb(null, _.pluck(results.states, 'player'));
                }],
                'cards': ['players', (autoCb, results) => {
                    async.mapLimit(results.players, 3, (player:string, mapCb) => this.api.game.getPlayerCards(gameId, player, mapCb), autoCb);
                }],
                'scores': ['cards', (autoCb, results) => {
                    autoCb(null, _.map(results.cards, (cards:string[]) => this.valueForCards(cards)));
                }],
                'player_scores': ['scores', (autoCb, results) => {
                    autoCb(null, _.zipObject<{[player:string]:number}>(results.players, results.scores));
                }],
                'save_scores': ['player_scores', (autoCb, results) => {
                    this.api.result.pushResult(gameId, results.player_scores, autoCb);
                }],
                'winners': ['player_scores', (autoCb, results:any) => {
                    autoCb(null, this.getWinners(results.states, results.player_scores));
                }],
                'leaderboard': ['winners', (autoCb, results:any) => {
                    async.eachLimit(results.winners, 3, (winner:string, eachCb) => {
                        this.api.result.addPlayerWin(winner, eachCb);
                    }, autoCb);
                }],
                'winState': ['winners', (autoCb, results:any) => {
                    async.eachLimit(results.winners, 3, (winner:string, eachCb) => {
                        this.api.game.setPlayerState(gameId, winner, GameConstants.PLAYER_STATES.WIN, eachCb);
                    }, autoCb);
                }]
            }, (err, results:any) => {
                if (err) {
                    return callback(err);
                }
                console.log('endGame finished', gameId);
                callback(null);
            });
        };

        // Deal card but use a throttle to prevent all the cards from getting dealt too suddenly
        // TODO the first card dealt should be snappy; it's the follow up cards that should be delayed
        private static DEAL_DELAY:number = 1200;

        private dealTimer:NodeJS.Timer = null;

        private deal(func:Function) {
            if (this.dealTimer) {
                return;
            }

            this.dealTimer = setTimeout(() => {
                clearTimeout(this.dealTimer);
                this.dealTimer = null;

                func();
            }, GameServiceController.DEAL_DELAY);
        }

        public onActionReminder(callback:(reminder:{player:string; actions:string[]})=>any) {
            this.emitter.on(GameConstants.EVENTS.GAME.ACTION_REMINDER, callback);
        }
    }
}

export = GameServiceModule;
