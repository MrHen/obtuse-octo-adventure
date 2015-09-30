/// <reference path="../../typings/tsd.d.ts" />

import _ = require('lodash');

module GameConstants {
    export var DEFAULT_ROOM = 'demo';
    export var DEFAULT_PLAYER = 'player';

    export var PLAYER_STATES = {
        BUST: 'bust',
        CURRENT: 'current',
        DEALING: 'deal',
        STAY: 'stay',
        WAITING: 'wait',
        WIN: 'win'
    };

    export var PLAYER_ACTIONS = {
        DEAL: 'deal',
        HIT: 'hit',
        STAY: 'stay'
    };

    export var DEALER = 'dealer';

    export var CARD_SUITS = ['H', 'C', 'D', 'S'];
    export var CARD_VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];
    export var CARD_HIDDEN = 'XX'; // used to hide dealer cards when necessary

    export var EVENTS = {
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
    export var DEALER_STAY = 17;
    export var DECK_COUNT = 1;
    export var MAX = 21;

    export function valueForCards(cards:string[]):number {
        return _.sum(cards, (card:string) => {
            if (+card[0] > 0) {
                return +card[0];
            }

            return card[0] === 'A' ? 11 : 10;
        })
    }
}

export = GameConstants;
