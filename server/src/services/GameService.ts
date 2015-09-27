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
        private static ACTION_DELAY:number = 5000; // time between actions controlled by game (e.g., dealer)

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

        private static EVENTS = {
            ACTION_REMINDER: 'action:reminder',
            ACTION_START: 'action:start'
        };

        private api:DataStoreInterface = null;

        private emitter:events.EventEmitter = new events.EventEmitter();

        private actionTimer;

        public constructor(api:DataStoreInterface) {
            this.api = api;

            this.onActionStart((room_id) => this.handleActionStart(room_id));
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
                        return prepCb(null, results.existing_game);
                    }

                    this.api.game.postGame(prepCb);
                }],
                'assignGame': ['existing_game', 'new_game', (prepCb, results) => {
                    if (results.existing_game === results.new_game) {
                        prepCb(null, null);
                    }

                    return this.api.room.setGame(room_id, results.new_game, prepCb);
                }],
                'player_states': ['players', 'existing_game', 'new_game', (prepCb, results) => {
                    if (results.existing_game === results.new_game) {
                        return prepCb(null, null);
                    }

                    async.eachLimit(results.players, 3, (player:string, eachCb) => {
                        this.api.game.setPlayerState(results.new_game, player, 'deal', eachCb)
                    }, prepCb)
                }],
                'action_start': ['player_states', (prepCb, results) => {
                    this.emitter.emit(GameServiceController.EVENTS.ACTION_START, results.new_game);
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

        public handleCardPushed(gameId:string, player:string, card:string, callback?:(err:Error)=>any) {
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
                }]
            }, (err, results:any) => {
                callback(err);
            });
        }

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
                    this.api.game.postPlayerCard(game_id, player, "XX", autoCb);
                }],
                'loop': ['deal', (autoCb, results) => {
                    this.setActionTimer(() => {
                        this.emitter.emit(GameServiceController.EVENTS.ACTION_START, game_id);
                    });
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
            this.emitter.on(GameServiceController.EVENTS.ACTION_START, callback);
        }
    }
}

export = GameServiceModule;
