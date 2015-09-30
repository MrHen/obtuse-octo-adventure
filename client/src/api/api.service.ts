/// <reference path="../../typings/tsd.d.ts" />

module ApiService {
    export interface RoomResponse {
        room_id: string;
        game_id: string;
        players: string[];
    }

    export interface GameResponse {
        id: string;
        players: {
            [name:string]:{
                state: string;
                cards: string[];
                score?: number;
            }
        };
        ended: boolean;
    }

    export interface LeaderboardResponse {
        player: string;
        wins: number;
    }

    export class Api {
        public static $inject:string[] = ["Restangular"];

        constructor(private Restangular:restangular.IService) {
        }

        init(baseUrl:string) {
            this.Restangular.setBaseUrl(baseUrl);
        }

        newGame(room_id:string):angular.IPromise<GameResponse> {
            return this.Restangular.one('rooms', room_id).post('game', {});
        }

        joinRoom(room_id:string, player:string):angular.IPromise<any> {
            return this.Restangular.one('rooms', room_id).one('players', player).put();
        }

        getGame(game_id:string):angular.IPromise<GameResponse> {
            return this.Restangular.all('game').get(game_id);
        }

        getGlobalChat():angular.IPromise<string[]> {
            return this.Restangular.all('chat').getList();
        }

        getRooms():angular.IPromise<RoomResponse[]> {
            return this.Restangular.all('rooms').getList();
        }

        postAction(game_id:string, player:string, action:string):angular.IPromise<void> {
            return this.Restangular.one('game', game_id).post('action', {player:player, action:action});
        }

        postGlobalChat(message:string):angular.IPromise<string[]> {
            return this.Restangular.all('chat').post({message:message});
        }

        getMostWins():angular.IPromise<LeaderboardResponse[]> {
            return this.Restangular.all('leaderboard').getList();
        }
    }

    var app = angular
        .module("octo.api.service", ['restangular'])
        .service('Api', Api);
}
