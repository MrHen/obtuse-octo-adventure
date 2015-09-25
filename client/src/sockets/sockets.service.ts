/// <reference path="../../typings/tsd.d.ts" />

module SocketsService {
    export class Sockets {
        public host:string = "ws://murmuring-tundra-3318.herokuapp.com/";
        //public host:string = "ws://localhost:5000";

        private webSocket:WebSocket = null;

        constructor() {
            this.init();
        }

        init() {
            if (this.webSocket) {
                return;
            }

            this.webSocket = new WebSocket(this.host);
        }

        addEventListener(event:string, listener:(event:any)=>any) {
            this.webSocket.addEventListener(event, listener);
        }
    }

    var app = angular
        .module("octo.sockets.service", [])
        .service('Sockets', Sockets);
}
