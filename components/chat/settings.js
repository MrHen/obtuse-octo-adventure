/// <reference path="../../../typings/tsd.d.ts" />
var Settings;
(function (Settings) {
    var app = angular
        .module("octo.settings", [])
        .directive('octoSettings', function () { return new SettingsDirective(); })
        .controller("SettingsController", SettingsController);
    var SettingsDirective = (function () {
        function SettingsDirective() {
            this.templateUrl = 'components/settings/settings.html';
            this.restrict = 'E';
            this.scope = {
                name: "="
            };
            this.controller = SettingsController;
            this.controllerAs = "vm";
            this.bindToController = true;
        }
        return SettingsDirective;
    })();
    Settings.SettingsDirective = SettingsDirective;
    var SettingsController = (function () {
        function SettingsController() {
            this.canEditPlayer = false;
        }
        return SettingsController;
    })();
    Settings.SettingsController = SettingsController;
})(Settings || (Settings = {}));
