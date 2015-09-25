/// <reference path="../../typings/tsd.d.ts" />

module ConfigService {
    export interface ConfigInterface {
        websocket_host?: string;
    }

    export class Config {
        private location = 'config/default.json';

        private _data:ConfigInterface = {};

        private promise:angular.IPromise<ConfigInterface> = null;

        public static $inject:string[] = ["$http", "$q"];

        constructor(private $http:angular.IHttpService, private $q:angular.IQService) {
            this.load();
        }

        public load():angular.IPromise<ConfigInterface> {
            if (!this.promise) {
                this.promise = this.$http.get(this.location).then((response) => {
                    return this._data = response.data;
                });
            }

            return this.promise;
        }

        get data() {
            if (!this._data || this._data === {}) {
                console.warn("Accessed config data before it was loaded");
            }
            return this._data;
        }
    }

    var app = angular
        .module("octo.config.service", [])
        .service('Config', Config);
}
