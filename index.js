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
            if (!this.$scope.globalChat) {
                this.$scope.globalChat = [];
            }
            this.$scope.chatSubmit = this.chatSubmit.bind(this);
            this.Config.load()
                .then(function () { return _this.initSockets(); })
                .then(function () { return _this.initApi(); })
                .then(function () { return _this.loadChat(); });
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
            this.Api.postGlobalChat(this.$scope.chatMessage).then(function (messages) {
                _this.$scope.globalChat = messages;
            });
        };
        OctoController.$inject = ["$q", "$scope", "Api", "Config", "Sockets"];
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
