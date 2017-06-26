/**
 * ping namespaces calculated ping probability by building a probability tree.
 */
let ping = {};
(function (context) {
    "use strict";
    class Creature {
        constructor(hp, name, toDie) {
            this.hp = hp;
            this.activeHp = hp;
            this.name = name;
            this.toDie = toDie;
        }
    }
    class Outcome {
        /**
         * @param val {Array<int>} value of the outcome, for example [1,1,1,1] if 4 pings and all hit creature with name 1
         * @param {Number} probability of this outcome
         */
        constructor(val, p) {
            this.val = val;
            this.p = p;
        }
    }
    /**
     * A node class used for probability tree
     */
    class Node {
        /**
         * @param parent {Node} parent node
         * @param value {int} creature hit (represented by integer, each creature has unique int)
         * @param probability {Number} edge probability
         */
        constructor(parent, value, probability) {
            this.parent = parent;
            this.children = [];
            this.value = value;
            this.probability = probability;
        }

        addChild(node) {
            this.children.push(node);
        }

        getLeafNodes(leafNodes = []) {
            if (this.children.length <= 0) {
                leafNodes.push(this);
            }
            this.children.map((child) => child.getLeafNodes(leafNodes));
            return leafNodes;
        }

        /**
         * Returns an object with the array represented creatures hit in this outcome, and probability of reaching
         * this outcome
         * @returns {Outcome}
         */
        get outcomeWithProbability() {
            let p = 1,
                outcome = [],
                active = this;
            while (active.parent !== null) {
                outcome.push(active.value);
                p *= active.probability;
                active = active.parent;
            }
            return new Outcome(outcome, p);
        }
    }
    /**
     * Pop value of nested array on arr[index], if nested array is empty after pop it is removed from arr
     * @param arr  {Array<Array>} nested array
     * @param index
     * @returns {Array} popped value of nested array
     */
    function nestedPop(arr, index) {
        let returnValue = arr[index].pop();
        if (arr[index].length <= 0)
            arr.splice(index, 1);
        return returnValue;
    }

    /**
     * Create a shallow copy of array and its nested arrays.
     * @param arr {Array<Array>} nested array
     * @return {Array} deep copy of array
     */
    function copy(arr) {
        return arr.map((nestedArr) => nestedArr.slice(0));
    }

    /**
     * Creates an tree built with Node objects. Each node has a probability value, to get the probability to arrive at
     * a node you multiply all probabilities from that node up to the root node. The outcome can be found in the same
     * way by traveling to the root while collecting all Node.value
     * @param creatures {Array<Array<int>>}
     * @param pings {int}
     * @param parentNode {Node}
     */
    function createOutcomeTree(creatures, pings, parentNode) {
        if (pings <= 0 || creatures.length <= 0) {
            return;
        }
        creatures.map((_, index) => {
            let probability = 1 / creatures.length,
                updatedCreatures = copy(creatures),  // for some reason this needs to be deep copied? Ah array of arrays
                childNode = new Node(parentNode, nestedPop(updatedCreatures, index), probability);
            parentNode.addChild(childNode);
            createOutcomeTree(updatedCreatures, pings - 1, childNode);
        })
    }

    /**
     * Returns true if creature's damage taken in this outcome is in compliance with creature.toDie
     * For example if creature.toDie = true and damage taken >= creature.hp the outcome is desired.
     * @param creature {Creature}
     * @param outcome {Outcome} outcome object containing outcome and p variable
     * @returns {boolean}
     */
    function isDesiredOutcome(creature, outcome) {
        let dmg = outcome.val.reduce((acc, val) => {
            if (val === creature.name)
                return acc + 1;
            else return acc;
        }, 0);
        return ((creature.toDie && dmg >= creature.hp) || (!creature.toDie && dmg < creature.hp));
    }

    /**
     * Filters outcomes to only outcomes that have desired results
     * @param creatures {Array<Creature>} array with creature objects
     * @param outcomes {Array<Outcome>} array of outcomes
     * @returns {Array<Outcome>}
     */
    function filterOutcomes(creatures, outcomes) {
        if (creatures.length === 0)
            return outcomes;
        const [creature, ...remaining] = creatures,
            filtered = outcomes.filter((outcome) => isDesiredOutcome(creature, outcome));
        return filterOutcomes(remaining, filtered);
    }
    /**
     * Creates an array with nested arrays. The nested arrays are filled with creature.name entered as many times as it
     * has hp. When a creature takes damage one instance of creature.name is popped from its array to the outcome.
     * @param creatures {Array<Creature>}
     * @returns {Array<Array<int>>}
     */
    function getCreatureArray(creatures) {
        return creatures.map((c) => new Array(c.hp).fill(c.name));
    }
    this.calculate = function (creaturesFromInput, pings) {
        // FIXME I would like to send Creature instances to this already not make them here, but I think I need to be able to export the class or something
        const creatures =  creaturesFromInput.map((c) => new Creature(c.hp, c.name, c.toDie)),
            creaturesArray = getCreatureArray(creatures),
            root = new Node(null, null, 1.0);
        createOutcomeTree(creaturesArray, pings, root);
        const leafNodes = root.getLeafNodes(),
            outcomes = leafNodes.map((leaf) => leaf.outcomeWithProbability),
            filteredOutcomes = filterOutcomes(creatures, outcomes),
            summedProbability = filteredOutcomes.reduce((acc, outcome) => acc + outcome.p, 0);
        return summedProbability;
    }
}).apply(ping);

/**
 * draw namespace calculates probability of drawing a set of cards from a deck mathematically using combinatorics
 */
let draw = {};
(function (context) {
    "use strict";
    const DECK_SIZE = 30;

    /**
     * Recursive implementation of n choose k. Both n and k have to be
     * positive integers, otherwise -1 is returned.
     * @param  {int} n Total amount to choose from
     * @param  {int} k How many to choose
     * @return {int}   Returns how many possible combinations can be drawn disregarding order drawn
     */
    function choose(n, k) {
        if (n < 0 || k < 0) {
            return -1;
        }
        if (k === 0) {
            return 1;
        } else {
            return (n * choose(n - 1, k - 1)) / k;
        }
    }

    /**
     * Returns the number of combinations the cards can make. FIXME explain better.
     * @param combinations
     * @returns {*}
     */
    function combinationCount(combinations) {
        return combinations.reduce((sum, combo) => {
            const comboProduct = combo.reduce((product, card) => {
                return product * choose(...card);
            }, 1);
            return comboProduct + sum;
        }, 0);
    }

    /**
     * Fills a combinations of target cards with remaining draws from non target cards and returns that updated
     * array of combinations.
     * @param targetCombinations
     * @param draws
     * @returns {Array}
     */
    function fillCombinations(targetCombinations, draws) {
        const nonTargetAmount = DECK_SIZE - targetCombinations[0].reduce((acc, card) => {
                return acc + card[0];
            }, 0);
        // Add the remaining draws (after combination has been drawn) from non target cards
        return targetCombinations.map((combo) => {
            const drawn = combo.reduce((drawAcc, card) => drawAcc + card[1], 0),
                drawsLeft = Math.max(draws - drawn, 0);
            return [...combo, [nonTargetAmount, drawsLeft]];
        });
    }

    /**
     * Creates all valid combination of target card draws. Draws only from target cards, the deck is not considered.
     * Every valid card draw is represented as an array with two values [total, drawn], for a targetCard {needed: 2, amount: 3}
     * two array will be created since there are tvo valid combinations of that card (drawn = 2 and drawn = 3),
     * each separate combination of a card will then be combined with all other cards valid combinations to create
     * all valid combinations of target card draws.
     * FIXME The rampant ... spread is to continually flatten results, otherwise results are nested very deeply, fix somehow
     * @param targetCards
     * @param activeCombo
     * @returns {Array}
     */
    function targetCombinations(targetCards, activeCombo = []) {
        if (targetCards.length === 0) {
            return [activeCombo];  // Not entirely sure why I need to wrap this
        }
        const [card, ...cardsLeft] = targetCards;
        return [...helpers.rangeInclusive(card.needed, card.total).reduce((results, currentNeeded) => {
            return [...results, ...targetCombinations(cardsLeft, [...activeCombo, [card.total, currentNeeded]])];
        }, [])];
    }

    /**
     *
     * @param cards {Array<Object>}     Array containing Objects with information about target cards (amount, needed)
     * @param draws {Number}    Amount of draws
     * @returns {number}        Chance to draw desired hand
     */
    this.calculate = function (cards, draws) {
        const validTargetCombinations = targetCombinations(cards),
            allValidCombinations = fillCombinations(validTargetCombinations, draws);
        return combinationCount(allValidCombinations) / choose(DECK_SIZE, draws);
    };
}).apply(draw);
exports.ping = ping;