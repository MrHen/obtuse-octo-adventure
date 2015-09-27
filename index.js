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
                    _this.$scope.room = rooms && rooms.length ? rooms[0] : null;
                });
            };
            this.loadGame = function () {
                return _this.Api.getGame(_this.$scope.room.game_id).then(function (game) {
                    console.log('loadGame resolved', game.plain());
                    _this.$scope.players = _.map(game.players, function (value, key) {
                        return {
                            name: key,
                            state: value.state,
                            cards: value.cards
                        };
                    });
                });
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
            this.Config.load()
                .then(function () { return _this.initSockets(); })
                .then(function () { return _this.initApi(); })
                .then(function () { return _this.loadChat(); })
                .then(function () { return _this.loadRoom(); })
                .then(function () { return _this.loadGame(); });
            // TODO load global chat
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
            this.Sockets.addEventListener(OctoController.EVENT_GLOBALCHAT, this.socketChatEvent);
            return this.$q.when();
        };
        OctoController.prototype.loadChat = function () {
            var _this = this;
            return this.Api.getGlobalChat().then(function (messages) {
                _this.$scope.globalChat = messages;
            });
        };
        OctoController.prototype.chatSubmit = function (form) {
            var _this = this;
            var message = this.$scope.chatMessage;
            if (this.$scope.player_name) {
                message = this.$scope.player_name + ": " + message;
            }
            this.Api.postGlobalChat(message)
                .then(function (messages) {
                _this.$scope.globalChat = messages;
                return messages;
            });
            this.$scope.chatMessage = null;
        };
        OctoController.$inject = ["$q", "$scope", "Api", "Config", "Sockets"];
        OctoController.EVENT_ACTIONREMINDER = 'action';
        OctoController.EVENT_CARD = 'card';
        OctoController.EVENT_GLOBALCHAT = 'globalchat:created';
        OctoController.EVENT_TIME = 'time';
        OctoController.MAX_PING_MESSAGES = 5;
        return OctoController;
    })();
    OctoApp.OctoController = OctoController;
    var app = angular
        .module("octo", ['octo.api.service', 'octo.sockets.service', 'octo.config.service'])
        .controller("OctoController", OctoController);
})(OctoApp || (OctoApp = {}));
