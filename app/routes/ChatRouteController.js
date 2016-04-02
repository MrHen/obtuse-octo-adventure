/// <reference path="../../typings/main.d.ts" />
"use strict";
var RouteErrors = require('./RouteErrors');
var ChatRouteController = (function () {
    function ChatRouteController(api) {
        this.api = null;
        this.api = api;
    }
    ChatRouteController.prototype.getMessages = function (callback) {
        this.api.getGlobalChat(20, callback);
    };
    // This particular route uses a request object pattern instead of the more typical parameter list. Keeping things to
    // a solitary object would actually make life a lot easier in the future as the number of routes continues to
    // expand. But... it isn't necessary yet. (And it is easy to convert later.)
    ChatRouteController.prototype.postMessage = function (request, callback) {
        if (!request || !request.message) {
            return callback(new Error(RouteErrors.ERROR_INVALID_MESSAGE), null);
        }
        this.api.pushGlobalChat(request.message, callback);
    };
    return ChatRouteController;
}());
module.exports = ChatRouteController;
