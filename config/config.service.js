/// <reference path="../../typings/tsd.d.ts" />
var ConfigService;
(function (ConfigService) {
    var Config = (function () {
        function Config($http, $q) {
            this.$http = $http;
            this.$q = $q;
            this.location = 'config/default.json';
            this._data = {};
            this.promise = null;
            this.load();
        }
        Config.prototype.load = function () {
            var _this = this;
            if (!this.promise) {
                this.promise = this.$http.get(this.location).then(function (response) {
                    return _this._data = response.data;
                });
            }
            return this.promise;
        };
        Object.defineProperty(Config.prototype, "data", {
            get: function () {
                if (!this._data || this._data === {}) {
                    console.warn("Accessed config data before it was loaded");
                }
                return this._data;
            },
            enumerable: true,
            configurable: true
        });
        Config.$inject = ["$http", "$q"];
        return Config;
    })();
    ConfigService.Config = Config;
    var app = angular
        .module("octo.config.service", [])
        .service('Config', Config);
})(ConfigService || (ConfigService = {}));
