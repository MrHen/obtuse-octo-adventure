/// <reference path="../../typings/main.d.ts" />

import {DataStoreInterface} from './DataStoreInterfaces.ts';

import {MemoryDataStore} from './DataStoreMemory';
import {RedisDataStore} from './DataStoreRedis';

module DataStoreModule {
    var instance:DataStoreInterface = null;

    export function create():DataStoreInterface {
        if (!instance) {
            if (process.env.REDIS_URL) {
                instance = new RedisDataStore();
            } else {
                instance = new MemoryDataStore();
            }
        }

        return instance;
    }
}

export = DataStoreModule;
