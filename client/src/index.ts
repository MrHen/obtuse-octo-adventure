/// <reference path="../typings/tsd.d.ts" />
/// <reference path="./api/api.service.ts" />
/// <reference path="./config/config.service.ts" />
/// <reference path="./sockets/sockets.service.ts" />

module OctoApp {
    export interface OctoScope extends angular.IScope {
        globalChat: string[];
        socketDebug: string[];

        chatMessage: string;
        chatSubmit: (form:angular.IFormController)=>any;
    }

    export class OctoController {
        public static $inject:string[] = ["$q", "$scope", "Api", "Config", "Sockets"];

        constructor(private $q:angular.IQService, private $scope:OctoScope, private Api:ApiService.Api, private Config:ConfigService.Config, private Sockets:SocketsService.Sockets) {
            if (!this.$scope.socketDebug) {
                this.$scope.socketDebug = [];
            }

            if (!this.$scope.globalChat) {
                this.$scope.globalChat = [];
            }

            this.$scope.chatSubmit = this.chatSubmit.bind(this);

            this.Config.load()
                .then(() => this.initSockets())
                .then(() => this.initApi());

            // TODO load global chat
        }

        private initApi():angular.IPromise<void> {
            var deferred = this.$q.defer<void>();

            this.Api.init(this.Config.data.api_base);
            deferred.resolve();

            return deferred.promise;
        }

        private initSockets():angular.IPromise<void> {
            var deferred = this.$q.defer<void>();

            this.Sockets.init(this.Config.data.websocket_host);
            this.Sockets.addEventListener('message', (event:any) => {
                this.$scope.socketDebug.unshift(event.data);
                if (this.$scope.socketDebug.length > 20) {
                    this.$scope.socketDebug.pop();
                }
                this.$scope.$apply();

                deferred.resolve();
            });

            return deferred.promise;
        }

        private chatSubmit(form:angular.IFormController) {
            this.Api.postGlobalChat(this.$scope.chatMessage).then((messages:string[]) => {
                this.$scope.globalChat = messages;
            });
        }
    }

    var app = angular
        .module("octo", ['octo.api.service', 'octo.sockets.service', 'octo.config.service'])
        .controller("OctoController", OctoController);
}
