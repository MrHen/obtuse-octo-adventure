/// <reference path="../../typings/tsd.d.ts" />

import _ = require('lodash');

import {ResultDataStoreInterface, ERRORS} from './DataStoreInterfaces';

interface Dict<T> {[index:string]:T}

class ResultMemory implements ResultDataStoreInterface {
    // mimic how redis will store this info
    private results:string[] = [];

    private wins:Dict<number> = {};

    getResults(start:number, end:number, callback:(err:Error, results:{game:string; scores:{[player:string]:number}}[])=>any):any {
        console.log("getResults", start, end, this.results);
        var realEnd = end === -1 ? this.results.length : end + 1; // redis uses inclusive matching so adjust accordingly
        var payloads = this.results.slice(start, realEnd);
        console.log("payloads", payloads);
        callback(null, _.map(payloads, (payload) => JSON.parse(payload)));
    }

    pushResult(gameId:string, scores:{[player:string]:number}, callback:(err:Error)=>any):any {
        this.results.push(JSON.stringify({game:gameId, scores:scores}));
        callback(null);
    }
    addPlayerWin(player:string, callback:(err:Error, wins:number)=>any):any {
        this.wins[player] ? this.wins[player]++ : (this.wins[player] = 1);
        callback(null, this.wins[player]);
    }
    getPlayerWins(player:string, callback:(err:Error, wins:number)=>any):any {
        callback(null, this.wins[player]);
    }

    getMostWins(start:number, end:number, callback:(err:Error, results:{player:string; wins:number}[])=>any):any {
        var leaderboard = _.map(this.wins, (wins:number, player:string) => {
            return {player:player, wins: wins};
        });
        leaderboard = _.sortBy(leaderboard, 'wins').reverse();
        var realEnd = end === -1 ? leaderboard.length : end + 1; // redis uses inclusive matching so adjust accordingly
        callback(null, leaderboard.slice(start, realEnd));
    }
}

export = ResultMemory;
