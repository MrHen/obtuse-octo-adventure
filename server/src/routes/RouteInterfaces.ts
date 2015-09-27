/// <reference path="../../typings/tsd.d.ts" />

module RouteInterfaces {
    export interface ChatRouteInterface {
        getMessages(callback:(err:Error, result:string[])=>any);
        postMessage(request:{message:string}, callback:(err:Error, result:string)=>any);
    }

    export interface GameResponse {
        id: string;
        players: {[name:string]:GamePlayerResponse};
    }

    export interface GamePlayerResponse {
        state: string;
        cards: string[];
    }

    export interface GameCurrentTurnResponse {
        player: string;
        actions: string[];
    }

    export interface GameRouteInterface {
        getGame(gameId:string, callback:(err:Error, game:GameResponse)=>any):any;
        getCurrentTurn(gameId:string, callback:(err:Error, currentTurn:GameCurrentTurnResponse)=>any):any;
        postAction(gameId:string, player:string, action:string, callback:(err:Error)=>any):any;
        postGame(newPlayers:string[], callback:(err:Error, game:GameResponse)=>any):any;
    }
}

export = RouteInterfaces;
