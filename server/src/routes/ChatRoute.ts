/// <reference path="../../typings/tsd.d.ts" />

/// <reference path="../api.d.ts" />

import express = require('express');

import {ChatDataStoreInterface} from '../datastore/DataStoreInterfaces.ts';
import {ChatRouteControllerInterface} from './Routes.ts';

import RouteErrors = require('./RouteErrors');
import sendErrorOrResult = RouteErrors.sendErrorOrResult;

module ChatRoute {
    export class ChatRouteController implements ChatRouteControllerInterface {
        private api:ChatDataStoreInterface = null;

        constructor(api:ChatDataStoreInterface) {
            this.api = api;
        }

        getMessages(callback:(err:Error, result:ApiResponses.ChatResponse[])=>any) {
            this.api.getGlobalChat(20, callback);
        }

        postMessage(request:{message:string}, callback:(err:Error, result:ApiResponses.ChatResponse)=>any) {
            if (!request || !request.message) {
                return callback(new Error(RouteErrors.ERROR_INVALID_MESSAGE), null);
            }

            this.api.pushGlobalChat(request.message, callback);
        }
    }

    export function init(app:express.Express, base:string, api:ChatDataStoreInterface) {
        var controller = new ChatRouteController(api);

        app.get(base, function (req, res) {
            controller.getMessages(sendErrorOrResult(res));
        });

        app.post(base, function (req, res) {
            var chatRequest = {
                message: req.body.message
            };

            controller.postMessage(chatRequest, sendErrorOrResult(res));
        });
    }
}

export = ChatRoute;
