/// <reference path="../../typings/tsd.d.ts" />

import _ = require('lodash');
import events = require('events');

import ChatMemory = require('./ChatMemory');
import GameMemory = require('./GameMemory');
import ResultMemory = require('./ResultMemory');
import RoomMemory = require('./RoomMemory');

import {DataStoreInterface, ChatDataStoreInterface, GameDataStoreInterface, ResultDataStoreInterface, RoomDataStoreInterface, ERRORS, EVENTS} from './DataStoreInterfaces';

// Used for local development. It would be more ideal to run a local redis instance in order to mimic production. Until
// then, use this.

module DataStoreMemory {
    export class MemoryDataStore implements DataStoreInterface {
        public chat = new ChatMemory();
        public game = new GameMemory();
        public result = new ResultMemory();
        public room = new RoomMemory();

        public connect(callback:(err:Error)=>any) {
            process.nextTick(() => callback(null));
        }

        public reset(callback:(err:Error)=>any) {
            // TODO tear down any listeners
            this.chat = new ChatMemory();
            this.game = new GameMemory();
            this.result = new ResultMemory();
            this.room = new RoomMemory();
            callback(null);
        }
    }
}

export = DataStoreMemory;
