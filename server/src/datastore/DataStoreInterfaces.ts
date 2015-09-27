/// <reference path="../../typings/tsd.d.ts" />

module DataStoreInterfaces {
    export interface DataStoreInterface {
        chat:ChatDataStoreInterface;
        game:GameDataStoreInterface;

        connect(callback:(err:Error)=>any);
    }

    export var ERRORS = {
        CHAT: {
            INVALID_MESSAGE: 'Invalid chat message'
        }
    };

    export var EVENTS = {
        GLOBALCHAT: 'globalchat:created'
    };

    export interface ChatDataStoreInterface {
        getGlobalChat(limit:number, callback:(err:Error, allMessages:string[])=>any):any;
        onGlobalChat(callback:(message:string)=>any):any;
        pushGlobalChat(message:string, callback:(err:Error, message:string)=>any):any;
    }

    export interface GameDataStoreInterface {
        getPlayerCards(gameId:string, player:string, callback:(err:Error, cards:string[])=>any):any;
        getPlayerStates(gameId:string, callback:(err:Error, players:{[player:string]:string})=>any):any;

        setPlayerState(gameId:string, player:string, state:string, callback:(err:Error)=>any):any;

        postGame(callback:(err:Error, gameId:string)=>any):any;
        postPlayerCard(gameId:string, player:string, card:string, callback:(err:Error)=>any):any;
        postResult(player:string, playerResult:number, dealerResult:number, callback:(err:Error)=>any):any;
    }
}

export = DataStoreInterfaces;
