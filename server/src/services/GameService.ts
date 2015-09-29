/// <reference path="../../typings/tsd.d.ts" />

import _ = require('lodash');
import async = require('async');
import events = require('events');

import {DataStoreInterface} from '../datastore/DataStoreInterfaces';

module GameServiceModule {
    export interface RoomEventController {
        handleShuffle(game_id:string, callback:(err:Error)=>any);
    }

    export interface GameServiceInterface {
        isGameEnded(states:{player:string; state:string}[]):boolean;
    }

    export class GameServiceController implements GameServiceInterface, RoomEventController {
        private static ACTION_DELAY:number = 2000; // time between actions controlled by game (e.g., dealer)

        public static PLAYER_STATES = {
            BUST: 'bust',
            CURRENT: 'current',
            DEALING: 'deal',
            STAY: 'stay',
            WAITING: 'wait'
        };

        public static PLAYER_ACTIONS = {
            DEAL: 'deal',
            HIT: 'hit',
            STAY: 'stay'
        };

        public static DEALER = 'dealer';

        public static DEALER_STAY = 17;
        public static MAX = 21;

        public static DECK_COUNT = 1;
        public static CARD_SUITS = ['H', 'C']; //, 'D', 'S'];
        public static CARD_VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];
        private static _DECK:string[] = null;
        public static get DECK():string[] {
            if (!GameServiceController._DECK) {
                var cards:string[] = _.flatten(_.map<string, string[]>(GameServiceController.CARD_VALUES, (value) => {
                    return _.map(GameServiceController.CARD_SUITS, (suit) => value + suit);
                }));

                var all = _.clone(cards);
                for (var i = 1; i < GameServiceController.DECK_COUNT; i++) {
                    all.concat(_.clone(cards));
                }
                GameServiceController._DECK = all;
            }
            return GameServiceController._DECK;
        }

        private static EVENTS = {
            ACTION_REMINDER: 'action:reminder',
            GAME_END: 'game:end'
        };

        private api:DataStoreInterface = null;

        private emitter:events.EventEmitter = new events.EventEmitter();

        private actionTimer;

        public constructor(api:DataStoreInterface) {
            this.api = api;
        }

        public static valueForCards(cards:string[]):number {
            return _.sum(cards, (card) => {
                if (+card[0] > 0) {
                    return +card[0];
                }

                return card[0] === 'A' ? 11 : 10;
            })
        }

        public handleShuffle(game:string, callback:(err:Error)=>any) {
            var newDeck = _.shuffle<string>(GameServiceController.DECK);
            this.api.game.setDeck(game, newDeck, callback);
        }

        public handleActionStart(gameId:string, callback?:(err:Error)=>any) {
            if (!callback) {
                callback = (err:Error) => {
                    if (err) {
                        console.warn("Saw unprocessed error from handleActionStart", err);
                    }
                }
            }

            console.log('handleActionStart started', gameId);

            async.auto({
                'states': [(autoCb, results) => {
                    this.api.game.getPlayerStates(gameId, autoCb)
                }],
                'next_action': ['states', (autoCb, results) => {
                    console.log('handleActionStart next_action', gameId, results);
                    var dealing = _.find<{player:string; state:string}>(results.states, "state", GameServiceController.PLAYER_STATES.DEALING);
                    if (dealing) {
                        console.log('handleActionStart chose dealing', dealing);
                        return this.setActionTimer(() => {
                            return this.api.game.rpoplpush(gameId, dealing.player, autoCb);
                        });
                    }

                    var current = _.find<{player:string; state:string}>(results.states, "state", GameServiceController.PLAYER_STATES.CURRENT);
                    if (current && current.player !== GameServiceController.DEALER) {
                        console.log('handleActionStart chose current', current);
                        var action = {player: current, action: [GameServiceController.PLAYER_ACTIONS.HIT, GameServiceController.PLAYER_ACTIONS.STAY]};
                        this.emitter.emit(GameServiceController.EVENTS.ACTION_REMINDER, action);
                        return autoCb(null, null);
                    }

                    var waiting = _.find<{player:string; state:string}>(results.states, (value) => {
                        return value.player !== GameServiceController.DEALER && value.state === GameServiceController.PLAYER_STATES.WAITING
                    });
                    if (waiting) {
                        console.log('handleActionStart chose waiting', waiting);
                        return this.api.game.setPlayerState(gameId, waiting.player, GameServiceController.PLAYER_STATES.CURRENT, autoCb);
                    }

                    var dealer = _.find<{player:string; state:string}>(results.states, "player", GameServiceController.DEALER);
                    if (dealer && dealer.state === GameServiceController.PLAYER_STATES.WAITING) {
                        console.log('handleActionStart chose dealer');
                        return this.api.game.setPlayerState(gameId, dealer.player, GameServiceController.PLAYER_STATES.CURRENT, autoCb);
                    }

                    if (dealer && dealer.state === GameServiceController.PLAYER_STATES.CURRENT) {
                        console.log('handleActionStart chose dealer (hit)');
                        return this.setActionTimer(() => {
                            return this.api.game.rpoplpush(gameId, dealer.player, autoCb);
                        });
                    }

                    this.endGame(gameId, autoCb);
                }]
            }, (err, results:any) => {
                callback(err);
            });
        }

        public handleCardPushed = (gameId:string, player:string, card:string, callback?:(err:Error)=>any) => {
            if (!callback) {
                callback = (err:Error) => {
                    if (err) {
                        console.warn("Saw unprocessed error from handleCardPushed", err);
                    }
                }
            }

            console.log('handleCardPushed started', gameId, player, card);

            async.auto({
                'cards': [(autoCb, results) => {
                    this.api.game.getPlayerCards(gameId, player, autoCb);
                }],
                'score': ['cards', (autoCb, results) => {
                    autoCb(null, GameServiceController.valueForCards(results.cards));
                }],
                'states': [(autoCb, results) => {
                    this.api.game.getPlayerStates(gameId, autoCb)
                }],
                'state': ['states', (autoCb, results) => {
                    console.log('handleCardPushed state', results);
                    autoCb(null, _.find<{player:string; state:string}>(results.states, 'player', player).state);
                }],
                'process': ['cards', 'state', (autoCb, results) => {
                    console.log('handleCardPushed process', results);

                    var state = null;
                    if (results.cards.length < 2) {
                        console.log('handleCardPushed saw dealing');
                        state = GameServiceController.PLAYER_STATES.DEALING;
                    }

                    if (!state && results.score > GameServiceController.MAX) {
                        console.log('handleCardPushed saw bust');
                        state = GameServiceController.PLAYER_STATES.BUST;
                    }

                    if (!state && player === GameServiceController.DEALER && results.score >= GameServiceController.DEALER_STAY) {
                        console.log('handleCardPushed saw dealer stay');
                        state = GameServiceController.PLAYER_STATES.STAY;
                    }

                    if (!state && results.state === GameServiceController.PLAYER_STATES.DEALING && results.cards.length >= 2) {
                        state = GameServiceController.PLAYER_STATES.WAITING;
                    }

                    if (state && state !== results.state) {
                        return this.api.game.setPlayerState(gameId, player, state, autoCb);
                    }

                    this.handleActionStart(gameId, autoCb);
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
                    autoCb(null, _.map(results.cards, (cards:string[]) => GameServiceController.valueForCards(cards)));
                }],
                'player_scores': ['scores', (autoCb, results) => {
                    autoCb(null, _.zipObject<{[player:string]:number}>(results.players, results.scores));
                }],
                'save_scores': ['player_scores', (autoCb, results) => {
                    this.api.result.pushResult(gameId,results.player_scores, autoCb);
                }],
                'winners': ['player_scores', (autoCb, results:any) => {
                    var dealerScore = results.player_scores[GameServiceController.DEALER];

                    var winners = _.filter(results.players, (player:string) => results.player_scores[player] > dealerScore && results.player_scores[player] < GameServiceController.MAX);

                    if (!winners.length) {
                        winners = [GameServiceController.DEALER];
                    }

                    async.eachLimit(winners, 3, (winner:string, eachCb) => {
                        this.api.result.addPlayerWin(winner, eachCb);
                    }, autoCb);
                }]
            }, (err, results:any) => {
                if (err) {
                    return callback(err);
                }
                console.log('endGame finished', gameId);
                this.emitter.emit(GameServiceController.EVENTS.GAME_END, gameId);
                callback(null);
            });
        };

        public isGameEnded(states:{player:string; state:string}[]):boolean {
            var playing = _.pluck(states, 'state');
            playing = _.without(playing, 'bust', 'stay');
            return _.isEmpty(playing);
        }

        public setActionTimer(func:Function) {
            if (this.actionTimer) {
                clearTimeout(this.actionTimer);
                this.actionTimer = null;
            }

            this.actionTimer = setTimeout(func, GameServiceController.ACTION_DELAY);
        }

        public onActionReminder(callback:(reminder:{player:string; actions:string[]})=>any) {
            this.emitter.on(GameServiceController.EVENTS.ACTION_REMINDER, callback);
        }

        public onGameEnd(callback:(game:string)=>any) {
            this.emitter.on(GameServiceController.EVENTS.GAME_END, callback);
        }
    }
}

export = GameServiceModule;
