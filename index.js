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
            if (!this.$scope.socketDebug) {
                this.$scope.socketDebug = [];
            }
            if (!this.$scope.globalChat) {
                this.$scope.globalChat = [];
            }
            this.$scope.chatSubmit = this.chatSubmit.bind(this);
            this.Config.load()
                .then(function () { return _this.initSockets(); })
                .then(function () { return _this.initApi(); });
            // TODO load global chat
        }
        OctoController.prototype.initApi = function () {
            var deferred = this.$q.defer();
            this.Api.init(this.Config.data.api_base);
            deferred.resolve();
            return deferred.promise;
        };
        OctoController.prototype.initSockets = function () {
            var _this = this;
            var deferred = this.$q.defer();
            this.Sockets.init(this.Config.data.websocket_host);
            this.Sockets.addEventListener('message', function (event) {
                _this.$scope.socketDebug.unshift(event.data);
                if (_this.$scope.socketDebug.length > 20) {
                    _this.$scope.socketDebug.pop();
                }
                _this.$scope.$apply();
                deferred.resolve();
            });
            return deferred.promise;
        };
        OctoController.prototype.chatSubmit = function (form) {
            var _this = this;
            this.Api.postGlobalChat(this.$scope.chatMessage).then(function (messages) {
                _this.$scope.globalChat = messages;
            });
        };
        OctoController.$inject = ["$q", "$scope", "Api", "Config", "Sockets"];
        return OctoController;
    })();
    OctoApp.OctoController = OctoController;
    var app = angular
        .module("octo", ['octo.api.service', 'octo.sockets.service', 'octo.config.service'])
        .controller("OctoController", OctoController);
})(OctoApp || (OctoApp = {}));
