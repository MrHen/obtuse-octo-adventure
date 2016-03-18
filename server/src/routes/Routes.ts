/// <reference path="../../typings/main.d.ts" />

/// <reference path="../api.d.ts" />

import express = require('express');

import {sendErrorOrResult} from './RouteErrors';

// Route definitions and route controller interfaces. As the application size grows it would eventually become necessary
// to split these into separate files. This could be streamlined a bit more using some fancy TypeScript but it isn't
// really necessary.

module Routes {
    export interface ChatRouteControllerInterface {
        getMessages(callback:(err:Error, result:string[])=>any);
        postMessage(request:{message:string}, callback:(err:Error, result:string)=>any);
    }

    export function initChat(base:string, app:express.Express, controller:ChatRouteControllerInterface) {
        app.get(base, function (req, res) {
            controller.getMessages(sendErrorOrResult(res));
        });

        app.post(base, function (req, res) {
            var chatRequest = {
                message: req.body.message
            };

            controller.postMessage(chatRequest, sendErrorOrResult(res));
        });
    }

    export interface RoomRouteControllerInterface {
        getRoom(roomId:string, callback:(err:Error, room:ApiResponses.RoomResponse)=>any):any;
        getRooms(callback:(err:Error, rooms:ApiResponses.RoomResponse[])=>any):any;
        postPlayer(roomId:string, player:string, callback:(err:Error, player:string)=>any):any;
        postGame(roomId:string, callback:(err:Error, game:ApiResponses.GameResponse)=>any):any;
    }

    export function initRoom(base:string, app:express.Express, controller:RoomRouteControllerInterface) {
        app.put(base + '/:room_id/players/:player_id', function (req, res) {
            var roomId = req.params.room_id;
            var playerId = req.params.player_id;

            controller.postPlayer(roomId, playerId, sendErrorOrResult(res));
        });

        app.post(base + '/:room_id/game', function (req, res) {
            var roomId = req.params.room_id;

            controller.postGame(roomId, sendErrorOrResult(res));
        });

        app.get(base + '/:room_id', function (req, res) {
            var roomId = req.params.room_id;

            controller.getRoom(roomId, sendErrorOrResult(res));
        });

        app.get(base, function (req, res) {
            controller.getRooms(sendErrorOrResult(res));
        });
    }

    export interface ResultRouteControllerInterface {
        getResults(skip:number, limit:number, callback:(err:Error, results:ApiResponses.ResultResponse[])=>any):any;
    }

    export function initResult(base:string, app:express.Express, controller:ResultRouteControllerInterface) {
        app.get(base, function (req, res) {
            var skip:number = 0;
            var limit:number = 20;
            if (req.query.skip) {
                skip = +req.query.skip;
            }
            if (req.query.limit) {
                limit = +req.query.limit;
            }

            console.log('get results', req.query);

            controller.getResults(skip, limit, sendErrorOrResult(res));
        });
    }

    export interface LeaderboardRouteControllerInterface {
        getPlayer(player:string, callback:(err:Error, results:ApiResponses.LeaderboardResponse)=>any):any;
        getMostWins(start:number, end:number, callback:(err:Error, results:ApiResponses.LeaderboardResponse[])=>any):any;
    }

    export function initLeaderboard(base:string, app:express.Express, controller:LeaderboardRouteControllerInterface) {
        app.get(base + '/players/:player', function (req, res) {
            var player:string = req.params.player;

            controller.getPlayer(player, sendErrorOrResult(res));
        });

        app.get(base, function (req, res) {
            controller.getMostWins(0, 9, sendErrorOrResult(res));
        });
    }

    export interface GameRouteControllerInterface {
        getGame(gameId:string, callback:(err:Error, game:ApiResponses.GameResponse)=>any):any;
        getCurrentTurn(gameId:string, callback:(err:Error, currentTurn:ApiResponses.GameCurrentTurnResponse)=>any):any;
        postAction(gameId:string, player:string, action:string, callback:(err:Error)=>any):any;
    }

    export var initGame = (base:string, app:express.Express, controller:GameRouteControllerInterface) => {
        app.get(base + '/:game_id/current', (req, res) => {
            var gameId = req.params.game_id;

            controller.getCurrentTurn(gameId, sendErrorOrResult(res));
        });

        app.post(base + '/:game_id/action', (req, res) => {
            var gameId = req.params.game_id;
            var player = req.body.player;
            var action = req.body.action;

            controller.postAction(gameId, player, action, sendErrorOrResult(res));
        });

        app.get(base + '/:game_id', (req, res) => {
            var gameId = req.params.game_id;

            controller.getGame(gameId, sendErrorOrResult(res));
        });
    }
}

export = Routes;
