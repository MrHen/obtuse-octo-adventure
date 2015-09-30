/// <reference path="../../typings/tsd.d.ts" />

/// <reference path="../api.d.ts" />

import _ = require('lodash');
import http = require('http');
import socket_io = require('socket.io');

import {EVENTS} from './GameConstants';

module Sockets {
    export class Sockets {
        private socketServer:SocketIO.Server = null;

        private connected:SocketIO.Socket[] = [];

        public constructor(server:http.Server) {
            this.socketServer = socket_io(server);

            this.socketServer.on("connection", this.onConnection);
        }

        private onConnection = (socket:SocketIO.Socket) => {
            this.connected.push(socket);

            var id = setInterval(() => {
                socket.emit(EVENTS.CLIENT.PING, JSON.stringify(new Date()), () => {})
            }, 1000);

            console.log("websocket connection open");

            socket.on("disconnect", () => {
                console.log("websocket connection close");
                this.connected = _.without(this.connected, socket);
                clearInterval(id)
            })
        };

        private emitAllClients = (event:string, message:string) => {
            _.forEach(this.connected, (client) => client.emit(event, message));
        };

        public emitGlobalChat = (message) => {
            console.log("emitting chat", {clients:this.connected.length});
            this.emitAllClients(EVENTS.CLIENT.GLOBAL_CHAT, message);
        };

        public emitActionReminder = (reminder:ApiResponses.GameCurrentTurnResponse) => {
            this.emitAllClients(EVENTS.CLIENT.ACTION_REMINDER, JSON.stringify(reminder));
        };

        public emitCardPushed = (cardDealt:ApiResponses.CardDealtResponse) => {
            // TODO not every user needs every update
            this.emitAllClients(EVENTS.CLIENT.CARD, JSON.stringify(cardDealt));
        };

        public emitPlayerStateChange = (playerState:ApiResponses.PlayerStateResponse) => {
            // TODO not every user needs every update
            this.emitAllClients(EVENTS.CLIENT.PLAYER_STATE, JSON.stringify(playerState));
        };
    }
}

export = Sockets;
