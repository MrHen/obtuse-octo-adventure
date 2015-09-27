/// <reference path="../../typings/tsd.d.ts" />

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

    export function reset() {
        if (instance) {
            // TODO do relevant teardown for DBs/listeners
            instance = null;
        }
    }
}

export = DataStoreModule;
