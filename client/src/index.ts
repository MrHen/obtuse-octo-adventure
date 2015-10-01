/// <reference path="../../server/src/api.d.ts" />

/// <reference path="../typings/tsd.d.ts" />

/// <reference path="./GameConstants.ts" />
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

        player_name: string;

        room: ApiResponses.RoomResponse;

        game: ApiResponses.GameResponse;

        leaderboard: ApiResponses.LeaderboardResponse[];

        newGame: Function;
        loadGame: Function;
        loadRoom: Function;

        doAction: Function;
    }

    export class OctoController {
        public static $inject:string[] = ["$q", "$scope", "Api", "Config", "Sockets"];

        constructor(private $q:angular.IQService, private $scope:OctoScope, private Api:ApiService.Api, private Config:ConfigService.Config, private Sockets:SocketsService.Sockets) {
            if (!this.$scope.socketDebug) {
                this.$scope.socketDebug = [];
            }

            this.$scope.chatSubmit = this.chatSubmit.bind(this);

            if (!this.$scope.player_name) {
                this.$scope.player_name = GameConstants.DEFAULT_PLAYER;
            }

            this.$scope.canEditPlayer = false;

            this.$scope.loadRoom = this.loadRoom;
            this.$scope.loadGame = this.loadGame;
            this.$scope.newGame = this.newGame;

            this.$scope.doAction = this.doAction;

            // TODO split up this chain
            this.Config.load()
                .then(() => this.initSockets())
                .then(() => this.initApi())
                .then(() => this.loadChat())
                .then(() => this.loadRoom())
                .then(() => this.joinRoom())
                .then(() => this.loadGame())
                .then(() => this.loadLeaderboard());
        }

        private initApi():angular.IPromise<void> {
            var deferred = this.$q.defer<void>();

            this.Api.init(this.Config.data.api_base);
            deferred.resolve();

            return deferred.promise;
        }

        private initSockets():angular.IPromise<void> {
            this.Sockets.init(this.Config.data.websocket_host);

            this.Sockets.addEventListener(GameConstants.EVENTS.ACTIONREMINDER, this.socketActionReminderEvent);
            this.Sockets.addEventListener(GameConstants.EVENTS.CARD, this.socketCardEvent);
            this.Sockets.addEventListener(GameConstants.EVENTS.TIME, this.socketTimeEvent);
            this.Sockets.addEventListener(GameConstants.EVENTS.PLAYERSTATE, this.socketPlayerStateChangeEvent);
            this.Sockets.addEventListener(GameConstants.EVENTS.GLOBALCHAT, this.socketChatEvent);

            return this.$q.when();
        }

        private loadChat():angular.IPromise<void> {
            return this.Api.getGlobalChat().then((messages:string[]) => {
                this.$scope.globalChat = messages;
            });
        }

        private loadRoom = ():angular.IPromise<void> => {
            return this.Api.getRooms().then((rooms:ApiResponses.RoomResponse[]) => {
                console.log('loadRoom resolved', _.map(rooms, (room) => (<any>room).plain()));
                this.$scope.room = rooms && rooms.length ? rooms[0] : null;
            });
        };

        private joinRoom = ():angular.IPromise<void> => {
            if (!this.$scope.room) {
                return this.$q.when();
            }

            return this.Api.joinRoom(this.$scope.room.room_id, this.$scope.player_name).then((player:string) => {
                console.log('joinRoom resolved', player);
            });
        };

        private newGame = ():angular.IPromise<void> => {
            if (!this.$scope.room) {
                return this.$q.when();
            }

            return this.Api.newGame(this.$scope.room.room_id).then((game:ApiResponses.GameResponse) => {
                console.log('newGame resolved', (<any>game).plain());
                this.$scope.room.game_id = game.id;
                this.$scope.game = game;
            });
        };

        private loadGame = ():angular.IPromise<void> => {
            if (!this.$scope.room || !this.$scope.room.game_id) {
                console.log('loadGame stopped');
                return this.$q.when();
            }

            return this.Api.getGame(this.$scope.room.game_id).then((game:ApiResponses.GameResponse) => {
                console.log('loadGame resolved', (<any>game).plain());
                this.$scope.game = game;

                if (game.ended) {
                    this.loadLeaderboard();
                }
            });
        };

        private loadLeaderboard = ():angular.IPromise<void> => {
            return this.Api.getMostWins().then((leaderboard:ApiResponses.LeaderboardResponse[]) => {
                console.log('loadLeaderboard resolved', _.map(leaderboard, (leader) => (<any>leader).plain()));
                this.$scope.leaderboard = leaderboard;
            });
        };

        private chatSubmit(message:string):angular.IPromise<ApiResponses.ChatResponse[]> {
            return this.Api.postGlobalChat(message).then((messages:string[]) => {
                    this.$scope.globalChat = messages;
                    return messages;
                });
        }

        public doAction = (action:string) => {
            this.Api.postAction(this.$scope.room.game_id, this.$scope.player_name, action);
        };

        private socketActionReminderEvent = (message:string) => {
            this.$scope.socketDebug.unshift(message);
            if (this.$scope.socketDebug.length > this.Config.data.max_socket_debug) {
                this.$scope.socketDebug.pop();
            }
            this.$scope.$apply();
        };

        private socketCardEvent = (message:string) => {
            // TODO be smarter about loading
            this.loadGame();
        };

        private socketPlayerStateChangeEvent = (message:string) => {
            // TODO be smarter about loading
            this.loadGame();
        };

        private socketTimeEvent = (message:string) => {
            this.$scope.socketDebug.unshift(message);
            if (this.$scope.socketDebug.length > this.Config.data.max_socket_debug) {
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
        .module("octo", [
            'octo.api.service',
            'octo.sockets.service',
            'octo.config.service',

            'octo.settings',
            'octo.chat',
            'octo.game',
            'octo.leaderboard'
        ])
        .controller("OctoController", OctoController);
}
