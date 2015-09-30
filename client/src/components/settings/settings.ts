/// <reference path="../../../typings/tsd.d.ts" />

module Settings {
    var app = angular
        .module("octo.settings", [])
        .directive('octoSettings', () => new SettingsDirective())
        .controller("SettingsController", SettingsController);

    export class SettingsDirective implements ng.IDirective {
        public templateUrl: string;
        public restrict: string;
        public scope: any;
        public controller: any;
        public controllerAs: string;
        public bindToController: boolean;

        constructor () {
            this.templateUrl = 'components/settings/settings.html';
            this.restrict = 'E';
            this.scope = {
                name: "="
            };
            this.controller = SettingsController;
            this.controllerAs = "vm";
            this.bindToController = true;
        }
    }

    export class SettingsController {
        public name: string;
        public canEditPlayer: boolean;

        constructor () {
            this.canEditPlayer = false;
        }
    }
}
