/// <reference path="../../typings/main.d.ts" />
"use strict";
var RouteErrors_1 = require('./RouteErrors');
// Route definitions and route controller interfaces. As the application size grows it would eventually become necessary
// to split these into separate files. This could be streamlined a bit more using some fancy TypeScript but it isn't
// really necessary.
var Routes;
(function (Routes) {
    function initChat(base, app, controller) {
        app.get(base, function (req, res) {
            controller.getMessages(RouteErrors_1.sendErrorOrResult(res));
        });
        app.post(base, function (req, res) {
            var chatRequest = {
                message: req.body.message
            };
            controller.postMessage(chatRequest, RouteErrors_1.sendErrorOrResult(res));
        });
    }
    Routes.initChat = initChat;
    function initRoom(base, app, controller) {
        app.put(base + '/:room_id/players/:player_id', function (req, res) {
            var roomId = req.params.room_id;
            var playerId = req.params.player_id;
            controller.postPlayer(roomId, playerId, RouteErrors_1.sendErrorOrResult(res));
        });
        app.post(base + '/:room_id/game', function (req, res) {
            var roomId = req.params.room_id;
            controller.postGame(roomId, RouteErrors_1.sendErrorOrResult(res));
        });
        app.get(base + '/:room_id', function (req, res) {
            var roomId = req.params.room_id;
            controller.getRoom(roomId, RouteErrors_1.sendErrorOrResult(res));
        });
        app.get(base, function (req, res) {
            controller.getRooms(RouteErrors_1.sendErrorOrResult(res));
        });
    }
    Routes.initRoom = initRoom;
    function initResult(base, app, controller) {
        app.get(base, function (req, res) {
            var skip = 0;
            var limit = 20;
            if (req.query.skip) {
                skip = +req.query.skip;
            }
            if (req.query.limit) {
                limit = +req.query.limit;
            }
            console.log('get results', req.query);
            controller.getResults(skip, limit, RouteErrors_1.sendErrorOrResult(res));
        });
    }
    Routes.initResult = initResult;
    function initLeaderboard(base, app, controller) {
        app.get(base + '/players/:player', function (req, res) {
            var player = req.params.player;
            controller.getPlayer(player, RouteErrors_1.sendErrorOrResult(res));
        });
        app.get(base, function (req, res) {
            controller.getMostWins(0, 9, RouteErrors_1.sendErrorOrResult(res));
        });
    }
    Routes.initLeaderboard = initLeaderboard;
    Routes.initGame = function (base, app, controller) {
        app.get(base + '/:game_id/current', function (req, res) {
            var gameId = req.params.game_id;
            controller.getCurrentTurn(gameId, RouteErrors_1.sendErrorOrResult(res));
        });
        app.post(base + '/:game_id/action', function (req, res) {
            var gameId = req.params.game_id;
            var player = req.body.player;
            var action = req.body.action;
            controller.postAction(gameId, player, action, RouteErrors_1.sendErrorOrResult(res));
        });
        app.get(base + '/:game_id', function (req, res) {
            var gameId = req.params.game_id;
            controller.getGame(gameId, RouteErrors_1.sendErrorOrResult(res));
        });
    };
})(Routes || (Routes = {}));
module.exports = Routes;
