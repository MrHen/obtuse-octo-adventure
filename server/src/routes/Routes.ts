/// <reference path="../../typings/tsd.d.ts" />

/// <reference path="../api.d.ts" />

module Routes {
    export interface ChatRouteControllerInterface {
        getMessages(callback:(err:Error, result:string[])=>any);
        postMessage(request:{message:string}, callback:(err:Error, result:string)=>any);
    }

    export interface RoomRouteControllerInterface {
        getRoom(roomId:string, callback:(err:Error, room:ApiResponses.RoomResponse)=>any):any;
        getRooms(callback:(err:Error, rooms:ApiResponses.RoomResponse[])=>any):any;
        postPlayer(roomId:string, player:string, callback:(err:Error, player:string)=>any):any;
        postGame(roomId:string, callback:(err:Error, game:ApiResponses.GameResponse)=>any):any;
    }

    export interface ResultRouteControllerInterface {
        getResults(skip:number, limit:number, callback:(err:Error, results:ApiResponses.ResultResponse[])=>any):any;
    }

    export interface LeaderboardRouteControllerInterface {
        getPlayer(player:string, callback:(err:Error, results:ApiResponses.LeaderboardResponse)=>any):any;
    }

    export interface GameRouteControllerInterface {
        getGame(gameId:string, callback:(err:Error, game:ApiResponses.GameResponse)=>any):any;
        getCurrentTurn(gameId:string, callback:(err:Error, currentTurn:ApiResponses.GameCurrentTurnResponse)=>any):any;
        postAction(gameId:string, player:string, action:string, callback:(err:Error)=>any):any;
    }
}

export = Routes;
