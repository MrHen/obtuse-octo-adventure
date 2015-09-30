/// <reference path="../../typings/tsd.d.ts" />

import _ = require('lodash');

import {RoomDataStoreInterface, ERRORS} from './DataStoreInterfaces';

interface Dict<T> {[index:string]:T}

class RoomMemory implements RoomDataStoreInterface {
    private static roomName:string = 'demo';

    private games:Dict<string> = {};

    private players:Dict<string[]> = {};

    deletePlayer(roomId:string, player:string, callback:(err:Error)=>any):any {
        if (this.players[roomId]) {
            this.players[roomId] = _.without(this.players[roomId], player);
        }
        callback(null);
    }

    getRooms(callback:(err:Error, rooms:string[])=>any):any {
        callback(null, [RoomMemory.roomName]);
    }

    getGame(roomId:string, callback:(err:Error, game:string)=>any):any {
        callback(null, this.games[roomId]);
    }

    getPlayers(roomId:string, callback:(err:Error, players:string[])=>any):any {
        callback(null, this.players[roomId] || []);
    }

    putPlayer(roomId:string, player:string, callback:(err:Error, player:string)=>any):any {
        if (!player) {
            return callback(new Error(ERRORS.ROOM.INVALID_PLAYER), null);
        }

        if (!this.players[roomId]) {
            this.players[roomId] = [];
        }
        if (!_.include(this.players[roomId], player)) {
            this.players[roomId].push(player);
        }
        callback(null, player);
    }

    setGame(roomId:string, game:string, callback:(err:Error)=>any):any {
        if (!game) {
            return callback(new Error(ERRORS.ROOM.INVALID_GAME));
        }

        this.games[roomId] = game;
        callback(null);
    }
}


export = RoomMemory;
