/// <reference path="../../typings/tsd.d.ts" />

/// <reference path="../../../server/src/api.d.ts" />

module ApiService {
    export class Api {
        public static $inject:string[] = ["Restangular"];

        constructor(private Restangular:restangular.IService) {
        }

        init(baseUrl:string) {
            this.Restangular.setBaseUrl(baseUrl);
        }

        newGame(room_id:string):angular.IPromise<ApiResponses.GameResponse> {
            return this.Restangular.one('rooms', room_id).post('game', {});
        }

        joinRoom(room_id:string, player:string):angular.IPromise<any> {
            return this.Restangular.one('rooms', room_id).one('players', player).put();
        }

        getGame(game_id:string):angular.IPromise<ApiResponses.GameResponse> {
            return this.Restangular.all('game').get(game_id);
        }

        getGlobalChat():angular.IPromise<ApiResponses.ChatResponse[]> {
            return this.Restangular.all('chat').getList();
        }

        getRooms():angular.IPromise<ApiResponses.RoomResponse[]> {
            return this.Restangular.all('rooms').getList();
        }

        postAction(game_id:string, player:string, action:string):angular.IPromise<void> {
            return this.Restangular.one('game', game_id).post('action', {player:player, action:action});
        }

        postGlobalChat(message:string):angular.IPromise<ApiResponses.ChatResponse[]> {
            return this.Restangular.all('chat').post({message:message});
        }

        getMostWins():angular.IPromise<ApiResponses.LeaderboardResponse[]> {
            return this.Restangular.all('leaderboard').getList();
        }
    }

    var app = angular
        .module("octo.api.service", ['restangular'])
        .service('Api', Api);
}
