/// <reference path="../../../typings/browser.d.ts" />

/// <reference path="../../../../server/src/api.d.ts" />

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
                onAction: '&',
                onNewGame: '&'
            };
            this.controller = GameController;
            this.controllerAs = "vm";
            this.bindToController = true;
        }
    }

    export class GameController {
        public game: ApiResponses.GameResponse;

        public onAction: Function;
        public onNewGame: Function;

        public action(action:string) {
            if(this.onAction) {
                this.onAction({action: action});
            }
        }

        public newGame() {
            if (this.onNewGame) {
                this.onNewGame();
            }
        }
    }
}
