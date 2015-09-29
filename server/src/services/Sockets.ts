/// <reference path="../../typings/tsd.d.ts" />

import _ = require('lodash');
import http = require('http');
import socket_io = require('socket.io');

module Sockets {
    export interface SocketsConfigInterface {
    }

    export class Sockets {
        private static config_defaults:SocketsConfigInterface = {};

        private config:SocketsConfigInterface = {};

        private socketServer:SocketIO.Server = null;

        private connected:SocketIO.Socket[] = [];

        private static EVENT_GLOBALCHAT = 'globalchat:created';
        private static EVENT_TIME = 'time';
        private static EVENT_ACTIONREMINDER = 'action';
        private static EVENT_CARD = 'card';
        private static EVENT_PLAYERSTATE = 'state';
        private static EVENT_GAMEEND = 'gameend';

        public constructor(server:http.Server, options?:SocketsConfigInterface) {
            this.config = _.defaults(options || {}, Sockets.config_defaults);

            this.socketServer = socket_io(server);

            this.socketServer.on("connection", this.onConnection);
        }

        private onConnection = (socket:SocketIO.Socket) => {
            this.connected.push(socket);

            var id = setInterval(() => {
                socket.emit(Sockets.EVENT_TIME, JSON.stringify(new Date()), () => {

                })
            }, 1000);

            console.log("websocket connection open");

            socket.on("disconnect", () => {
                console.log("websocket connection close");
                this.connected = _.without(this.connected, socket);
                clearInterval(id)
            })
        };

        public emitGlobalChat = (message) => {
            console.log("emitting chat", {clients:this.connected.length});
            _.forEach(this.connected, (client) => {
                client.emit(Sockets.EVENT_GLOBALCHAT, message);
            })
        };

        public emitActionReminder = (reminder:{player:string; actions:string[]}) => {
            _.forEach(this.connected, (client) => {
                client.emit(Sockets.EVENT_ACTIONREMINDER, JSON.stringify(reminder));
            })
        };

        public emitCardPushed = (gameId:string, player:string, card:string) => {
            // TODO not every user needs every update
            _.forEach(this.connected, (client) => {
                client.emit(Sockets.EVENT_CARD, JSON.stringify({gameId: gameId, player:player, card:card}));
            })
        };

        public emitPlayerStateChange = (gameId:string, player:string, state:string) => {
            // TODO not every user needs every update
            _.forEach(this.connected, (client) => {
                client.emit(Sockets.EVENT_PLAYERSTATE, JSON.stringify({gameId: gameId, player:player, state:state}));
            })
        };

        public emitGameEnd = (gameId:string) => {
            _.forEach(this.connected, (client) => {
                client.emit(Sockets.EVENT_GAMEEND, gameId);
            })
        };
    }
}

export = Sockets;
