/// <reference path="../../typings/tsd.d.ts" />

import async = require('async');
import express = require('express');
import http_status = require('http-status');

import {RoomDataStoreInterface} from '../datastore/DataStoreInterfaces.ts';
import {RoomRouteInterface, RoomResponse} from './RouteInterfaces.ts';

module RoomRoute {
    export class RoomRouteController implements RoomRouteInterface {
        private static DEALER = 'dealer';
        private static PLAYER = 'player';

        private api:RoomDataStoreInterface = null;

        constructor(api:RoomDataStoreInterface) {
            this.api = api;
        }

        getRoom(roomId:string, callback:(err:Error, room:RoomResponse)=>any):any {
            async.auto({
                'game': (autoCb, results) => this.api.getGame(roomId, autoCb),
                'players': (autoCb, results) => this.api.getPlayers(roomId, autoCb)
            }, (err, results) => {
                if (err) {
                    callback(err, null);
                }

                var response:RoomResponse = {
                    room_id: roomId,
                    game_id: results.game,
                    players: results.players
                };

                callback(null, response);
            });
        }
        getRooms(callback:(err:Error, rooms:RoomResponse[])=>any):any {

            async.auto({
                'roomIds': (autoCb, results) => this.api.getRooms(autoCb),
                'rooms': ['roomIds', (autoCb, results) => {
                    async.mapLimit(results.roomIds, 10, (roomId:string, mapCb) => {
                        this.getRoom(roomId, mapCb)
                    }, autoCb);
                }]
            }, (err, results) => {
                if (err) {
                    callback(err, null);
                }

                callback(null, results.rooms);
            });
        }
        postPlayer(roomId:string, callback:(err:Error, player:string)=>any):any {
            this.api.getPlayers(roomId, (err, players:string[]) => {
                callback(err, _.first(players));
            });
        }
    }

    function sendErrorResponse(res:express.Response, err:Error) {
        var status:number = null;
        // TODO This is not entirely appropriate
        var message:string = err.message;
        switch(err.message) {
            default:
                status = http_status.INTERNAL_SERVER_ERROR;
        }
        return res.status(status).send({message:message});
    }

    export function init(app:express.Express, base:string, api:RoomDataStoreInterface) {
        var controller = new RoomRouteController(api);

        app.post(base + '/:room_id/players', function (req, res) {
            var roomId = req.params.room_id;

            controller.postPlayer(roomId, (err:Error, message:string) => {
                if (err) {
                    return sendErrorResponse(res, err);
                }

                res.send(message);
            });
        });

        app.get(base + '/:room_id', function (req, res) {
            var roomId = req.params.room_id;

            controller.getRoom(roomId, (err:Error, room:RoomResponse) => {
                if (err) {
                    return sendErrorResponse(res, err);
                }

                res.json(room);
            });
        });

        app.get(base, function (req, res) {
            controller.getRooms((err:Error, messages:RoomResponse[]) => {
                if (err) {
                    return sendErrorResponse(res, err);
                }

                res.send(messages);
            });
        });
    }
}

export = RoomRoute;
