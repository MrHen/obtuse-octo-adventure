/// <reference path="../../../typings/tsd.d.ts" />

/// <reference path="../../api/api.service.ts" />

module Game {
    var app = angular
        .module("octo.game", [])
        .directive('octoGame', () => new GameDirective())
        .controller("GameController", GameController);

    export class GameDirective implements ng.IDirective {
        public templateUrl: string;
        public restrict: string;
        public scope: any;
        public controller: any;
        public controllerAs: string;
        public bindToController: boolean;

        constructor () {
            this.templateUrl = 'components/game/game.html';
            this.restrict = 'E';
            this.scope = {
                game: "=",
                player: "=",
                onAction: '&'
            };
            this.controller = GameController;
            this.controllerAs = "vm";
            this.bindToController = true;
        }
    }

    export class GameController {
        public game: ApiService.GameResponse;

        public onAction: Function;

        action(action:string) {
            if(this.onAction) {
                this.onAction({action: action});
            }
        }
    }
}
