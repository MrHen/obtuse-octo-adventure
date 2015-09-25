/// <reference path="../typings/tsd.d.ts" />
/// <reference path="./sockets/sockets.service.ts" />

module OctoApp {
    export interface OctoScope extends angular.IScope {
        socketDebug: string[];
    }

    export class OctoController {
        public scope: OctoScope;

        public static $inject:string[] = ["$scope", "Sockets"];

        constructor(private $scope:OctoScope, private Sockets:SocketsService.Sockets) {
            this.scope = $scope;
            if (!this.scope.socketDebug) {
                this.scope.socketDebug = [];
            }

            Sockets.addEventListener('message', (event:any) => {
                this.scope.socketDebug.push(event.data);
                this.scope.$apply();
            })
        }
    }

    var app = angular
        .module("octo", ['octo.sockets.service'])
        .controller("OctoController", OctoController);
}
