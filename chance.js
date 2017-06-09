/*jshint esversion: 6 */
/**
 * The chance namespace handles all probability calculation.
 * public methods:
 * chanceToDraw, getDeckSize
 */
var chance = {};
(function(context) {
    "use strict";
    var DECK_SIZE = 30;
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
        var totalAmount = cardInfo.reduce((sum, card) => { return sum + card.amount; }, 0);
        var totalNeeded = cardInfo.reduce((sum, card) => { return sum + card.needed; }, 0);  // Might be unneeded
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
