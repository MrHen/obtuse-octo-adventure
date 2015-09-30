/// <reference path="../../server/src/api.d.ts" />
/// <reference path="../typings/tsd.d.ts" />
/// <reference path="./api/api.service.ts" />
/// <reference path="./config/config.service.ts" />
/// <reference path="./sockets/sockets.service.ts" />
var OctoApp;
(function (OctoApp) {
    var OctoController = (function () {
        function OctoController($q, $scope, Api, Config, Sockets) {
            var _this = this;
            this.$q = $q;
            this.$scope = $scope;
            this.Api = Api;
            this.Config = Config;
            this.Sockets = Sockets;
            this.loadRoom = function () {
                return _this.Api.getRooms().then(function (rooms) {
                    console.log('loadRoom resolved', _.map(rooms, function (room) { return room.plain(); }));
                    _this.$scope.room = rooms && rooms.length ? rooms[0] : null;
                });
            };
            this.joinRoom = function () {
                if (!_this.$scope.room) {
                    return _this.$q.when();
                }
                return _this.Api.joinRoom(_this.$scope.room.room_id, _this.$scope.player_name).then(function (player) {
                    console.log('joinRoom resolved', player);
                });
            };
            this.newGame = function () {
                if (!_this.$scope.room) {
                    return _this.$q.when();
                }
                return _this.Api.newGame(_this.$scope.room.room_id).then(function (game) {
                    console.log('newGame resolved', game.plain());
                    _this.$scope.room.game_id = game.id;
                    _this.$scope.players = _.map(game.players, function (value, key) {
                        return {
                            name: key,
                            state: value.state,
                            cards: value.cards
                        };
                    });
                });
            };
            this.loadGame = function () {
                if (!_this.$scope.room || !_this.$scope.room.game_id) {
                    console.log('loadGame stopped');
                    return _this.$q.when();
                }
                return _this.Api.getGame(_this.$scope.room.game_id).then(function (game) {
                    console.log('loadGame resolved', game.plain());
                    _this.$scope.game = game;
                    if (game.ended) {
                        _this.loadLeaderboard();
                    }
                });
            };
            this.loadLeaderboard = function () {
                return _this.Api.getMostWins().then(function (leaderboard) {
                    console.log('loadLeaderboard resolved', _.map(leaderboard, function (leader) { return leader.plain(); }));
                    _this.$scope.leaderboard = leaderboard;
                });
            };
            this.doAction = function (action) {
                _this.Api.postAction(_this.$scope.room.game_id, _this.$scope.player_name, action);
            };
            this.socketActionReminderEvent = function (message) {
                _this.$scope.socketDebug.unshift(message);
                if (_this.$scope.socketDebug.length > OctoController.MAX_PING_MESSAGES) {
                    _this.$scope.socketDebug.pop();
                }
                _this.$scope.$apply();
            };
            this.socketCardEvent = function (message) {
                // TODO be smarter about loading
                _this.loadGame();
            };
            this.socketPlayerStateChangeEvent = function (message) {
                // TODO be smarter about loading
                _this.loadGame();
            };
            this.socketTimeEvent = function (message) {
                _this.$scope.socketDebug.unshift(message);
                if (_this.$scope.socketDebug.length > OctoController.MAX_PING_MESSAGES) {
                    _this.$scope.socketDebug.pop();
                }
                _this.$scope.$apply();
            };
            // Don't try to figure out if this message was from us or them; just reload chat
            this.socketChatEvent = function (message) {
                _this.loadChat();
            };
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
                .then(function () { return _this.initSockets(); })
                .then(function () { return _this.initApi(); })
                .then(function () { return _this.loadChat(); })
                .then(function () { return _this.loadRoom(); })
                .then(function () { return _this.joinRoom(); })
                .then(function () { return _this.loadGame(); })
                .then(function () { return _this.loadLeaderboard(); });
        }
        OctoController.prototype.initApi = function () {
            var deferred = this.$q.defer();
            this.Api.init(this.Config.data.api_base);
            deferred.resolve();
            return deferred.promise;
        };
        OctoController.prototype.initSockets = function () {
            this.Sockets.init(this.Config.data.websocket_host);
            this.Sockets.addEventListener(OctoController.EVENT_ACTIONREMINDER, this.socketActionReminderEvent);
            this.Sockets.addEventListener(OctoController.EVENT_CARD, this.socketCardEvent);
            this.Sockets.addEventListener(OctoController.EVENT_TIME, this.socketTimeEvent);
            this.Sockets.addEventListener(OctoController.EVENT_PLAYERSTATE, this.socketPlayerStateChangeEvent);
            this.Sockets.addEventListener(OctoController.EVENT_GLOBALCHAT, this.socketChatEvent);
            return this.$q.when();
        };
        OctoController.prototype.loadChat = function () {
            var _this = this;
            return this.Api.getGlobalChat().then(function (messages) {
                _this.$scope.globalChat = messages;
            });
        };
        OctoController.prototype.chatSubmit = function (message) {
            var _this = this;
            return this.Api.postGlobalChat(message).then(function (messages) {
                _this.$scope.globalChat = messages;
                return messages;
            });
        };
        OctoController.$inject = ["$q", "$scope", "Api", "Config", "Sockets"];
        OctoController.EVENT_ACTIONREMINDER = 'action';
        OctoController.EVENT_CARD = 'card';
        OctoController.EVENT_GLOBALCHAT = 'globalchat:created';
        OctoController.EVENT_TIME = 'time';
        OctoController.EVENT_PLAYERSTATE = 'state';
        OctoController.MAX_PING_MESSAGES = 5;
        return OctoController;
    })();
    OctoApp.OctoController = OctoController;
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
})(OctoApp || (OctoApp = {}));
