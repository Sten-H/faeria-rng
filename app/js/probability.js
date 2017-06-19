/**
 * Ping namespace calculates probability of n amount of pings killing desired creatures
 */
let ping = {};
(function(context) {
    "use strict";
    /**
     * Filters outcome to only those where all creatures have died.
     * @param creatures {Object|Array} Array of all creatures desired dead
     * @param outcomes {Array}       outcomes to find desired outcomes in
     * @returns {Number|Array}              Array of strings representing outcomes where all creatures have died
     */
    function allDesiredOutcomes(creatures, outcomes) {
        if(creatures.length === 0) {
            return outcomes;
        } else {
            const [creature, ...creaturesLeft] = creatures,
                desiredOutcomes = creatureDesiredOutcome(creature, outcomes);
            return allDesiredOutcomes(creaturesLeft, desiredOutcomes);
        }
    }
    /**
     * Filters array of outcome strings to only outcomes where given creature dies
     * @param creature      creature to die
     * @param outcomes      outcomes to check for death in
     * @returns {Number|Array}  array of strings representing outcomes
     */
    function creatureDesiredOutcome(creature, outcomes) {
        return outcomes.filter((outcome) => {
            const dmgTaken = outcome.filter((creatureHit) => creatureHit === creature.name).length;
            if (creature.toDie)
                return dmgTaken >= creature.hp;
            else
                return dmgTaken < creature.hp;
        });
    }
    function lifeOutcomes(creature, outcomes) {
        return outcomes.filter((outcome) => {
            return outcome.filter((creatureHit) => creatureHit === creature.name).length < creature.hp;
        });
    }
    /**
     * Returns the index of creature in array
     * @param arr
     * @param creature
     * @returns {number}
     */
    function creatureIndex(arr, creature) {
        return arr.map(a => a.name).indexOf(creature.name)
    }
    /**
     * Filters out outcomes where for example a 2hp creature receives 3 pings. This is not a good approach because
     * then that death outcome is lost, it should not be filtered out rather that killing ping should be elsewhere.
     * @param outcomes
     * @param creatures
     * @returns {Array}
     */
    function filterOverdamage(outcomes, creatures) {
        console.log(outcomes);
        let arr = outcomes.filter((outcome) => {
            return creatures.every((creature) => {
                let dmg = outcome.reduce((acc, targetName) => {
                    if (targetName === creature.name)
                        return acc + 1;
                    else
                        return acc;
                }, 0);
                return dmg <= creature.hp;
            });
        });
        console.log(arr);
        return arr;
    }
    function resetCreatures(creatures) {
        creatures.forEach((c) => c.activeHp = c.hp);
    }
    /**
     * Builds each possible outcome as a string one ping at a time. One ping is represented as the name
     * of the creature it hit (ex: "A"), and one outcome is represented as a string of each hit
     * (ex: "ABAA" in a 4 ping situation, creature "A" received 3 hits))
     * @param pings
     * @param creatures         all creatures on board (including God)
     * @param outcomes          array to push each outcome to
     * @param currentOutcome    should not be assigned manually, works as an internal accumulator for each outcome
     */
    function pingOutcomes(pings, creatures, outcomes, currentOutcome=[]) {
        if(pings <= 0) {
            outcomes.push(currentOutcome);
            return;
        }
        return creatures.map( (creature) => {
            return pingOutcomes(pings - 1, creatures, outcomes, [...currentOutcome, creature.name]);
        });
    }
    this.calculate = function(creatures, pingAmount, benchmark=false) {
        // TODO try making creatures an array of just simple datatypes instead of an object to allow for deep copies. Not sure this is the problem but worth trying
        let allOutcomes = [];
        resetCreatures(creatures);
        pingOutcomes(pingAmount, creatures, allOutcomes);
        const
            filteredOutcomes = filterOverdamage(allOutcomes, creatures),
            // filteredOutcomes = allOutcomes,  // I want to filter out overdamage here, or don't do the filter approach
            desired = allDesiredOutcomes(creatures, filteredOutcomes);
        if (benchmark)
            pingSimulation.run(creatures, pingAmount);
        return (desired.length / filteredOutcomes.length);
    };
}).apply(ping);
// Simulation to test results against
let pingSimulation = {};
(function(context) {
    function creatureIndex(arr, creature) {
        return arr.map(a => a.name).indexOf(creature.name)
    }
    function resetCreatures(creatures) {
        creatures.forEach((c) => c.activeHp = c.hp)
    }
    function trial(pings, creatures) {
        for(let i = 0; i < pings; i++) {
            if(creatures.length === 0)
                break;
            let target = creatures[Math.floor(Math.random() * creatures.length)];
            target.activeHp -= 1;
            if (target.activeHp === 0) {
                let index = creatureIndex(creatures, target);
                creatures.splice(index, 1);
            }
        }
        return creatures.every((c) =>
            ((c.toDie && c.activeHp <= 0) || (!c.toDie && c.activeHp > 0)));
    }
    "use strict";
    this.run = function (creatures, pings, tries=10000) {
        let success = 0;
        for(let i = 0; i < tries; i++) {
            resetCreatures(creatures);
            if(trial(pings, creatures.slice(0), tries))
                success++;
        }
        console.log(success/tries);
        return success/tries;
    }
}).apply(pingSimulation);
/**
 * Chance namespace calculates probability mathematically using combinatorics
 */
let chance = {};
(function(context) {
    "use strict";
    const DECK_SIZE = 30;
    /**
     * Recursive implementation of n choose k. Both n and k have to be
     * positive integers, otherwise -1 is returned.
     * @param  {Integer} n Total amount to choose from
     * @param  {Integer} k How many to choose
     * @return {Integer}   Returns how many possible combinations can be drawn disregarding order drawn
     */
    function choose (n, k) {
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
    function combinationCount (combinations) {
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
     * @returns {*|Array}
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
     * @returns {*}
     */
        function targetCombinations (targetCards, activeCombo=[]) {
            if (targetCards.length === 0) {
                return [activeCombo];  // Not entirely sure why I need to wrap this
            }
            const [card, ...cardsLeft] = targetCards;
            return [...helpers.rangeInclusive(card.needed, card.total).reduce( (results, currentNeeded) => {
                return [...results, ...targetCombinations(cardsLeft, [...activeCombo, [card.total, currentNeeded]])];
            }, [])];
        }
    /**
     *
     * @param cards {Array}     Array containing Objects with information about target cards (amount, needed)
     * @param draws {Number}    Amount of draws
     * @returns {number}        Chance to draw desired hand
     */
    this.calculate = function(cards, draws) {
        const validTargetCombinations = targetCombinations(cards),
            allValidCombinations = fillCombinations(validTargetCombinations, draws);
        return combinationCount(allValidCombinations) / choose(DECK_SIZE, draws);
    };
}).apply(chance);
/**
 * simulation namespace calculates probability by simulating many hands drawn and looking at the number of desired hands
 * found in relation to all hands drawn. It also simulates intelligent mulligans which is its only advantage over
 * chance namespace solution.
 */
let simulation = {};
(function() {
    "use strict";
    const DECK_SIZE = 30;
    /**
     * In place swaps values of i and j indexes in array.
     * @param  {Array} a [description]
     * @param  {int} i index 1
     * @param  {int} j index 2
     */
    function swap(a, i, j) {
        let temp = a[i - 1];
        a[i - 1] = a[j];
        a[j] = temp;
    }
    /**
     * Shuffles array in place. https://stackoverflow.com/a/6274381
     * @param {Array} a Array to be shuffled.
     * @return {Array}  returns shuffled array
     */
    function shuffle(a) {
        for (let i = a.length; i > 0; i--) {
            let j = Math.floor(Math.random() * i);
            swap(a, i, j);
        }
        return a;
    }
    /**
     * Creates an array of integers representing the deck. Cards of no interest are added as -1, target cards
     * are added with value contained in card Object in targetCards array.
     * @param  {Array} targetCards Array containing card Objects
     * @return {Array}          Returns array representing the populated deck.
     */
    function createDeck(targetCards) {
        let deck = new Array(30).fill(-1),
            currIndex = 0;
        targetCards.forEach((card) => {
            deck.fill(card.value, currIndex, currIndex + card.total);
            currIndex += card.total;
        });
        return deck;
    }
    /**
     * Checks if deck contains card in the needed amount.
     * @param  {Array} deck  Deck represented as integer array
     * @param  {Object} card Sought after card object
     * @return {boolean}      True if deck contains card.value atleast card.needed amount of times
     */
    function contains(deck, card) {
        // Edge case if card.needed is 0
        if (card.needed <= 0) {
            return true;
        }
        let found = 0;
        for(let i = 0; i < deck.length; i++) {
            if (deck[i] === card.value) {
                found++;
                if (found >= card.needed) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Throws excessive target cards. For example if active hand has two cards of value "0" but only one is needed, one
     * will be mulliganed. This seems to be an edge case and it doesn't seem to affect accuracy very much at all.
     * @param activeHand
     * @param targetCards
     * @returns {Array} Array representing active hand after mulligans
     */
    function mulliganExcessiveCards(activeHand, targetCards) {
        let cardsFound = {},
            cardsThrowable = {},
            activeHandMulled = activeHand.slice(0);
        targetCards.forEach((card) => cardsFound[card.value] = 0);
        activeHandMulled.forEach((card) => cardsFound[card] += 1 );
        targetCards.forEach((card) => cardsThrowable[card.value] = cardsFound[card.value] - card.needed);
        for(let i = activeHandMulled.length - 1; i >= 0 ; i--) {
            let currentCard = activeHandMulled[i];
            for(let j = 0; j < targetCards.length; j++) {
                let cardValue = targetCards[j].value;
                if(cardsThrowable[cardValue] <= 0 || cardValue !== currentCard) {
                    break;
                }
                else {  // Values match and card is throwable (excessive card)
                    activeHandMulled.pop();
                    cardsThrowable[cardValue] = cardsThrowable[cardValue] - 1;
                }
            }
        }
        return activeHandMulled;
    }
    /**
     * Throws away all non target cards in starting hand.
     * @param  {Array} deck           Deck represented as integer array
     * @param  {Array} targetCards    Array containing desired cards with information
     * @param  {Boolean} smartMulligan  use smart mulligans in simulation if true
     * @return {Array}                An array where the first object is active hand and second is active deck
     */
    function mulligan(deck, targetCards) {
        let activeHand = deck.slice(0, 3),
            activeDeck = deck.slice(3);
        // Mulligan all non target cards.
        activeHand = activeHand.filter((val) => val >= 0);
        // Mulligan excessive target cards.
        activeHand = mulliganExcessiveCards(activeHand, targetCards);
        let mulliganCount = 3 - activeHand.length;
        /* Put mulliganed cards back in deck. All mulliganed cards are of no interest (-1) even if they are target cards (excessive)
         If speed is highly valued, instead of shuffling, the cards can be put back at random indexes instead of shuffling */
        for(let i = 0; i < mulliganCount; i++) {
            activeDeck.push(-1);
            swap(activeDeck, activeDeck.length -1, helpers.getRandomIntInclusive(0, activeDeck.length));
        }
        // Draw up to three cards again
        activeHand = activeHand.concat(activeDeck.slice(0, mulliganCount));
        // Remove drawn cards from deck
        activeDeck = activeDeck.slice(mulliganCount);
        return [activeHand, activeDeck];
    }
    /**
     * Shuffles deck, performs mulligan, shuffles again, draws remaining cards and checks if all cards are represented
     * at least the needed amount of times.
     * @param  {Array} deck     Deck represented as integer array
     * @param  {Array} targetCards     Array containing desired cards with information
     * @param  {Number} drawAmount amount of cards drawn
     * @param  {Boolean} smartMulligan  use smart mulligans in simulation if true
     * @return {boolean}          Returns true if drawn cards contain required cards.
     */
    function trial(deck, targetCards, drawAmount) {
        let activeDeck = shuffle(deck),
            activeHand = [],
            drawsLeft = drawAmount;
        [activeHand, activeDeck] = mulligan(activeDeck, targetCards);
        drawsLeft -= 3;  // Account for starting hand drawn.
        activeHand = activeHand.concat(activeDeck.slice(0, drawsLeft));
        // Return true if every needed card is contained in drawn cards
        return targetCards.every((card) => contains(activeHand, card));
    }
    /**
     * Simulates several separate instances of decks with
     * drawAmount of draws and checks if required cards are contained in hand.
     * @param  {Array} deck     Deck represented as integer array
     * @param  {Array} targetCards     Array containing desired cards with information
     * @param  {Number} drawAmount amount of cards drawn
     * @param  {Number} precision  How many times simulation should be run
     * @param  {Boolean} smartMulligan  use smart mulligans in simulation if true
     * @return {Number}            ratio of successful draws to total draws
     */
    function simulate(deck, targetCards, drawAmount, precision=200000) {
        let totalTries = precision,
            success = 0;
        for (let i = 0; i < totalTries; i++) {
            if(trial(deck, targetCards, drawAmount))
                success++;
        }
        return success / totalTries;
    }
    /**
     * Creates a deck and simulates draws.
     * @param  {Array} targetCards     Array containing objects with target cards information
     * @param  {int}  drawAmount          Amount of cards to draw to hand
     * @param  {Number} precision       How many times simulation should be run
     * @param  {Boolean} [smartMulligan=false]  If true will use more time consuming intelligent mulligan
     * @return {Number}                      Returns the ratio of desired hands to all hands
     */
    this.run = function(targetCards, drawAmount) {
        let deck = createDeck(targetCards);
        return simulate(deck, targetCards, drawAmount);
    };
    this.getDeckSize = function() {
        return DECK_SIZE;
    };
}).apply(simulation);
exports.ping = ping;
exports.pingSim = pingSimulation;