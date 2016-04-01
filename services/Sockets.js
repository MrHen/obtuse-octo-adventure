/// <reference path="../../typings/main.d.ts" />
"use strict";
/// <reference path="../api.d.ts" />
var _ = require('lodash');
var socket_io = require('socket.io');
var GameConstants_1 = require('./GameConstants');
var Sockets;
(function (Sockets_1) {
    var Sockets = (function () {
        function Sockets(server) {
            var _this = this;
            this.socketServer = null;
            this.connected = [];
            this.onConnection = function (socket) {
                _this.connected.push(socket);
                var id = setInterval(function () {
                    socket.emit(GameConstants_1.EVENTS.CLIENT.PING, JSON.stringify(new Date()), function () { });
                }, 1000);
                console.log("websocket connection open");
                socket.on("disconnect", function () {
                    console.log("websocket connection close");
                    _this.connected = _.without(_this.connected, socket);
                    clearInterval(id);
                });
            };
            this.emitAllClients = function (event, message) {
                _.forEach(_this.connected, function (client) { return client.emit(event, message); });
            };
            this.emitGlobalChat = function (message) {
                console.log("emitting chat", { clients: _this.connected.length });
                _this.emitAllClients(GameConstants_1.EVENTS.CLIENT.GLOBAL_CHAT, message);
            };
            this.emitActionReminder = function (reminder) {
                _this.emitAllClients(GameConstants_1.EVENTS.CLIENT.ACTION_REMINDER, JSON.stringify(reminder));
            };
            this.emitCardPushed = function (cardDealt) {
                // TODO not every user needs every update
                _this.emitAllClients(GameConstants_1.EVENTS.CLIENT.CARD, JSON.stringify(cardDealt));
            };
            this.emitPlayerStateChange = function (playerState) {
                // TODO not every user needs every update
                _this.emitAllClients(GameConstants_1.EVENTS.CLIENT.PLAYER_STATE, JSON.stringify(playerState));
            };
            this.socketServer = socket_io(server);
            this.socketServer.on("connection", this.onConnection);
        }
        return Sockets;
    }());
    Sockets_1.Sockets = Sockets;
})(Sockets || (Sockets = {}));
module.exports = Sockets;
