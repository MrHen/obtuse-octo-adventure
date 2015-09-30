/// <reference path="../../typings/tsd.d.ts" />

/// <reference path="../api.d.ts" />

module DataStoreInterfaces {
    export interface DataStoreInterface {
        chat:ChatDataStoreInterface;
        game:GameDataStoreInterface;
        result:ResultDataStoreInterface
        room:RoomDataStoreInterface;

        connect(callback:(err:Error)=>any);
        reset(callback:(err:Error)=>any);
    }

    export var ERRORS = {
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

    export interface PlayerState {
        player:string;
        state:string;
    }

    export interface ChatDataStoreInterface {
        getGlobalChat(limit:number, callback:(err:Error, allMessages:string[])=>any):any;
        onGlobalChat(callback:(message:ApiResponses.ChatResponse)=>any):any;
        pushGlobalChat(message:string, callback:(err:Error, message:string)=>any):any;
    }

    export interface GameDataStoreInterface {
        countDeck(gameId:string, callback:(err:Error, count:number)=>any):any;

        getPlayerCards(gameId:string, player:string, callback:(err:Error, cards:string[])=>any):any;
        getPlayerStates(gameId:string, callback:(err:Error, players:PlayerState[])=>any):any;

        setDeck(gameId:string, cards:string[], callback:(err:Error)=>any):any;
        setPlayerState(gameId:string, player:string, state:string, callback:(err:Error)=>any):any;

        rpoplpush(gameId:string, player:string, callback:(err:Error, card:string)=>any):any;

        postGame(callback:(err:Error, gameId:string)=>any):any;
        postPlayerCard(gameId:string, player:string, card:string, callback:(err:Error)=>any):any;

        onPushedCard(callback:(pushedCard:ApiResponses.CardDealtResponse)=>any):any;
        onPlayerStateChange(callback:(playerState:ApiResponses.PlayerStateResponse)=>any):any;
    }

    export interface ResultDataStoreInterface {
        pushResult(gameId:string, scores:{[player:string]:number}, callback:(err:Error)=>any):any;
        getResults(start:number, end:number, callback:(err:Error, results:{game:string; scores:{[player:string]:number}}[])=>any):any;

        addPlayerWin(player:string, callback:(err:Error, wins:number)=>any):any;
        getPlayerWins(player:string, callback:(err:Error, wins:number)=>any):any;

        getMostWins(start:number, end:number, callback:(err:Error, results:{player:string; wins:number}[])=>any):any;
    }

    export interface RoomDataStoreInterface {
        deletePlayer(roomId:string, player:string, callback:(err:Error, player:string)=>any):any;
        getRooms(callback:(err:Error, rooms:string[])=>any):any;
        getGame(roomId:string, callback:(err:Error, game:string)=>any):any;
        getPlayers(roomId:string, callback:(err:Error, players:string[])=>any):any;
        putPlayer(roomId:string, player:string, callback:(err:Error, player:string)=>any):any;
        setGame(roomId:string, game:string, callback:(err:Error)=>any):any;
    }
}

export = DataStoreInterfaces;
