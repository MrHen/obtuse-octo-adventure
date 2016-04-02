/// <reference path="../../typings/main.d.ts" />
"use strict";
var ChatMemory = require('./ChatMemory');
var GameMemory = require('./GameMemory');
var ResultMemory = require('./ResultMemory');
var RoomMemory = require('./RoomMemory');
// Used for local development. It would be more ideal to run a local redis instance in order to mimic production. Until
// then, use this.
var DataStoreMemory;
(function (DataStoreMemory) {
    var MemoryDataStore = (function () {
        function MemoryDataStore() {
            this.chat = new ChatMemory();
            this.game = new GameMemory();
            this.result = new ResultMemory();
            this.room = new RoomMemory();
        }
        MemoryDataStore.prototype.connect = function (callback) {
            process.nextTick(function () { return callback(null); });
        };
        MemoryDataStore.prototype.reset = function (callback) {
            // TODO tear down any listeners
            this.chat = new ChatMemory();
            this.game = new GameMemory();
            this.result = new ResultMemory();
            this.room = new RoomMemory();
            callback(null);
        };
        return MemoryDataStore;
    }());
    DataStoreMemory.MemoryDataStore = MemoryDataStore;
})(DataStoreMemory || (DataStoreMemory = {}));
module.exports = DataStoreMemory;
