const assert = require('assert'),
    calculate = require('../app/js/calculation'),
    simulation = require('../app/js/simulation');

// Test ping simulation
describe('PingSimulation', () =>{
    describe("#run", () => {
        it('Unkillable situation recognized', () => {
           const creatures = [{hp: 4, name: 0, toDie: false}, { hp: 4, name: 1, toDie: true }],
               pings = 2;
           assert.equal(simulation.pingSim.run(creatures, pings, 200000), 0);
       });
        it('Unkillable situation recognized', () => {
            const creatures = [{ hp: 2, name: 0, toDie: true }, { hp: 2, name: 1, toDie: true }],
                pings = 2;
            assert.equal(simulation.pingSim.run(creatures, pings, 200000), 0);
        });
        it('Should not overdamage. Should be able to kill 2 2hp creature in 4 pings', () => {
            const creatures = [{ hp: 2, name: 0, toDie: true }, { hp: 2, name: 1, toDie: true }],
                pings = 4;
            assert.equal(simulation.pingSim.run(creatures, pings, 200000), 1);
        });
        it('Should not overdamage', () => {
            const creatures = [{ hp: 2, name: 0, toDie: true }, { hp: 2, name: 1, toDie: true }, { hp: 2, name: 2, toDie: true }],
                pings = 6;
            assert.equal(simulation.pingSim.run(creatures, pings, 200000), 1);
        });
        it('More pings than total hp', () => {
            const creatures = [{ hp: 2, name: 0, toDie: true }],
                pings = 6;
            assert.equal(simulation.pingSim.run(creatures, pings, 200000), 1);
        });
        it('Kill one 2 hp creature in 4 pings', () => {
            const creatures = [{hp: 4, name: 0, toDie: false}, { hp: 2, name: 1, toDie: true }],
                pings = 4;
            assert.equal(simulation.pingSim.run(creatures, pings, 200000).toFixed(2), 0.69);
        });
        it('Large number time test', () => {
            const creatures = [{hp: 4, name: 0, toDie: false}, { hp: 2, name: 1, toDie: true }, { hp: 2, name: 1, toDie: true }, { hp: 2, name: 1, toDie: true }],
                pings = 9;
            simulation.pingSim.run(creatures, pings, 200000).toFixed(2);
            assert.equal(true, true);
        });
    });
});
// Test ping calculation
describe('Ping', () =>{
    describe("#calculate", () => {
        it('Unkillable situation recognized', () => {
            const creatures = [{hp: 4, name: 0, toDie: false}, { hp: 4, name: 1, toDie: true }],
                pings = 2;
            assert.equal(calculate.ping.calculate(creatures, pings), 0);
        });
        it('Unkillable situation recognized', () => {
            const creatures = [{ hp: 2, name: 0, toDie: true }, { hp: 2, name: 1, toDie: true }],
                pings = 2;
            assert.equal(calculate.ping.calculate(creatures, pings), 0);
        });
        it('Should not overdamage. Should be able to kill 2 2hp creature in 4 pings', () => {
            const creatures = [{ hp: 2, name: 0, toDie: true }, { hp: 2, name: 1, toDie: true }],
                pings = 4;
            assert.equal(calculate.ping.calculate(creatures, pings), 1);
        });
        it('Should not overdamage', () => {
            const creatures = [{ hp: 2, name: 0, toDie: false }, { hp: 2, name: 1, toDie: true }, { hp: 2, name: 2, toDie: true }],
                pings = 6;
            assert.equal(calculate.ping.calculate(creatures, pings), 0);
        });
        it('More pings than total hp', () => {
            const creatures = [{ hp: 2, name: 0, toDie: true }],
                pings = 6;
            assert.equal(calculate.ping.calculate(creatures, pings), 1);
        });
        it('Kill one 2 hp creature in 4 pings', () => {
            const creatures = [{hp: 4, name: 0, toDie: false}, { hp: 2, name: 1, toDie: true }],
                pings = 4;
            // assert.equal(probability.ping.calculate(creatures, pings).toFixed(2), 0.69);
            assert.equal(calculate.ping.calculate(creatures, pings).toFixed(2), 0.69);
        });
        it('Large number time test', () => {
            const creatures = [{hp: 4, name: 0, toDie: false}, { hp: 2, name: 1, toDie: true }, { hp: 2, name: 1, toDie: true }, { hp: 2, name: 1, toDie: true }],
                pings = 9;
            calculate.ping.calculate(creatures, pings, 200000).toFixed(2);
            assert.equal(true, true);
        });
    });
});
