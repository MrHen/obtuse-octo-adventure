/// <reference path="../../typings/tsd.d.ts" />

import data_driven = require("data-driven");
import should = require("should");
import sinon = require("sinon");

import DataStore = require('../datastore/DataStore');

import DataStoreModule = require('../datastore/DataStoreInterfaces');
import DataStoreInterface = DataStoreModule.DataStoreInterface;

import {GameServiceController} from './GameService';

describe('GameService', () => {
    var sandbox:any = null;

    var dataStore:DataStoreInterface = null;
    var gameService:GameServiceController = null;

    beforeEach((done) => {
        sandbox = sinon.sandbox.create();

        dataStore = DataStore.create();
        dataStore.connect(done);

        gameService = new GameServiceController(dataStore);
    });

    afterEach((done) => {
        dataStore.reset(done);

        sandbox.restore();
    });

    describe('getWinners', () => {
        data_driven([
            {
                label: 'dealer wins if everyone is bust',
                states: [{player: 'player', state: 'bust'}, {player: 'dealer', state: 'bust'}],
                scores: {'player': 22, 'dealer': 23},
                expected: ['dealer']
            },
            {
                label: 'dealer wins with higher score',
                states: [{player: 'player', state: 'stay'}, {player: 'dealer', state: 'stay'}],
                scores: {'player': 16, 'dealer': 20},
                expected: ['dealer']
            },
            {
                label: 'dealer wins with equal score',
                states: [{player: 'player', state: 'stay'}, {player: 'dealer', state: 'stay'}],
                scores: {'player': 20, 'dealer': 20},
                expected: ['dealer']
            },
            {
                label: 'player wins with higher score',
                states: [{player: 'player', state: 'stay'}, {player: 'dealer', state: 'stay'}],
                scores: {'player': 20, 'dealer': 19},
                expected: ['player']
            },
            {
                label: 'player wins if dealer busts',
                states: [{player: 'player', state: 'stay'}, {player: 'dealer', state: 'bust'}],
                scores: {'player': 20, 'dealer': 23},
                expected: ['player']
            },
            {
                label: 'dealer wins if player busts',
                states: [{player: 'player', state: 'bust'}, {player: 'dealer', state: 'stay'}],
                scores: {'player': 23, 'dealer': 20},
                expected: ['dealer']
            },
            {
                label: 'multiple players can win',
                states: [{player: 'player', state: 'stay'}, {player: 'dealer', state: 'stay'}, {player: 'other', state: 'stay'}],
                scores: {'player': 20, 'dealer': 19, 'other': 20},
                expected: ['player', 'other']
            },
            {
                label: 'survives empty states',
                states: [],
                scores: {'player': 20, 'dealer': 19, 'other': 20},
                expected: ['dealer']
            },
            {
                label: 'survives null states',
                states: null,
                scores: {'player': 20, 'dealer': 19, 'other': 20},
                expected: ['dealer']
            },
            {
                label: 'survives empty scores',
                states: [{player: 'player', state: 'stay'}, {player: 'dealer', state: 'stay'}],
                scores: {},
                expected: ['dealer']
            },
            {
                label: 'survives null scores',
                states: [{player: 'player', state: 'stay'}, {player: 'dealer', state: 'stay'}],
                scores: null,
                expected: ['dealer']
            }
        ], () => {
            it('{label}', (context) => {
                var actual = gameService.getWinners(context.states, context.scores);
                should.exist(actual);
                actual.should.containDeep(context.expected);
            });
        });
    });

    describe('isGameEnded', () => {
        data_driven([
            {
                label: 'all bust',
                states: [{player: 'player', state: 'bust'}, {player: 'dealer', state: 'bust'}],
                expected: true
            },
            {
                label: 'all stay',
                states: [{player: 'player', state: 'stay'}, {player: 'dealer', state: 'stay'}],
                expected: true
            },
            {
                label: 'wait + stay',
                states: [{player: 'player', state: 'wait'}, {player: 'dealer', state: 'stay'}],
                expected: false
            },
            {
                label: 'current + stay',
                states: [{player: 'player', state: 'current'}, {player: 'dealer', state: 'stay'}],
                expected: false
            },
            {
                label: 'wait + win',
                states: [{player: 'player', state: 'wait'}, {player: 'dealer', state: 'win'}],
                expected: true
            },
            {
                label: 'deal + stay',
                states: [{player: 'player', state: 'deal'}, {player: 'dealer', state: 'stay'}],
                expected: false
            },
            {
                label: 'survives empty states',
                states: [],
                expected: true
            },
            {
                label: 'survives null states',
                states: null,
                expected: true
            }
        ], () => {
            it('{label}', (context) => {
                var actual = gameService.isGameEnded(context.states);
                should.equal(actual, context.expected);
            });
        });

        describe('shuffle', () => {
            it('fifty-two cards', (done) => {
                var stub = sandbox.stub(dataStore.game, 'setDeck').callsArgWithAsync(2, null);
                gameService.shuffle('game', (err) => {
                    should.not.exist(err);

                    stub.callCount.should.eql(1);
                    stub.args[0][0].should.eql('game');
                    stub.args[0][1].length.should.eql(52);
                    done();
                });
            });

            it('cascades error', (done) => {
                var stub = sandbox.stub(dataStore.game, 'setDeck').callsArgWithAsync(2, new Error('test error'));
                gameService.shuffle('game', (err) => {
                    should.exist(err);
                    stub.callCount.should.eql(1);
                    done();
                });
            });
        });

        describe('value for cards', () => {
            data_driven([
                {cards: ['AC'], expected: 11},
                {cards: ['2H'], expected: 2},
                {cards: ['3D'], expected: 3},
                {cards: ['4D'], expected: 4},
                {cards: ['5H'], expected: 5},
                {cards: ['6C'], expected: 6},
                {cards: ['7S'], expected: 7},
                {cards: ['8S'], expected: 8},
                {cards: ['9S'], expected: 9},
                {cards: ['TH'], expected: 10},
                {cards: ['JC'], expected: 10},
                {cards: ['QC'], expected: 10},
                {cards: ['KC'], expected: 10},

                {cards: ['AS', 'KC'], expected: 21},
                {cards: ['AS', '3H', '2D', '3D'], expected: 19},
                {cards: ['KS', 'TH', 'JS'], expected: 30},

                {cards: ['AD', 'TH', 'JS'], expected: 31}, // TODO support multi-value Aces

                {cards: [], expected: 0},
                {cards: null, expected: 0}
            ], () => {
                it('"{cards}" equals {expected}', (context) => {
                    var actual = gameService.valueForCards(context.cards);
                    should.equal(actual, context.expected);
                });
            });
        });
    });
});