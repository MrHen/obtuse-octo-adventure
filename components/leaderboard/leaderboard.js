/// <reference path="../../../typings/tsd.d.ts" />
/// <reference path="../../api/api.service.ts" />
var Leaderboard;
(function (Leaderboard) {
    var app = angular
        .module("octo.leaderboard", [])
        .directive('octoLeaderboard', function () { return new LeaderboardDirective(); })
        .controller("LeaderboardController", LeaderboardController);
    var LeaderboardDirective = (function () {
        function LeaderboardDirective() {
            this.templateUrl = 'components/leaderboard/leaderboard.html';
            this.restrict = 'E';
            this.scope = {
                players: "="
            };
            this.controller = LeaderboardController;
            this.controllerAs = "vm";
            this.bindToController = true;
        }
        return LeaderboardDirective;
    })();
    Leaderboard.LeaderboardDirective = LeaderboardDirective;
    var LeaderboardController = (function () {
        function LeaderboardController() {
        }
        return LeaderboardController;
    })();
    Leaderboard.LeaderboardController = LeaderboardController;
})(Leaderboard || (Leaderboard = {}));
