declare module ApiResponses {
    export interface RoomResponse {
        room_id: string;
        game_id: string;
        players: string[];
    }

    export interface GameResponse {
        id: string;
        players: {[name:string]:GamePlayerResponse};
        ended: boolean;
    }

    export interface GamePlayerResponse {
        state: string;
        cards: string[];
        score?: number;
    }

    export interface GameCurrentTurnResponse {
        player: string;
        actions: string[];
    }

    export interface LeaderboardResponse {
        player: string;
        wins: number;
    }

    export interface ResultResponse {
        game:string;
        scores:{[player:string]:number}
    }

    export interface CardDealtResponse {
        gameId:string;
        player:string;
        card:string
    }

    export interface PlayerStateResponse {
        gameId:string;
        player:string;
        state:string
    }

export type ChatResponse = string;
}
