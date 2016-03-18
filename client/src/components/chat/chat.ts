/// <reference path="../../../typings/browser.d.ts" />

module Chat {
    var app = angular
        .module("octo.chat", [])
        .directive('octoChat', () => new ChatDirective())
        .controller("ChatController", ChatController);

    export class ChatDirective implements ng.IDirective {
        public templateUrl: string;
        public restrict: string;
        public scope: any;
        public controller: any;
        public controllerAs: string;
        public bindToController: boolean;

        constructor () {
            this.templateUrl = 'components/chat/chat.html';
            this.restrict = 'E';
            this.scope = {
                onChat: "&",
                messages: '='
            };
            this.controller = ChatController;
            this.controllerAs = "vm";
            this.bindToController = true;
        }
    }

    export class ChatController {
        public chatMessage: string;
        public onChat: Function;
        public messages: string[];

        constructor () {
        }

        public chatSubmit(form:angular.IFormController) {
            var message = this.chatMessage;

            if (this.onChat) {
                this.onChat({message:message});
            }

            this.chatMessage = null;
        }
    }
}
