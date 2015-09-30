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
    GameConstants.CARD_HIDDEN = 'XX'; // used to hide dealer cards when necessary
    GameConstants.EVENTS = {
        ACTIONREMINDER: 'action',
        CARD: 'card',
        GLOBALCHAT: 'globalchat:created',
        TIME: 'time',
        PLAYERSTATE: 'state'
    };
})(GameConstants || (GameConstants = {}));
