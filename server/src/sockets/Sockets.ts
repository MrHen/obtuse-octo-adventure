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

            socket.on("close", () => {
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
        }
    }
}

export = Sockets;
