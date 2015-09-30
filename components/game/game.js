/// <reference path="../../../typings/tsd.d.ts" />
/// <reference path="../../api/api.service.ts" />
var Game;
(function (Game) {
    var app = angular
        .module("octo.game", [])
        .directive('octoGame', function () { return new GameDirective(); })
        .controller("GameController", GameController);
    var GameDirective = (function () {
        function GameDirective() {
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
        return GameDirective;
    })();
    Game.GameDirective = GameDirective;
    var GameController = (function () {
        function GameController() {
        }
        GameController.prototype.action = function (action) {
            if (this.onAction) {
                this.onAction({ action: action });
            }
        };
        GameController.prototype.newGame = function () {
            if (this.onNewGame) {
                this.onNewGame();
            }
        };
        return GameController;
    })();
    Game.GameController = GameController;
})(Game || (Game = {}));
