/// <reference path="../typings/tsd.d.ts" />
/// <reference path="./config/config.service.ts" />
/// <reference path="./sockets/sockets.service.ts" />

module OctoApp {
    export interface OctoScope extends angular.IScope {
        socketDebug: string[];
    }

    export class OctoController {
        public static $inject:string[] = ["$scope", "Config", "Sockets"];

        constructor(private $scope:OctoScope, private Config:ConfigService.Config, private Sockets:SocketsService.Sockets) {
            if (!this.$scope.socketDebug) {
                this.$scope.socketDebug = [];
            }

            Config.load().then(() => {

                Sockets.init(Config.data.websocket_host);
                Sockets.addEventListener('message', (event:any) => {
                    this.$scope.socketDebug.unshift(event.data);
                    if (this.$scope.socketDebug.length > 20) {
                        this.$scope.socketDebug.pop();
                    }
                    this.$scope.$apply();
                })
            });
        }
    }

    var app = angular
        .module("octo", ['octo.sockets.service', 'octo.config.service'])
        .controller("OctoController", OctoController);
}
