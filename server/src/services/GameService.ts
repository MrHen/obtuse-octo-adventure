/// <reference path="../../typings/tsd.d.ts" />

import _ = require('lodash');
import async = require('async');
import events = require('events');

import {DataStoreInterface} from '../datastore/DataStoreInterfaces';

module GameServiceModule {
    export interface RoomEventController {
        handleRoomStart(room_id, callback:(err:Error)=>any);
    }

    export class GameServiceController implements RoomEventController {
        private static ACTION_DELAY:number = 2000; // time between actions controlled by game (e.g., dealer)

        public static PLAYER_STATES = {
            BUST: 'bust',
            CURRENT: 'current',
            DEALING: 'deal',
            STAY: 'stay',
            WAITING: 'wait'
        };

        public static PLAYER_ACTIONS = {
            DEAL: 'deal', HIT: 'hit', STAY: 'stay'
        };

        public static DEALER = 'dealer';

        public static MAX = 21;

        public static DECK_COUNT = 1;
        public static CARD_SUITS = ['H', 'C'];//, 'D', 'S'];
        public static CARD_VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];
        private static _DECK:string[] = null;
        public static get DECK():string[] {
            if (!GameServiceController._DECK) {
                var cards:string[] = _.flatten(_.map<string, string[]>(GameServiceController.CARD_VALUES, (value) => {
                    return _.map(GameServiceController.CARD_SUITS, (suit) => value + suit);
                }));

                var all = _.clone(cards);
                for(var i = 1; i < GameServiceController.DECK_COUNT; i++) {
                    all.concat(_.clone(cards));
                }
                GameServiceController._DECK = all;
            }
            return GameServiceController._DECK;
        }

        private static EVENTS = {
            ACTION_REMINDER: 'action:reminder',
            ACTION_LOOP: 'action:start',
            PUSH_CARD: 'card'
        };

        private api:DataStoreInterface = null;

        private emitter:events.EventEmitter = new events.EventEmitter();

        private actionTimer;

        public constructor(api:DataStoreInterface) {
            this.api = api;

            this.onActionStart((room_id) => this.handleActionStart(room_id));
        }

        public handleShuffle(game:string, callback:(err:Error)=>any) {
            var newDeck = _.shuffle<string>(GameServiceController.DECK);
            this.api.game.setDeck(game, newDeck, callback);
        }

        public handleRoomStart(room_id, callback:(err:Error)=>any) {
            console.log('handleRoomStart started', room_id);

            async.auto({
                'addDealer': [(prepCb, results) => {
                    this.api.room.putPlayer(room_id, 'dealer', prepCb)
                }],
                'addPlayer': (prepCb, results) => {
                    this.api.room.putPlayer(room_id, 'player', prepCb)
                },
                'players': ['addDealer', 'addPlayer', (prepCb, results) => {
                    this.api.room.getPlayers(room_id, prepCb)
                }],
                'existing_game': (prepCb, results) => {
                    this.api.room.getGame(room_id, prepCb);
                },
                'new_game': ['existing_game', (prepCb, results) => {
                    if (results.existing_game) {
                        return prepCb(null, null);
                    }

                    this.api.game.postGame(prepCb);
                }],
                'assignGame': ['new_game', (prepCb, results) => {
                    if (!results.new_game) {
                        prepCb(null, null);
                    }

                    return this.api.room.setGame(room_id, results.new_game, prepCb);
                }],
                'shuffle': ['new_game', (prepCb, results) => {
                    if (!results.new_game) {
                        prepCb(null, null);
                    }

                    this.handleShuffle(results.new_game, prepCb);
                }],
                'player_states': ['players', 'new_game', (prepCb, results) => {
                    if (!results.new_game) {
                        return prepCb(null, null);
                    }

                    async.eachLimit(results.players, 3, (player:string, eachCb) => {
                        this.api.game.setPlayerState(results.new_game, player, 'deal', eachCb)
                    }, prepCb)
                }],
                'card_push_listeners': ['players', 'new_game', (prepCb, results) => {
                    _.forEach(results.players, (player:string) => {
                        this.api.game.onPushedCard(this.handleCardPushed);
                    });
                    prepCb(null, null);
                }],
                'action_start': ['player_states', 'new_game', 'existing_game', (prepCb, results) => {
                    this.emitter.emit(GameServiceController.EVENTS.ACTION_LOOP, results.new_game || results.existing_game);
                    prepCb(null, null);
                }]
            }, (err, results:any) => {
                callback(err);
            });
        }

        public handleActionStart(gameId, callback?:(err:Error)=>any) {
            if (!callback) {
                callback = (err:Error) => {
                    if (err) {
                        console.warn("Saw unprocessed error from handleActionStart", err);
                    }
                }
            }

            console.log('handleActionStart started', gameId);

            async.auto({
                'states': [ (autoCb, results) => {
                    this.api.game.getPlayerStates(gameId, autoCb)
                }],
                'next_action': ['states', (autoCb, results) => {
                    console.log('handleActionStart next_action for ' + gameId, results);
                    var dealing = _.find<{player:string; state:string}>(results.states, "state", GameServiceController.PLAYER_STATES.DEALING);
                    if (dealing) {
                        return this.handleDeal(gameId, dealing.player, autoCb);
                    }

                    var current = _.find<{player:string; state:string}>(results.states, "state", GameServiceController.PLAYER_STATES.CURRENT);
                    var action = {player: current, action: [GameServiceController.PLAYER_ACTIONS.HIT, GameServiceController.PLAYER_ACTIONS.STAY]};
                    this.emitter.emit(GameServiceController.EVENTS.ACTION_REMINDER, action);
                    autoCb(null, null);
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
                    autoCb(null, results.cards.length);
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
                    if (results.state === GameServiceController.PLAYER_STATES.DEALING && results.cards.length >= 2) {
                        console.log('handleCardPushed saw waiting');
                        return this.api.game.setPlayerState(gameId, player, GameServiceController.PLAYER_STATES.WAITING, autoCb);
                    }

                    if (results.state === GameServiceController.PLAYER_STATES.CURRENT && results.score > GameServiceController.MAX) {
                        console.log('handleCardPushed saw bust');
                        return this.api.game.setPlayerState(gameId, player, GameServiceController.PLAYER_STATES.BUST, autoCb);
                    }

                    autoCb(null, null)
                }],
                'event': ['process', (autoCb, results) => {
                    this.emitter.emit(GameServiceController.EVENTS.PUSH_CARD, gameId, player, card);
                    autoCb(null, null);
                }]
            }, (err, results:any) => {
                callback(err);
            });
        };

        public handleDeal(game_id:string, player:string, callback?:(err:Error)=>any) {
            if (!callback) {
                callback = (err:Error) => {
                    if (err) {
                        console.warn("Saw unprocessed error from handleDeal", err);
                    }
                }
            }

            async.auto({
                'deal': [(autoCb, results) => {
                    this.api.game.rpoplpush(game_id, player, autoCb);
                }],
                'loop': ['deal', (autoCb, results) => {
                    this.setActionTimer(() => {
                        this.emitter.emit(GameServiceController.EVENTS.ACTION_LOOP, game_id);
                    });
                    autoCb(null, null);
                }]
            }, (err, results:any) => {
                callback(err);
            });
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

        public onActionStart(callback:(room_id)=>any) {
            this.emitter.on(GameServiceController.EVENTS.ACTION_LOOP, callback);
        }

        public onPushedCard(callback:(gameId:string, player:string, card:string)=>any) {
            this.emitter.on(GameServiceController.EVENTS.PUSH_CARD, callback);
        }
    }
}

export = GameServiceModule;
