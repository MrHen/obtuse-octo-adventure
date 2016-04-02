/// <reference path="../../typings/main.d.ts" />
"use strict";
var http_status = require('http-status');
// Store route errors in an accessible location and predefine the error codes. In a more complicated application, these
// codes would not have a 1:1 mapping and would need to be customized per controller.
var RouteErrors;
(function (RouteErrors) {
    RouteErrors.ERROR_GAME_EXISTS = 'Game started';
    RouteErrors.ERROR_INVALID_ACTION = 'Invalid action';
    RouteErrors.ERROR_INVALID_GAME = 'Invalid game';
    RouteErrors.ERROR_INVALID_MESSAGE = 'Invalid chat message';
    RouteErrors.ERROR_INVALID_PLAYER = 'Invalid player';
    RouteErrors.ERROR_INVALID_PLAYERNAME = 'Invalid player name';
    RouteErrors.ERROR_INVALID_TURN = 'Different player turn';
    RouteErrors.ERROR_MISSING_PLAYER = 'No players';
    RouteErrors.StatusCodes = {};
    RouteErrors.StatusCodes[RouteErrors.ERROR_GAME_EXISTS] = http_status.BAD_REQUEST;
    RouteErrors.StatusCodes[RouteErrors.ERROR_INVALID_ACTION] = http_status.BAD_REQUEST;
    RouteErrors.StatusCodes[RouteErrors.ERROR_INVALID_GAME] = http_status.BAD_REQUEST;
    RouteErrors.StatusCodes[RouteErrors.ERROR_INVALID_MESSAGE] = http_status.BAD_REQUEST;
    RouteErrors.StatusCodes[RouteErrors.ERROR_INVALID_PLAYER] = http_status.BAD_REQUEST;
    RouteErrors.StatusCodes[RouteErrors.ERROR_INVALID_PLAYERNAME] = http_status.BAD_REQUEST;
    RouteErrors.StatusCodes[RouteErrors.ERROR_INVALID_TURN] = http_status.BAD_REQUEST;
    RouteErrors.StatusCodes[RouteErrors.ERROR_MISSING_PLAYER] = http_status.BAD_REQUEST;
    // Convenience method for laziness and readability.
    //
    // It is not strictly appropriate to send back raw error messages in the response
    // but for the sake of this application it is safe enough.
    function sendErrorOrResult(res) {
        return function (err, result) {
            if (err) {
                var message = err.message;
                var status = RouteErrors.StatusCodes[message] || http_status.INTERNAL_SERVER_ERROR;
                return res.status(status).send({ message: message });
            }
            res.json(result);
        };
    }
    RouteErrors.sendErrorOrResult = sendErrorOrResult;
})(RouteErrors || (RouteErrors = {}));
module.exports = RouteErrors;
