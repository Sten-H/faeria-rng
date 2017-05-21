/*jshint esversion: 6 */
var chance = {}; // chance namespace handles probability calculation
var main = {}; // main namespace handles presentation
(function(context) {
    "use strict";

    this.factorial = function(num) {
        if (num < 0)
            return -1;
        else if (num === 0)
            return 1;
        else {
            return (num * factorial(num - 1));
        }
    };
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
     * Calculates the chance to draw atleast 1 of the target cards.
     * @param  {Integer} targetCardAmount How many of the target card the deck contains
     * @param  {Integer} drawAmount       How many cards to draw
     * @param  {Integer} [deckSize=30]    Deck size, default is 30
     * @return {Number}                  Chance in percent
     */
    this.chanceToDraw = function(cardInfo, drawAmount, deckSize) {
        console.log("decksize: " + deckSize);
        var nominator = 1;
        var drawn = 0;
        $.each(cardInfo, function(index, card) {
            console.log("(" + card.amount +" choose " +card.needed +")");
            nominator = nominator * choose(card.amount, card.needed);
            drawn += card.needed;
        });
        console.log("(" + (deckSize - drawn) +" choose " + (drawAmount - drawn) + ")");
        nominator = nominator * choose(deckSize - drawn, drawAmount - drawn);
        var chance = nominator / choose(deckSize, drawAmount);
        return chance;
    };
}).apply(chance);
