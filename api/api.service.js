/// <reference path="../../typings/tsd.d.ts" />
var ApiService;
(function (ApiService) {
    var Api = (function () {
        function Api(Restangular) {
            this.Restangular = Restangular;
        }
        Api.prototype.init = function (baseUrl) {
            this.Restangular.setBaseUrl(baseUrl);
        };
        Api.prototype.getGame = function (game_id) {
            return this.Restangular.all('game').get(game_id);
        };
        Api.prototype.getGlobalChat = function () {
            return this.Restangular.all('chat').getList();
        };
        Api.prototype.postGlobalChat = function (message) {
            return this.Restangular.all('chat').post({ message: message });
        };
        Api.prototype.getRooms = function () {
            return this.Restangular.all('rooms').getList();
        };
        Api.$inject = ["Restangular"];
        return Api;
    })();
    ApiService.Api = Api;
    var app = angular
        .module("octo.api.service", ['restangular'])
        .service('Api', Api);
})(ApiService || (ApiService = {}));
