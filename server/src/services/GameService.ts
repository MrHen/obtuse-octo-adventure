/// <reference path="../../typings/tsd.d.ts" />

import _ = require('lodash');
import async = require('async');
import events = require('events');

import GameConstants = require('./GameConstants');
import {DataStoreInterface} from '../datastore/DataStoreInterfaces';

module GameServiceModule {
    export interface RoomEventController {
        shuffle(game_id:string, callback:(err:Error)=>any);
        isGameEnded(states:{player:string; state:string}[]):boolean;
    }

    export interface GameServiceInterface {
        isGameEnded(states:{player:string; state:string}[]):boolean;
    }

    export class GameServiceController implements GameServiceInterface, RoomEventController {
        private static ACTION_DELAY:number = 2000; // time between actions controlled by game (e.g., dealer)

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

        private api:DataStoreInterface = null;

        private emitter:events.EventEmitter = new events.EventEmitter();

        private actionTimer;

        public constructor(api:DataStoreInterface) {
            this.api = api;
        }

        public shuffle(game:string, callback:(err:Error)=>any) {
            var newDeck = _.shuffle<string>(GameServiceController.DECK);
            this.api.game.setDeck(game, newDeck, callback);
        }

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
                    console.log('actionLoop next_action', gameId, results);
                    var dealing = _.find<{player:string; state:string}>(results.states, "state", GameConstants.PLAYER_STATES.DEALING);
                    if (dealing) {
                        console.log('actionLoop chose dealing', dealing);
                        return this.setActionTimer(() => {
                            return this.api.game.rpoplpush(gameId, dealing.player, autoCb);
                        });
                    }

                    var current = _.find<{player:string; state:string}>(results.states, "state", GameConstants.PLAYER_STATES.CURRENT);
                    if (current && current.player !== GameConstants.DEALER) {
                        console.log('actionLoop chose current', current);
                        var action = {player: current, action: [GameConstants.PLAYER_ACTIONS.HIT, GameConstants.PLAYER_ACTIONS.STAY]};
                        this.emitter.emit(GameConstants.EVENTS.GAME.ACTION_REMINDER, action);
                        this.setActionTimer(() => {
                            return this.actionLoop(gameId);
                        });
                        return autoCb(null, null);
                    }

                    var waiting = _.find<{player:string; state:string}>(results.states, (value) => {
                        return value.player !== GameConstants.DEALER && value.state === GameConstants.PLAYER_STATES.WAITING
                    });
                    if (waiting) {
                        console.log('actionLoop chose waiting', waiting);
                        return this.api.game.setPlayerState(gameId, waiting.player, GameConstants.PLAYER_STATES.CURRENT, autoCb);
                    }

                    var dealer = _.find<{player:string; state:string}>(results.states, "player", GameConstants.DEALER);
                    if (dealer && dealer.state === GameConstants.PLAYER_STATES.WAITING) {
                        console.log('actionLoop chose dealer');
                        return this.api.game.setPlayerState(gameId, dealer.player, GameConstants.PLAYER_STATES.CURRENT, autoCb);
                    }

                    if (dealer && dealer.state === GameConstants.PLAYER_STATES.CURRENT) {
                        console.log('actionLoop chose dealer (hit)');
                        return this.setActionTimer(() => {
                            return this.api.game.rpoplpush(gameId, dealer.player, autoCb);
                        });
                    }

                    this.endGame(gameId, autoCb);
                }]
            }, (err, results:any) => {
                callback(err);
            });
        };

        public handleStateChange = (playerState:ApiResponses.PlayerStateResponse, callback?:(err:Error)=>any) => {
            if (!callback) {
                callback = (err:Error) => {
                    if (err) {
                        console.warn("Saw unprocessed error from handleStateChange", err);
                    }
                }
            }

            // Ignore WIN state change since that only happens after the game has already ended
            if (playerState.state === GameConstants.PLAYER_STATES.WIN) {
                return callback(null);
            }

            return this.actionLoop(playerState.gameId, callback);
        };

        public handleCardPushed = (cardPush:ApiResponses.CardDealtResponse, callback?:(err:Error)=>any) => {
            if (!callback) {
                callback = (err:Error) => {
                    if (err) {
                        console.warn("Saw unprocessed error from handleCardPushed", err);
                    }
                }
            }

            console.log('handleCardPushed started', cardPush);

            async.auto({
                'cards': [(autoCb, results) => {
                    this.api.game.getPlayerCards(cardPush.gameId, cardPush.player, autoCb);
                }],
                'score': ['cards', (autoCb, results) => {
                    autoCb(null, GameConstants.valueForCards(results.cards));
                }],
                'states': [(autoCb, results) => {
                    this.api.game.getPlayerStates(cardPush.gameId, autoCb)
                }],
                'state': ['states', (autoCb, results) => {
                    console.log('handleCardPushed state', results);
                    autoCb(null, _.find<{player:string; state:string}>(results.states, 'player', cardPush.player).state);
                }],
                'process': ['cards', 'state', (autoCb, results) => {
                    console.log('handleCardPushed process', results);

                    var state:string = null;
                    var end:boolean = false;
                    if (results.cards.length < 2) {
                        console.log('handleCardPushed saw dealing');
                        state = GameConstants.PLAYER_STATES.DEALING;
                    }

                    if (!state && results.score > GameConstants.MAX) {
                        console.log('handleCardPushed saw bust');
                        state = GameConstants.PLAYER_STATES.BUST;
                    }

                    if (!state && cardPush.player === GameConstants.DEALER && results.score >= GameConstants.DEALER_STAY) {
                        console.log('handleCardPushed saw dealer stay');
                        end = results.score === GameConstants.MAX;
                        state = GameConstants.PLAYER_STATES.STAY;
                    }

                    if (!state && results.state === GameConstants.PLAYER_STATES.DEALING && results.cards.length >= 2) {
                        state = GameConstants.PLAYER_STATES.WAITING;
                    }

                    if (end) {
                        return this.endGame(cardPush.gameId, autoCb);
                    }

                    if (state && state !== results.state) {
                        return this.api.game.setPlayerState(cardPush.gameId, cardPush.player, state, autoCb);
                    }

                    this.actionLoop(cardPush.gameId, autoCb);
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
                    autoCb(null, _.map(results.cards, (cards:string[]) => GameConstants.valueForCards(cards)));
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

        public isGameEnded(states:{player:string; state:string}[]):boolean {
            var playing = _.pluck(states, 'state');
            if (_.include(playing, GameConstants.PLAYER_STATES.WIN)) {
                return true;
            }
            playing = _.without(playing, GameConstants.PLAYER_STATES.BUST, GameConstants.PLAYER_STATES.STAY, GameConstants.PLAYER_STATES.WIN);
            return _.isEmpty(playing);
        }

        public getWinners(states:{player:string; state:string}[], scores:{[player:string]:number}):string[] {
            var winners = _.pluck(_.reject(states, {'state': GameConstants.PLAYER_STATES.BUST}), 'player');

            var dealerBust = !_.includes(winners, GameConstants.DEALER);

            if (!dealerBust) {
                var dealerScore = scores[GameConstants.DEALER];
                winners = _.filter(winners, (player:string) => scores[player] > dealerScore);
            }

            if (!winners.length) {
                winners = [GameConstants.DEALER];
            }
            return winners;
        }

        public setActionTimer(func:Function) {
            if (this.actionTimer) {
                clearTimeout(this.actionTimer);
                this.actionTimer = null;
            }

            this.actionTimer = setTimeout(func, GameServiceController.ACTION_DELAY);
        }

        public onActionReminder(callback:(reminder:{player:string; actions:string[]})=>any) {
            this.emitter.on(GameConstants.EVENTS.GAME.ACTION_REMINDER, callback);
        }
    }
}

export = GameServiceModule;
