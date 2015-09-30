/// <reference path="../typings/tsd.d.ts" />
/// <reference path="./api/api.service.ts" />
/// <reference path="./config/config.service.ts" />
/// <reference path="./sockets/sockets.service.ts" />

module OctoApp {
    export interface PlayerListItem {
        name: string;
        state: string;
        cards: string[];
    }

    export interface OctoScope extends angular.IScope {
        globalChat: string[];
        socketDebug: string[];

        chatMessage: string;
        chatSubmit: (form:angular.IFormController)=>any;

        canEditPlayer: boolean;

        player_name: string;

        room: ApiService.RoomResponse;

        players: PlayerListItem[];
        game: ApiService.GameResponse;

        leaderboard: ApiService.LeaderboardResponse[];

        newGame: Function;
        loadGame: Function;
        loadRoom: Function;

        doAction: Function;
    }

    export class OctoController {
        public static $inject:string[] = ["$q", "$scope", "Api", "Config", "Sockets"];

        private static EVENT_ACTIONREMINDER = 'action';
        private static EVENT_CARD = 'card';
        private static EVENT_GLOBALCHAT = 'globalchat:created';
        private static EVENT_TIME = 'time';
        private static EVENT_PLAYERSTATE = 'state';

        private static MAX_PING_MESSAGES = 5;

        constructor(private $q:angular.IQService, private $scope:OctoScope, private Api:ApiService.Api, private Config:ConfigService.Config, private Sockets:SocketsService.Sockets) {
            if (!this.$scope.socketDebug) {
                this.$scope.socketDebug = [];
            }

            this.$scope.chatSubmit = this.chatSubmit.bind(this);

            if (!this.$scope.player_name) {
                this.$scope.player_name = 'player';
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

            this.Sockets.addEventListener(OctoController.EVENT_ACTIONREMINDER, this.socketActionReminderEvent);
            this.Sockets.addEventListener(OctoController.EVENT_CARD, this.socketCardEvent);
            this.Sockets.addEventListener(OctoController.EVENT_TIME, this.socketTimeEvent);
            this.Sockets.addEventListener(OctoController.EVENT_PLAYERSTATE, this.socketPlayerStateChangeEvent);
            this.Sockets.addEventListener(OctoController.EVENT_GLOBALCHAT, this.socketChatEvent);

            return this.$q.when();
        }

        private loadChat():angular.IPromise<void> {
            return this.Api.getGlobalChat().then((messages:string[]) => {
                this.$scope.globalChat = messages;
            });
        }

        private loadRoom = ():angular.IPromise<void> => {
            return this.Api.getRooms().then((rooms:ApiService.RoomResponse[]) => {
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

            return this.Api.newGame(this.$scope.room.room_id).then((game:ApiService.GameResponse) => {
                console.log('newGame resolved', (<any>game).plain());
                this.$scope.room.game_id = game.id;
                this.$scope.players = _.map(game.players, (value, key) => {
                    return {
                        name: key,
                        state: value.state,
                        cards: value.cards
                    }
                })
            });
        };

        private loadGame = ():angular.IPromise<void> => {
            if (!this.$scope.room || !this.$scope.room.game_id) {
                console.log('loadGame stopped');
                return this.$q.when();
            }

            return this.Api.getGame(this.$scope.room.game_id).then((game:ApiService.GameResponse) => {
                console.log('loadGame resolved', (<any>game).plain());
                this.$scope.game = game;
            });
        };

        private loadLeaderboard = ():angular.IPromise<void> => {
            return this.Api.getMostWins().then((leaderboard:ApiService.LeaderboardResponse[]) => {
                console.log('loadLeaderboard resolved', _.map(leaderboard, (leader) => (<any>leader).plain()));
                this.$scope.leaderboard = leaderboard;
            });
        };

        private chatSubmit(message:string):angular.IPromise<string[]> {
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
            if (this.$scope.socketDebug.length > OctoController.MAX_PING_MESSAGES) {
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
