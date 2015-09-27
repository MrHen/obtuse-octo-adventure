/// <reference path="../../typings/tsd.d.ts" />

import should = require("should");

import DataStore = require('./DataStore');

import DataStoreModule = require('./DataStoreInterfaces');
import DataStoreInterface = DataStoreModule.DataStoreInterface;

describe('DataStore', () => {
    var dataStore:DataStoreInterface = null;

    beforeEach((done) => {
        dataStore = DataStore.create();
        dataStore.connect(done);
    });

    afterEach(() => {
        DataStore.reset();
    });

    describe('ChatDataStore', () => {
        it('gets empty chat', (done) => {
            dataStore.chat.getGlobalChat(10, (err, results) => {
                should.not.exist(err);
                should.exist(results);
                results.should.eql([]);
                done();
            });
        });

        it('posts and retrieves chat', (done) => {
            dataStore.chat.pushGlobalChat("Yay!", (err, results) => {
                dataStore.chat.getGlobalChat(10, (err, results) => {
                    should.not.exist(err);
                    should.exist(results);
                    results.should.eql(['Yay!']);
                    done();
                });
            });
        });

        it('gets with default limit', (done) => {
            dataStore.chat.pushGlobalChat("Yay!", (err, results) => {
                dataStore.chat.getGlobalChat(null, (err, results) => {
                    should.not.exist(err);
                    should.exist(results);
                    results.should.eql(["Yay!"]);
                    done();
                });
            });
        });

        it('gets with negative limit', (done) => {
            dataStore.chat.pushGlobalChat("Yay!", (err, results) => {
                dataStore.chat.getGlobalChat(-1, (err, results) => {
                    should.not.exist(err);
                    should.exist(results);
                    results.should.eql([]);
                    done();
                });
            });
        });

        it('cannot post with null message', (done) => {
            dataStore.chat.pushGlobalChat(null, (err, results) => {
                should.exist(err);
                should.not.exist(results);
                done();
            });
        });

        it('cannot post with empty message', (done) => {
            dataStore.chat.pushGlobalChat("", (err, results) => {
                should.exist(err);
                should.not.exist(results);
                done();
            });
        });

        it('fires event on post', (done) => {
            dataStore.chat.onGlobalChat((message:string) => {
                should.exist(message);
                message.should.eql("Yay!");
                done();
            });

            dataStore.chat.pushGlobalChat("Yay!", (err, results) => {
                should.not.exist(err);
            });
        });
    });
});
