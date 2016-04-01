/// <reference path="../../typings/main.d.ts" />
"use strict";
var LeaderboardRouteController = (function () {
    function LeaderboardRouteController(api) {
        this.api = null;
        this.api = api;
    }
    LeaderboardRouteController.prototype.getPlayer = function (player, callback) {
        this.api.getPlayerWins(player, function (err, wins) {
            if (err) {
                return callback(err, null);
            }
            callback(null, { player: player, wins: wins });
        });
    };
    LeaderboardRouteController.prototype.getMostWins = function (start, end, callback) {
        this.api.getMostWins(start, end, callback);
    };
    return LeaderboardRouteController;
}());
module.exports = LeaderboardRouteController;
