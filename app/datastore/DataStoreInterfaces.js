/// <reference path="../../typings/main.d.ts" />
"use strict";
/// <reference path="../api.d.ts" />
var DataStoreInterfaces;
(function (DataStoreInterfaces) {
    DataStoreInterfaces.ERRORS = {
        CHAT: {
            INVALID_MESSAGE: 'Invalid chat message'
        },
        GAME: {
            INVALID_CARD: 'Invalid card'
        },
        ROOM: {
            INVALID_GAME: 'Invalid game',
            INVALID_PLAYER: 'Invalid player'
        }
    };
})(DataStoreInterfaces || (DataStoreInterfaces = {}));
module.exports = DataStoreInterfaces;
