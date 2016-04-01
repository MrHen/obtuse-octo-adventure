/// <reference path="../../typings/main.d.ts" />
"use strict";
var GameConstants;
(function (GameConstants) {
    GameConstants.DEFAULT_ROOM = 'demo';
    GameConstants.DEFAULT_PLAYER = 'player';
    GameConstants.PLAYER_STATES = {
        BUST: 'bust',
        CURRENT: 'current',
        DEALING: 'deal',
        STAY: 'stay',
        WAITING: 'wait',
        WIN: 'win'
    };
    GameConstants.PLAYER_ACTIONS = {
        DEAL: 'deal',
        HIT: 'hit',
        STAY: 'stay'
    };
    GameConstants.DEALER = 'dealer';
    GameConstants.CARD_SUITS = ['H', 'C', 'D', 'S'];
    GameConstants.CARD_VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];
    GameConstants.CARD_HIDDEN = 'XX'; // used to hide dealer cards when necessary
    GameConstants.EVENTS = {
        DATA: {
            GLOBAL_CHAT: 'globalchat:created',
            PUSHED_CARD: 'card',
            PLAYER_STATE: 'playerstate'
        },
        GAME: {
            ACTION_REMINDER: 'action:reminder'
        },
        CLIENT: {
            ACTION_REMINDER: 'action',
            CARD: 'card',
            GLOBAL_CHAT: 'globalchat:created',
            PLAYER_STATE: 'state',
            PING: 'time'
        }
    };
    // These three could theoretically be configurable but for now they are locked
    GameConstants.DEALER_STAY = 17;
    GameConstants.DECK_COUNT = 1;
    GameConstants.MAX = 21;
})(GameConstants || (GameConstants = {}));
module.exports = GameConstants;
