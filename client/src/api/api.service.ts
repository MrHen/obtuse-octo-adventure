/// <reference path="../../typings/tsd.d.ts" />

module ApiService {
    export class Api {
        public static $inject:string[] = ["Restangular"];

        constructor(private Restangular:restangular.IService) {
        }

        init(baseUrl:string) {
            this.Restangular.setBaseUrl(baseUrl);
        }

        postGlobalChat(message:string):angular.IPromise<string[]> {
            return this.Restangular.all('chat').post({message:message});
        }
    }

    var app = angular
        .module("octo.api.service", ['restangular'])
        .service('Api', Api);
}
