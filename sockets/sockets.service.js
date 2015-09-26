/// <reference path="../../typings/tsd.d.ts" />
var SocketsService;
(function (SocketsService) {
    var Sockets = (function () {
        function Sockets() {
            this.webSocket = null;
        }
        Sockets.prototype.init = function (host) {
            if (this.webSocket) {
                return;
            }
            this.webSocket = new WebSocket(host);
        };
        Sockets.prototype.addEventListener = function (event, listener) {
            this.webSocket.addEventListener(event, listener);
        };
        return Sockets;
    })();
    SocketsService.Sockets = Sockets;
    var app = angular
        .module("octo.sockets.service", [])
        .service('Sockets', Sockets);
})(SocketsService || (SocketsService = {}));
