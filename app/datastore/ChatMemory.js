/// <reference path="../../typings/main.d.ts" />
"use strict";
var _ = require('lodash');
var events = require('events');
var GameConstants_1 = require('../services/GameConstants');
var DataStoreInterfaces_1 = require('./DataStoreInterfaces');
var ChatMemory = (function () {
    function ChatMemory() {
        this.globalChat = [];
        this.emitter = new events.EventEmitter();
    }
    ChatMemory.prototype.getGlobalChat = function (limit, callback) {
        var _this = this;
        limit = limit || 20;
        while (this.globalChat.length > limit && this.globalChat.length > 0) {
            this.globalChat.shift();
        }
        process.nextTick(function () { return callback(null, _.cloneDeep(_this.globalChat)); });
    };
    ChatMemory.prototype.pushGlobalChat = function (message, callback) {
        if (!message) {
            return callback(new Error(DataStoreInterfaces_1.ERRORS.CHAT.INVALID_MESSAGE), null);
        }
        this.globalChat.push(message);
        this.emitter.emit(GameConstants_1.EVENTS.DATA.GLOBAL_CHAT, message);
        process.nextTick(function () { return callback(null, message); });
    };
    ChatMemory.prototype.onGlobalChat = function (callback) {
        this.emitter.on(GameConstants_1.EVENTS.DATA.GLOBAL_CHAT, callback);
    };
    return ChatMemory;
}());
module.exports = ChatMemory;
