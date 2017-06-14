(function() {
    const DECK_SIZE = 30;
    "use strict";
    // Creates a string representing n choose k
    function cStr(n, k) {
        return `(${n} choose ${k})`;
    }
    // In this example there are two target cards, both have a total of three instances in deck and we need to draw
    // atleast 2 of both target cards in 10 draws
    let draws = 10,
        cards = [ {amount: 3, needed: 2}, {amount: 3, needed: 2}],  // This could contain any number of cards
        targetCardsInDeck = cards.reduce((acc, card) => acc + card.amount, 0),
        nonTargetCardsInDeck = DECK_SIZE - targetCardsInDeck;
    // For every valid n choose k value of a target card it needs to be multiplied by every valid n choose k of all
    // other target cards and then finally multiplied by (nonTargetCardsInDeck choose remainingDraws)
    // TODO generate below output string programmatically
    console.log("Expected output: ");
    console.log( "(" +
        cStr(3, 2) + cStr(3,2) + cStr(nonTargetCardsInDeck, draws - (2 + 2)) + "+ \n" +
        cStr(3, 2) + cStr(3,3) + cStr(nonTargetCardsInDeck, draws - (2 + 3)) + "+ \n" +
        cStr(3, 3) + cStr(3,2) + cStr(nonTargetCardsInDeck, draws - (3 + 2)) + "+ \n" +
        cStr(3, 3) + cStr(3,3) + cStr(nonTargetCardsInDeck, draws - (3 + 3)) + ") \n" +
        " / " + cStr(DECK_SIZE, draws));
    // When above output string is pasted in to wolfram alpha it gives 0.04916 which is correct
})();