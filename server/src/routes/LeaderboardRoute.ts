/// <reference path="../../typings/tsd.d.ts" />

/// <reference path="../api.d.ts" />

import express = require('express');
import http_status = require('http-status');

import {ResultDataStoreInterface} from '../datastore/DataStoreInterfaces';
import {LeaderboardRouteControllerInterface} from './Routes';

import {sendErrorOrResult} from './RouteErrors';

module LeaderboardRoute {
    export class LeaderboardRouteController implements LeaderboardRouteControllerInterface {
        private api:ResultDataStoreInterface = null;

        constructor(api:ResultDataStoreInterface) {
            this.api = api;
        }

        getPlayer(player:string, callback:(err:Error, leaderboard:ApiResponses.LeaderboardResponse)=>any) {
            this.api.getPlayerWins(player, (err:Error, wins:number) => {
                if (err) {
                    return callback(err, null);
                }
                callback(null, {player: player, wins: wins});
            });
        }

        getMostWins(start:number, end:number, callback:(err:Error, leaderboard:ApiResponses.LeaderboardResponse[])=>any) {
            this.api.getMostWins(start, end, (err:Error, leaderboard:ApiResponses.LeaderboardResponse[]) => {
                if (err) {
                    return callback(err, null);
                }
                callback(null, leaderboard);
            });
        }
    }

    export function init(app:express.Express, base:string, api:ResultDataStoreInterface) {
        var controller = new LeaderboardRouteController(api);

        app.get(base + '/players/:player', function (req, res) {
            var player:string = req.params.player;

            controller.getPlayer(player, sendErrorOrResult(res));
        });

        app.get(base, function (req, res) {
            controller.getMostWins(0, 9, sendErrorOrResult(res));
        });
    }
}

export = LeaderboardRoute;
