/// <reference path="../../typings/tsd.d.ts" />

module SocketsService {
    export class Sockets {
        private webSocket:WebSocket = null;

        constructor() {
        }

        public init(host:string) {
            if (this.webSocket) {
                return;
            }

            this.webSocket = new WebSocket(host);
        }

        public addEventListener(event:string, listener:(event:any)=>any) {
            this.webSocket.addEventListener(event, listener);
        }
    }

    var app = angular
        .module("octo.sockets.service", [])
        .service('Sockets', Sockets);
}
