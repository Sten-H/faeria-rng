/*jshint esversion: 6 */
var DECK_SIZE = 30;
/**
 * The chance namespace handles all probability calculation.
 * public methods:
 * chanceToDraw, getDeckSize
 */
var chance = {};
(function(context) {
    "use strict";
    /**
     * Recursive implementation of n choose k. Both n and k have to be
     * positive integers, otherwise -1 is returned.
     * @param  {Integer} n Total amount to choose from
     * @param  {Integer} k How many to choose
     * @return {Integer}   Returns how many possible combinations can be drawn disregarding order drawn
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
     * Calculates the chance to draw atleast 1 of the target cards.
     * @param  {Array} cardInfo Array containing maps of {amount: x, needed: y} maps
     * @param  {Integer} drawAmount       How many cards to draw
     * @param  {Integer} [deckSize]    Deck size, default is DECK_SIZE
     * @return {Number}                  Chance in percent
     */
    this.chanceToDraw = function(cardInfo, drawAmount, deckSize = DECK_SIZE) {
        var nominator = 0;
        var totalAmount = cardInfo.reduce((sum, card) => sum + card.amount, 0);
        var totalNeeded = cardInfo.reduce((sum, card) => sum + card.needed, 0); // Might be unneeded
        console.log(totalAmount);
        cardInfo.forEach(function(card, index) {
            console.log("index" + index);
            for (var currNeeded = card.needed; currNeeded <= 3; currNeeded++) {
                console.log("(" + card.amount + " choose " + currNeeded + ")");
                console.log(choose(card.amount, currNeeded));
                // I'm not entirely sure if deckSize - totalAmount is correct in all situations.
                nominator += (choose(card.amount, currNeeded) * (choose(deckSize - totalAmount, drawAmount - currNeeded)));
            }
        });
        var chance = nominator / choose(deckSize, drawAmount);
        return chance;
    };
    this.getDeckSize = function() {
        return DECK_SIZE;
    };
}).apply(chance);

var monteCarlo = {};
(function(context) {
    /**
     * Shuffles array in place. https://stackoverflow.com/a/6274381
     * @param {Array} a items The array containing the items.
     */
    function shuffle(a) {
        for (let i = a.length; i; i--) {
            let j = Math.floor(Math.random() * i);
            [a[i - 1], a[j]] = [a[j], a[i - 1]];
        }
    }
    /**
     * Returns deck with sought after cards in it. Each card value is entered in
     * to deck array as many times as there should be instances of it.
     * @param  {Array} deck     Deck represented as integer array
     * @param  {Array} cardInfo Array containing Card objects
     * @return {Array}          Returns array representing the populated deck.
     */
    function populateDeck(deck, cardInfo) {
        currIndex = 0;
        var d = deck.slice(0);
        cardInfo.forEach((card, index) => {
            d.fill(card.value, currIndex, currIndex + card.amount);
            currIndex += card.amount;
        });
        return d;
    }
    /**
     * Checks if deck contains card in the needed amount.
     * @param  {Array} deck  Deck represented as integer array
     * @param  {Object} card Sought after card
     * @return {boolean}      True if deck contains card.value atleast card.needed times
     */
    function contains(deck, card) {
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
     * @param  {Array} cardInfo Array containing Card objects
     * @return {boolean}          Returns true if drawn cards contain requried cards.
     */
    function trial(deck, cardInfo, drawAmount) {
        var activeDeck = deck.slice(0);
        shuffle(activeDeck);
        // Draw cards and filter out all uninteresting cards (-1 value)
        activeDeck = activeDeck.slice(0, drawAmount).filter((val) => val >= 0);
        return cardInfo.every((card) => contains(activeDeck, card));
    }
    this.simulate = function(cardInfo, drawAmount, deckSize = DECK_SIZE) {
        // Create and populate deck
        var deck = Array(30).fill(-1);
        deck = populateDeck(deck, cardInfo);
        var totalTries = 700000,
            success = 0;
        for (var i = 0; i < totalTries; i++) {
            if(trial(deck, cardInfo, drawAmount))
                success++;
        }
        return success / totalTries;
    };
}).apply(monteCarlo);
