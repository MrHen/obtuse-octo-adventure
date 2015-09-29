/// <reference path="../../typings/tsd.d.ts" />

module RouteInterfaces {
    export interface ChatRouteInterface {
        getMessages(callback:(err:Error, result:string[])=>any);
        postMessage(request:{message:string}, callback:(err:Error, result:string)=>any);
    }

    export interface RoomResponse {
        room_id: string;
        game_id: string;
        players: string[];
    }

    export interface RoomRouteInterface {
        getRoom(roomId:string, callback:(err:Error, room:RoomResponse)=>any):any;
        getRooms(callback:(err:Error, rooms:RoomResponse[])=>any):any;
        postPlayer(roomId:string, player:string, callback:(err:Error, player:string)=>any):any;
        postGame(roomId:string, callback:(err:Error, game:GameResponse)=>any):any;
    }

    export interface ResultResponse {
        game:string;
        scores:{[player:string]:number}
    }

    export interface ResultRouteInterface {
        getResults(skip:number, limit:number, callback:(err:Error, results:ResultResponse[])=>any):any;
    }

    export interface LeaderboardResponse {
        player: string;
        wins: number;
    }

    export interface LeaderboardRouteInterface {
        getPlayer(player:string, callback:(err:Error, results:LeaderboardResponse)=>any):any;
    }

    export interface GameResponse {
        id: string;
        players: {[name:string]:GamePlayerResponse};
        ended: boolean;
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
    }
}

export = RouteInterfaces;
