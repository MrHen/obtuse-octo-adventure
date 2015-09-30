/// <reference path="../../typings/tsd.d.ts" />

/// <reference path="../api.d.ts" />

import express = require('express');
import http_status = require('http-status');

import {ResultDataStoreInterface} from '../datastore/DataStoreInterfaces';
import {ResultRouteControllerInterface} from './Routes';

import {sendErrorOrResult} from './RouteErrors';

module ResultRoute {
    export class ResultRouteController implements ResultRouteControllerInterface {
        private api:ResultDataStoreInterface = null;

        constructor(api:ResultDataStoreInterface) {
            this.api = api;
        }

        getResults(skip:number, limit:number, callback:(err:Error, result:ApiResponses.ResultResponse[])=>any) {
            this.api.getResults(skip, skip + limit, callback);
        }
    }
}

export = ResultRoute;
