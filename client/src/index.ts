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

        canEditPlayer: boolean;

        player: {
            name: string
        };

        room: ApiService.RoomResponse;
    }

    export class OctoController {
        public static $inject:string[] = ["$q", "$scope", "Api", "Config", "Sockets"];

        private static EVENT_GLOBALCHAT = 'globalchat:created';
        private static EVENT_TIME = 'time';

        private static MAX_PING_MESSAGES = 5;

        constructor(private $q:angular.IQService, private $scope:OctoScope, private Api:ApiService.Api, private Config:ConfigService.Config, private Sockets:SocketsService.Sockets) {
            if (!this.$scope.socketDebug) {
                this.$scope.socketDebug = [];
            }

            this.$scope.chatSubmit = this.chatSubmit.bind(this);

            if (!this.$scope.player) {
                this.$scope.player = {
                    name: "Player 1"
                };
            }

            this.$scope.canEditPlayer = false;

            this.Config.load()
                .then(() => this.initSockets())
                .then(() => this.initApi())
                .then(() => this.loadChat())
                .then(() => this.loadRoom());

            // TODO load global chat
        }

        private initApi():angular.IPromise<void> {
            var deferred = this.$q.defer<void>();

            this.Api.init(this.Config.data.api_base);
            deferred.resolve();

            return deferred.promise;
        }

        private initSockets():angular.IPromise<void> {
            this.Sockets.init(this.Config.data.websocket_host);

            this.Sockets.addEventListener(OctoController.EVENT_TIME, this.socketTimeEvent);

            this.Sockets.addEventListener(OctoController.EVENT_GLOBALCHAT, this.socketChatEvent);

            return this.$q.when();
        }

        private loadChat():angular.IPromise<void> {
            return this.Api.getGlobalChat().then((messages:string[]) => {
                this.$scope.globalChat = messages;
            });
        }

        private loadRoom():angular.IPromise<void> {
            return this.Api.getRooms().then((rooms:ApiService.RoomResponse[]) => {
                this.$scope.room = rooms && rooms.length ? rooms[0] : null;
            });
        }

        private chatSubmit(form:angular.IFormController) {
            var message = this.$scope.chatMessage;

            if (this.$scope.player.name) {
                message = this.$scope.player.name + ": " + message;
            }

            this.Api.postGlobalChat(message)
                .then((messages:string[]) => {
                    this.$scope.globalChat = messages;
                    return messages;
                });

            this.$scope.chatMessage = null;
        }

        private socketTimeEvent = (message:string) => {
            this.$scope.socketDebug.unshift(message);
            if (this.$scope.socketDebug.length > OctoController.MAX_PING_MESSAGES) {
                this.$scope.socketDebug.pop();
            }
            this.$scope.$apply();
        };

        // Don't try to figure out if this message was from us or them; just reload chat
        private socketChatEvent = (message:string) => {
            this.loadChat();
        }
    }

    var app = angular
        .module("octo", ['octo.api.service', 'octo.sockets.service', 'octo.config.service'])
        .controller("OctoController", OctoController);
}
