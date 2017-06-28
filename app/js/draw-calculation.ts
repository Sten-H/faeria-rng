"use strict";
import * as helpers from "./helpers";

export const DECK_SIZE = 30;
export type CardInfo = { needed: number, total: number, value: number};
/**
 * Calculation namespace calculates probability to draw desired cards using combinatorics. Its disadvantage is that
 * it does not account for starting hand mulligans but is much faster that simulation.
 */
namespace Calculation {
    type Card = { drawn: number, total: number};
    type Combination = Array<Card>;
    /**
     * Recursive implementation of n choose k.
     * @param  {int} n Total amount to choose from
     * @param  {int} k How many to choose
     * @return {int}   Returns how many possible combinations can be drawn disregarding order drawn
     */
    function choose(n: number, k: number): number {
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
    function combinationCount(combinations: Array<Combination>): number {
        return combinations.reduce((sum, combo) => {
            const comboProduct: number = combo.reduce((product, card) => {
                return product * choose(card.total, card.drawn);
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
    function fillCombinations(targetCombinations: Array<Combination>, draws: number): Array<Combination> {
        const nonTargetAmount: number = DECK_SIZE - targetCombinations[0].reduce((acc, card) => {
                return acc + card.total;
            }, 0);
        // Add the remaining draws (after combination has been drawn) from non target cards
        return targetCombinations.map((combo) => {
            const drawn: number = combo.reduce((drawAcc, card) => drawAcc + card.drawn, 0),
                drawsLeft: number = Math.max(draws - drawn, 0);
            return combo.concat({total: nonTargetAmount, drawn: drawsLeft})
        });
    }

    /**
     * Creates all valid combination of target card draws. Draws only from target cards, the deck is not considered.
     * Every valid card draw is represented as an array with two values [total, drawn], for a targetCard {needed: 2, amount: 3}
     * two array will be created since there are tvo valid combinations of that card (drawn = 2 and drawn = 3),
     * each separate combination of a card will then be combined with all other cards valid combinations to create
     * all valid combinations of target card draws.
     * @param targetCards {CardInfo}
     * @param activeCombo {Combination}
     * @returns {Array<Combination>}
     */
    function targetCombinations(targetCards: Array<CardInfo>, activeCombo: Combination = []): Array<Combination> {
        if (targetCards.length === 0) {
            return [activeCombo];  // Not entirely sure why I need to wrap this
        }
        const [card, ...cardsLeft] = targetCards;
        return helpers.rangeInclusive(card.needed, card.total).reduce((results, currentNeeded) => {
            return results.concat(targetCombinations(cardsLeft, activeCombo.concat({total: card.total, drawn: currentNeeded})));
        }, []);
    }
    /**
     *
     * @param cards {Array<CardInfo>}     Array containing Objects with information about target cards (amount, needed)
     * @param draws {number}    Amount of draws
     * @returns {number}        Chance to draw desired hand
     */
    export function calculate(cards: Array<CardInfo>, draws: number): number {
        const validTargetCombinations = targetCombinations(cards),
            allValidCombinations = fillCombinations(validTargetCombinations, draws);
        return combinationCount(allValidCombinations) / choose(DECK_SIZE, draws);
    }
}

/**
 * Simulation namespace calculates draw probability by simulating many hands drawn and looking at the number of desired hands
 * found in relation to all hands drawn. It also simulates intelligent mulligans which is its only advantage over
 * Calculation namespace solution.
 */
namespace Simulation {
    /**
     * In place swaps values of i and j indexes in array.
     * @param  {Array} a [description]
     * @param  {int} i index 1
     * @param  {int} j index 2
     */
    function swap(a: Array<any>, i: number, j: number): void {
        let temp = a[i - 1];
        a[i - 1] = a[j];
        a[j] = temp;
    }
    /**
     * Shuffles array in place. https://stackoverflow.com/a/6274381
     * @param {Array} a Array to be shuffled.
     * @return {Array}  returns shuffled array
     */
    function shuffle(a: Array<any>): Array<any> {
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
    function createDeck(targetCards: Array<CardInfo>): Array<number> {
        let deck: Array<number> = Array(30).fill(-1),
            currIndex: number = 0;
        targetCards.forEach((card) => {
            deck.fill(card.value, currIndex, currIndex + card.total);
            currIndex += card.total;
        });
        return deck;
    }
    /**
     * Checks if deck contains card in the needed amount.
     * @param  {Array} deck  Deck represented as integer array
     * @param  {CardInfo} card Sought after card object
     * @return {boolean}      True if deck contains card.value atleast card.needed amount of times
     */
    function contains(deck: Array<number>, card: CardInfo): boolean {
        if (card.needed <= 0) {
            return true;
        }
        return deck.reduce((acc, cardVal) => (cardVal === card.value) ? acc + 1 : acc, 0) >= card.needed;
    }

    /**
     * Throws excessive target cards. For example if active hand has two cards of value "0" but only one is needed, one
     * will be mulliganed. This seems to be an edge case and it doesn't seem to affect accuracy very much at all.
     * @param activeHand
     * @param targetCards
     * @returns {Array} Array representing active hand after mulligans
     */
    function mulliganExcessiveCards(activeHand: Array<number>, targetCards: Array<CardInfo>): Array<number> {
        let cardsFound: Map<number, number> = new Map(),
            cardsThrowable: Map<number, number> = new Map(),
            activeHandMulled: Array<number> = activeHand.slice(0);
        targetCards.forEach((card) => cardsFound.set(card.value, 0));
        activeHandMulled.forEach((card) => cardsFound.set(card, cardsFound.get(card) + 1 ));
        targetCards.forEach((card) => cardsThrowable.set(card.value, cardsFound.get(card.value) - card.needed));
        for(let i = activeHandMulled.length - 1; i >= 0 ; i--) {
            let currentCard = activeHandMulled[i];
            for(let j = 0; j < targetCards.length; j++) {
                let cardValue = targetCards[j].value;
                if(cardsThrowable.get(cardValue) <= 0 || cardValue !== currentCard) {
                    break;
                }
                else {  // Values match and card is throwable (excessive card)
                    activeHandMulled.pop();
                    cardsThrowable.set(cardValue, cardsThrowable.get(cardValue) - 1);
                }
            }
        }
        return activeHandMulled;
    }
    /**
     * Throws away all non target cards in starting hand.
     * @param  {Array} deck           Deck represented as integer array
     * @param  {Array} targetCards    Array containing desired cards with information
     * @param  {Boolean} smartMulligan  use smart mulligans in drawSimulation if true
     * @return {Array}                An array where the first object is active hand and second is active deck
     */
    function mulligan(deck: Array<number>, targetCards: Array<CardInfo>): Array<Array<number>> {
        let activeHand: Array<number> = deck.slice(0, 3),
            activeDeck: Array<number> = deck.slice(3);
        // Mulligan all non target cards.
        activeHand = activeHand.filter((val) => val >= 0);
        // Mulligan excessive target cards.
        activeHand = mulliganExcessiveCards(activeHand, targetCards);
        let mulliganCount: number = 3 - activeHand.length;
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
     * @return {boolean}          Returns true if drawn cards contain required cards.
     */
    function trial(deck: Array<number>, targetCards: Array<CardInfo>, drawAmount: number): boolean {
        let activeDeck: Array<number> = shuffle(deck),
            activeHand: Array<number> = [],
            drawsLeft: number= drawAmount;
        [activeHand, activeDeck] = mulligan(activeDeck, targetCards);
        drawsLeft -= activeHand.length;  // Account for starting hand drawn.
        activeHand = activeHand.concat(activeDeck.slice(0, drawsLeft));
        // Return true if every needed card is contained in drawn cards
        return targetCards.every((card) => contains(activeHand, card));
    }
    /**
     * Simulates several separate instances of decks with
     * drawAmount of draws and checks if required cards are contained in hand.
     * @param  {Array} deck     Deck represented as integer array
     * @param  {Array} targetCards     Array containing desired cards with information
     * @param  {number} drawAmount amount of cards drawn
     * @param  {number} precision  How many times drawSimulation should be run
     * @return {number}            ratio of successful draws to total draws
     */
    function simulate(deck: Array<number>, targetCards: Array<CardInfo>, drawAmount: number, precision: number=200000): number {
        let totalTries: number = precision,
            success: number = 0;
        for (let i = 0; i < totalTries; i++) {
            if(trial(deck, targetCards, drawAmount))
                success++;
        }
        return success / totalTries;
    }
    /**
     * Creates a deck and simulates draws.
     * @param  {Array} targetCards        Array containing objects with target cards information
     * @param  {int}  drawAmount          Amount of cards to draw to hand
     * @return {number}                   Returns the ratio of desired hands to all hands
     */
    export function run(targetCards: Array<CardInfo>, drawAmount: number): number {
        let deck: Array<number> = createDeck(targetCards);
        return simulate(deck, targetCards, drawAmount);
    }
}

export const runSimulation = Simulation.run;
export const runCalculation = Calculation.calculate;