/// <reference path="../typings/tsd.d.ts" />

module OctoApp {
    export interface OctoScope {
        foo: string;
    }

    export class OctoController {
        public scope: OctoScope;

        public static $inject:string[] = ["$scope"];

        constructor(private $scope:OctoScope) {
            this.scope = $scope;
        }
    }

    var app = angular
        .module("octo", [])
        .controller("OctoController", OctoController);
}
