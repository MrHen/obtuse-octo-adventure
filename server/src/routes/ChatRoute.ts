/// <reference path="../../typings/tsd.d.ts" />

import express = require('express');
import http_status = require('http-status');

module ChatRoute {
    export interface ChatStateInterface {
        getGlobalChat(callback:(err:Error, allMessages:string[])=>any):any;
        pushGlobalChat(message:string, callback:(err:Error, allMessages:string[])=>any):any;
    }

    export class ChatRouteController {
        public static ERROR_INVALID_MESSAGE = 'Invalid chat message';

        private state:ChatStateInterface = null;

        constructor(state:ChatStateInterface) {
            this.state = state;
        }

        getMessages(callback:(err:Error, result:string[])=>any) {
            this.state.getGlobalChat(callback);
        }

        postMessage(request:{message:string}, callback:(err:Error, result:string[])=>any) {
            if (!request || !request.message) {
                return callback(new Error(ChatRouteController.ERROR_INVALID_MESSAGE), null);
            }

            this.state.pushGlobalChat(request.message, callback);
        }
    }

    function sendErrorResponse(res:express.Response, err:Error) {
        var status:number = null;
        // TODO This is not entirely appropriate
        var message:string = err.message;
        switch(err.message) {
            case ChatRouteController.ERROR_INVALID_MESSAGE:
                status = http_status.BAD_REQUEST;
                break;
            default:
                status = http_status.INTERNAL_SERVER_ERROR;
        }
        return res.status(status).send({message:message});
    }

    export function init(app:express.Express, base:string, state:ChatStateInterface) {
        var controller = new ChatRouteController(state);

        app.get(base, function (req, res) {
            controller.getMessages((err:Error, messages:string[]) => {
                if (err) {
                    return sendErrorResponse(res, err);
                }

                res.send(messages);
            });
        });

        app.post(base, function (req, res) {
            var chatRequest = {
                message: req.body.message
            };

            controller.postMessage(chatRequest, (err:Error, messages:string[]) => {
                if (err) {
                    return sendErrorResponse(res, err);
                }

                res.send(messages);
            });
        });
    }
}

export = ChatRoute;
