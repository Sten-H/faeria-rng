/*jshint esversion: 6 */
let monteCarlo = {};
(function() {
    "use strict";
    const DECK_SIZE = 30;
    this.getRandomInt = function(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    };
    this.getRandomIntInclusive = function (min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };
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
            deck.fill(card.value, currIndex, currIndex + card.amount);
            currIndex += card.amount;
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
    function mulligan(deck, targetCards, smartMulligan) {
        let activeHand = deck.slice(0, 3),
            activeDeck = deck.slice(3);
        // Mulligan all non target cards.
        activeHand = activeHand.filter((val) => val >= 0);
        // Mulligan excessive target cards.
        if(smartMulligan)
            activeHand = mulliganExcessiveCards(activeHand, targetCards);
        let mulliganCount = 3 - activeHand.length;
        /* Put mulliganed cards back in deck. All mulliganed cards are of no interest (-1) even if they are target cards (excessive)
         If speed is highly valued, instead of shuffling, the cards can be put back at random indexes instead of shuffling */
        for(let i = 0; i < mulliganCount; i++) {
            activeDeck.push(-1);
            swap(activeDeck, activeDeck.length -1, monteCarlo.getRandomIntInclusive(0, activeDeck.length));
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
    function trial(deck, targetCards, drawAmount, smartMulligan) {
        let activeDeck = shuffle(deck),
            activeHand = [],
            drawsLeft = drawAmount;
        [activeHand, activeDeck] = mulligan(activeDeck, targetCards, smartMulligan);
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
    function simulate(deck, targetCards, drawAmount, precision, smartMulligan) {
        let totalTries = precision,
            success = 0;
        for (let i = 0; i < totalTries; i++) {
            if(trial(deck, targetCards, drawAmount, smartMulligan))
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
    this.run = function(targetCards, drawAmount, precision, smartMulligan=false) {
        let deck = createDeck(targetCards);
        return simulate(deck, targetCards, drawAmount, precision, smartMulligan);
    };
    this.getDeckSize = function() {
        return DECK_SIZE;
    };
}).apply(monteCarlo);
