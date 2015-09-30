/// <reference path="../../typings/tsd.d.ts" />

/// <reference path="../api.d.ts" />

import express = require('express');
import http_status = require('http-status');

import {ResultDataStoreInterface} from '../datastore/DataStoreInterfaces';
import {ResultRouteInterface} from './RouteInterfaces';

import {sendErrorOrResult} from './RouteErrors';

module ResultRoute {
    export class ResultRouteController implements ResultRouteInterface {
        private api:ResultDataStoreInterface = null;

        constructor(api:ResultDataStoreInterface) {
            this.api = api;
        }

        getResults(skip:number, limit:number, callback:(err:Error, result:ApiResponses.ResultResponse[])=>any) {
            this.api.getResults(skip, skip + limit, callback);
        }
    }

    export function init(app:express.Express, base:string, api:ResultDataStoreInterface) {
        var controller = new ResultRouteController(api);

        app.get(base, function (req, res) {
            var skip:number = 0;
            var limit:number = 20;
            if (req.query.skip) {
                skip = +req.query.skip;
            }
            if (req.query.limit) {
                limit = +req.query.limit;
            }

            console.log('get results', req.query);

            controller.getResults(skip, limit, sendErrorOrResult(res));
        });
    }
}

export = ResultRoute;
