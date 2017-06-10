/*jshint esversion: 6 */
var monteCarlo = {};
(function(context) {
    var DECK_SIZE = 30;
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
     * @param {Array} a items The array containing the items.
     */
    function shuffle(a) {
        for (let i = a.length; i > 0; i--) {
            let j = Math.floor(Math.random() * i);
            swap(a, i, j);
        }
    }
    /**
     * Returns deck with sought after cards in it. Each card value is entered in
     * to deck array as many times as there should be instances of it, all
     * card of no interest are assigned value -1
     * @param  {Array} deck     Deck represented as integer array
     * @param  {Array} targetCards Array containing Card objects
     * @return {Array}          Returns array representing the populated deck.
     */
    function createDeck(targetCards) {
        var d = Array(30).fill(-1);
        currIndex = 0;
        targetCards.forEach((card, index) => {
            d.fill(card.value, currIndex, currIndex + card.amount);
            currIndex += card.amount;
        });
        return d;
    }
    /**
     * Checks if deck contains card in the needed amount.
     * @param  {Array} deck  Deck represented as integer array
     * @param  {Object} card Sought after card object
     * @return {boolean}      True if deck contains card.value atleast card.needed times
     */
    function contains(deck, card) {
        // Edge case if card.needed is 0
        if (card.needed <= 0) {
            return true;
        }
        found = 0;
        for(var i = 0; i < deck.length; i++) {
            if (deck[i] == card.value) {
                found++;
                if (found >= card.needed) {
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * Shuffles deck and checks if all cards are represented atleast the
     * needed amount of times.
     * @param  {Array} deck     Deck represented as integer array
     * @param  {Array} targetCards Array containing Card objects
     * @return {boolean}          Returns true if drawn cards contain requried cards.
     */
    function trial(deck, targetCards, drawAmount) {
        // TODO optionally include mulligan
        shuffle(deck);
        // var drawnCards = deck.slice(0, drawAmount).filter((val) => val >= 0 );  // filtering out irrelevant cards is slower.
        var drawnCards = deck.slice(0, drawAmount);  // Draw cards
        // Return true if every needed card is contained in drawn cards
        return targetCards.every((card) => contains(drawnCards, card));
    }
    /**
     * Simulates several hundred thousand separate instances of decks with
     * drawAmount of draws and checks if requried cards are contained in hand.
     * @param  {Array} deck     Deck represented as integer array
     * @param  {Array} targetCards Array containing Card objects
     * @param  {int} drawAmount amount of cards drawn
     * @return {Number}            ratio of successful draws to total draws
     */
    function simulate(deck, targetCards, drawAmount) {
        var totalTries = 300000,
            success = 0;
        for (var i = 0; i < totalTries; i++) {
            if(trial(deck, targetCards, drawAmount))
                success++;
        }
        return success / totalTries;
    }
    this.run = function(targetCards, drawAmount, deckSize = DECK_SIZE) {
        var deck = createDeck(targetCards);
        return simulate(deck, targetCards, drawAmount);
    };
    this.getDeckSize = function() {
        return DECK_SIZE;
    };
}).apply(monteCarlo);
