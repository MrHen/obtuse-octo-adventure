/// <reference path="../../typings/tsd.d.ts" />

import express = require('express');
import http_status = require('http-status');

import {ResultDataStoreInterface} from '../datastore/DataStoreInterfaces';
import {ResultRouteInterface, ResultResponse} from './RouteInterfaces';

module ResultRoute {
    export class ResultRouteController implements ResultRouteInterface {
        public static ERROR_INVALID_MESSAGE = 'Invalid Result message';

        private api:ResultDataStoreInterface = null;

        constructor(api:ResultDataStoreInterface) {
            this.api = api;
        }

        getResults(skip:number, limit:number, callback:(err:Error, result:ResultResponse[])=>any) {
            this.api.getResults(skip, skip + limit, callback);
        }
    }

    function sendErrorResponse(res:express.Response, err:Error) {
        var status:number = null;
        // TODO This is not entirely appropriate
        var message:string = err.message;
        switch(err.message) {
            case ResultRouteController.ERROR_INVALID_MESSAGE:
                status = http_status.BAD_REQUEST;
                break;
            default:
                status = http_status.INTERNAL_SERVER_ERROR;
        }
        return res.status(status).send({message:message});
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

            controller.getResults(skip, limit, (err:Error, results:ResultResponse[]) => {
                if (err) {
                    return sendErrorResponse(res, err);
                }

                res.json(results);
            });
        });
    }
}

export = ResultRoute;
