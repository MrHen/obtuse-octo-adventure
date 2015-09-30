/// <reference path="../../../typings/tsd.d.ts" />
var Chat;
(function (Chat) {
    var app = angular
        .module("octo.chat", [])
        .directive('octoChat', function () { return new ChatDirective(); })
        .controller("ChatController", ChatController);
    var ChatDirective = (function () {
        function ChatDirective() {
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
        return ChatDirective;
    })();
    Chat.ChatDirective = ChatDirective;
    var ChatController = (function () {
        function ChatController() {
        }
        ChatController.prototype.chatSubmit = function (form) {
            var message = this.chatMessage;
            if (this.onChat) {
                this.onChat({ message: message });
            }
            this.chatMessage = null;
        };
        return ChatController;
    })();
    Chat.ChatController = ChatController;
})(Chat || (Chat = {}));
