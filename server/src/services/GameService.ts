/// <reference path="../../typings/tsd.d.ts" />

import async = require('async');

import {DataStoreInterface} from '../datastore/DataStoreInterfaces';

module GameServiceModule {
    export interface RoomEventController {
        onRoomStart(room_id, callback:(err:Error)=>any);
    }

    export class GameServiceController implements RoomEventController {
        private api:DataStoreInterface = null;

        public constructor(api:DataStoreInterface) {
            this.api = api;
        }

        public onRoomStart(room_id, callback:(err:Error)=>any) {
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
                    if (results.existing_game !== results.new_game) {
                        return this.api.room.setGame(room_id, results.new_game, prepCb);
                    }

                    prepCb(null, null);
                }],
                'player_states': ['players', 'new_game', (prepCb, results) => {
                    async.eachLimit(results.players, 3, (player:string, eachCb) => {
                        var state = player === 'dealer' ? 'deal' : 'wait';
                        this.api.game.setPlayerState(results.new_game, player, state, eachCb)
                    }, prepCb)
                }]
            }, (err, results:any) => {
                callback(err);
            });
        }
    }
}

export = GameServiceModule;
