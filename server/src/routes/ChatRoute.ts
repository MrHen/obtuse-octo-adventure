/// <reference path="../../typings/tsd.d.ts" />

import express = require('express');
import http_status = require('http-status');

module ChatRoute {
    export interface ChatStateInterface {
        //getGlobalChat(callback:(err:Error, allMessages:string[])=>any):any;
        pushGlobalChat(message:string, callback:(err:Error, allMessages:string[])=>any):any;
    }

    export class ChatRouteController {
        public static ERROR_INVALID_MESSAGE = 'Invalid chat message';

        private state:ChatStateInterface = null;

        constructor(state:ChatStateInterface) {
            this.state = state;
        }

        postMessage(request:{message:string}, callback:(err:Error, result:string[])=>any) {
            if (!request || !request.message) {
                return callback(new Error(ChatRouteController.ERROR_INVALID_MESSAGE), null);
            }

            this.state.pushGlobalChat(request.message, callback);
        }
    }

    export function init(app:express.Express, base:string, state:ChatStateInterface) {
        var controller = new ChatRouteController(state);

        app.post(base, function (req, res) {
            var chatRequest = {
                message: req.body.message
            };

            controller.postMessage(chatRequest, (err:Error, messages:string[]) => {
                if (err) {
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

                res.send(messages);
            });
        });
    }
}

export = ChatRoute;
