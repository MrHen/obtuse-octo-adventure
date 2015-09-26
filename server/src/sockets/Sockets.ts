/// <reference path="../../typings/tsd.d.ts" />

import _ = require('lodash');
import http = require('http');
import ws = require('ws');

module Sockets {
    export interface SocketsConfigInterface {
    }

    export class Sockets {
        private static config_defaults:SocketsConfigInterface = {};

        private config:SocketsConfigInterface = {};

        private socketServer:ws.Server = null;

        private clients:WebSocket[] = [];

        public constructor(server:http.Server, options?:SocketsConfigInterface) {
            this.config = _.defaults(options || {}, Sockets.config_defaults);

            this.socketServer = new ws.Server({server: server});

            this.socketServer.on("connection", this.onConnection);
        }

        private onConnection(client) {
            this.clients.push(client);

            var id = setInterval(() => {
                client.send(JSON.stringify(new Date()), () => {

                })
            }, 1000);

            console.log("websocket connection open");

            client.on("close", () => {
                console.log("websocket connection close");
                this.clients = _.without(this.clients, client);
                clearInterval(id)
            })
        }
    }
}

export = Sockets;
