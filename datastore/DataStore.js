/// <reference path="../../typings/main.d.ts" />
"use strict";
var DataStoreMemory_1 = require('./DataStoreMemory');
var DataStoreRedis_1 = require('./DataStoreRedis');
var DataStoreModule;
(function (DataStoreModule) {
    var instance = null;
    function create() {
        if (!instance) {
            if (process.env.REDIS_URL) {
                instance = new DataStoreRedis_1.RedisDataStore();
            }
            else {
                instance = new DataStoreMemory_1.MemoryDataStore();
            }
        }
        return instance;
    }
    DataStoreModule.create = create;
})(DataStoreModule || (DataStoreModule = {}));
module.exports = DataStoreModule;
