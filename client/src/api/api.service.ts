/// <reference path="../../typings/tsd.d.ts" />

module ApiService {
    export interface RoomResponse {
        game_id: string;
        players: string[];
    }

    export interface GameResponse {
        id: string;
        players: {
            [name:string]:{
                state: string;
                cards: string[];
            }
        };
    }

    export class Api {
        public static $inject:string[] = ["Restangular"];

        constructor(private Restangular:restangular.IService) {
        }

        init(baseUrl:string) {
            this.Restangular.setBaseUrl(baseUrl);
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
    }

    var app = angular
        .module("octo.api.service", ['restangular'])
        .service('Api', Api);
}
