/// <reference path="../../typings/main.d.ts" />
"use strict";
var _ = require('lodash');
var ResultMemory = (function () {
    function ResultMemory() {
        // mimic how redis will store this info
        this.results = [];
        this.wins = {};
    }
    ResultMemory.prototype.getResults = function (start, end, callback) {
        console.log("getResults", start, end, this.results);
        var realEnd = end === -1 ? this.results.length : end + 1; // redis uses inclusive matching so adjust accordingly
        var payloads = this.results.slice(start, realEnd);
        console.log("payloads", payloads);
        callback(null, _.map(payloads, function (payload) { return JSON.parse(payload); }));
    };
    ResultMemory.prototype.pushResult = function (gameId, scores, callback) {
        this.results.push(JSON.stringify({ game: gameId, scores: scores }));
        callback(null);
    };
    ResultMemory.prototype.addPlayerWin = function (player, callback) {
        this.wins[player] ? this.wins[player]++ : (this.wins[player] = 1);
        callback(null, this.wins[player]);
    };
    ResultMemory.prototype.getPlayerWins = function (player, callback) {
        callback(null, this.wins[player]);
    };
    ResultMemory.prototype.getMostWins = function (start, end, callback) {
        var leaderboard = _.map(this.wins, function (wins, player) {
            return { player: player, wins: wins };
        });
        leaderboard = _.sortBy(leaderboard, 'wins').reverse();
        var realEnd = end === -1 ? leaderboard.length : end + 1; // redis uses inclusive matching so adjust accordingly
        callback(null, leaderboard.slice(start, realEnd));
    };
    return ResultMemory;
}());
module.exports = ResultMemory;
