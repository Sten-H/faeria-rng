(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/home/lax/devel/faeria/app/js/draw-calculation.ts":[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var helpers_1 = require("./helpers");
exports.DECK_SIZE = 30;
/**
 * Calculation namespace calculates probability to draw desired cards using combinatorics. Its disadvantage is that
 * it does not account for starting hand mulligans but is much faster that simulation.
 */
var Calculation;
(function (Calculation) {
    /**
     * Recursive implementation of n choose k.
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
        }
        else {
            return (n * choose(n - 1, k - 1)) / k;
        }
    }
    /**
     * Returns the number of combinations the cards can make. FIXME explain better.
     * @param combinations
     * @returns {*}
     */
    function combinationCount(combinations) {
        return combinations.reduce(function (sum, combo) {
            var comboProduct = combo.reduce(function (product, card) {
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
    function fillCombinations(targetCombinations, draws) {
        var nonTargetAmount = exports.DECK_SIZE - targetCombinations[0].reduce(function (acc, card) {
            return acc + card.total;
        }, 0);
        // Add the remaining draws (after combination has been drawn) from non target cards
        return targetCombinations.map(function (combo) {
            var drawn = combo.reduce(function (drawAcc, card) { return drawAcc + card.drawn; }, 0), drawsLeft = Math.max(draws - drawn, 0);
            return combo.concat({ total: nonTargetAmount, drawn: drawsLeft });
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
    function targetCombinations(targetCards, activeCombo) {
        if (activeCombo === void 0) { activeCombo = []; }
        if (targetCards.length === 0) {
            return [activeCombo]; // Not entirely sure why I need to wrap this
        }
        var card = targetCards[0], cardsLeft = targetCards.slice(1);
        return helpers_1.Helpers.rangeInclusive(card.needed, card.total).reduce(function (results, currentNeeded) {
            return results.concat(targetCombinations(cardsLeft, activeCombo.concat({ total: card.total, drawn: currentNeeded })));
        }, []);
    }
    /**
     *
     * @param cards {Array<CardInfo>}     Array containing Objects with information about target cards (amount, needed)
     * @param draws {number}    Amount of draws
     * @returns {number}        Chance to draw desired hand
     */
    function calculate(cards, draws) {
        var validTargetCombinations = targetCombinations(cards), allValidCombinations = fillCombinations(validTargetCombinations, draws);
        return combinationCount(allValidCombinations) / choose(exports.DECK_SIZE, draws);
    }
    Calculation.calculate = calculate;
})(Calculation || (Calculation = {}));
/**
 * Simulation namespace calculates draw probability by simulating many hands drawn and looking at the number of desired hands
 * found in relation to all hands drawn. It also simulates intelligent mulligans which is its only advantage over
 * Calculation namespace solution.
 */
var Simulation;
(function (Simulation) {
    /**
     * In place swaps values of i and j indexes in array.
     * @param  {Array} a [description]
     * @param  {int} i index 1
     * @param  {int} j index 2
     */
    function swap(a, i, j) {
        var temp = a[i - 1];
        a[i - 1] = a[j];
        a[j] = temp;
    }
    /**
     * Shuffles array in place. https://stackoverflow.com/a/6274381
     * @param {Array} a Array to be shuffled.
     * @return {Array}  returns shuffled array
     */
    function shuffle(a) {
        for (var i = a.length; i > 0; i--) {
            var j = Math.floor(Math.random() * i);
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
        var targets = targetCards.map(function (card) { return Array(card.total).fill(card.value); }), nonTargets = Array(30).fill(-1);
        return [].concat.apply([], targets.concat([nonTargets])).slice(0, 30);
    }
    /**
     * Checks if deck contains card in the needed amount.
     * @param  {Array} deck  Deck represented as integer array
     * @param  {CardInfo} card Sought after card object
     * @return {boolean}      True if deck contains card.value atleast card.needed amount of times
     */
    function contains(deck, card) {
        if (card.needed <= 0) {
            return true;
        }
        return deck.reduce(function (acc, cardVal) {
            return (cardVal === card.value) ? acc + 1 : acc;
        }, 0) >= card.needed;
    }
    /**
     * Throws away all non target cards in starting hand.
     * @param  {Array} deck           Deck represented as integer array
     * @param  {Array} targetCards    Array containing desired cards with information
     * @param  {Boolean} smartMulligan  use smart mulligans in drawSimulation if true
     * @return {Array}                An array where the first object is active hand and second is active deck
     */
    function mulligan(deck) {
        var startingHand = deck.slice(0, 3), activeDeck = deck.slice(3), handAfterMulligan = startingHand.filter(function (val) { return val >= 0; }), mulliganCount = 3 - handAfterMulligan.length;
        /* Put mulliganed cards back in deck. All mulliganed cards are of no interest (-1) */
        for (var i = 0; i < mulliganCount; i++) {
            activeDeck.push(-1);
            swap(activeDeck, activeDeck.length - 1, helpers_1.Helpers.getRandomIntInclusive(0, activeDeck.length));
        }
        return [handAfterMulligan, activeDeck];
    }
    /**
     * Shuffles deck, performs mulligan, shuffles again, draws remaining cards and checks if all cards are represented
     * at least the needed amount of times.
     * @param  {Array} deck     Deck represented as integer array
     * @param  {Array} targetCards     Array containing desired cards with information
     * @param  {Number} drawAmount amount of cards drawn
     * @return {boolean}          Returns true if drawn cards contain required cards.
     */
    function trial(deck, targetCards, drawAmount) {
        var activeDeck = shuffle(deck), _a = mulligan(activeDeck), handAfterMulligan = _a[0], deckAfterMulligan = _a[1], remainingDraws = 3 - handAfterMulligan.length, // 3 is starting hand size before mulligan
        handAfterDraws = handAfterMulligan.concat(deckAfterMulligan.slice(0, remainingDraws));
        // Return true if every needed card is contained in drawn cards
        return targetCards.every(function (card) { return contains(handAfterDraws, card); });
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
    function simulate(deck, targetCards, drawAmount, precision) {
        if (precision === void 0) { precision = 200000; }
        var totalTries = precision, success = 0;
        for (var i = 0; i < totalTries; i++) {
            if (trial(deck, targetCards, drawAmount))
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
    function run(targetCards, drawAmount) {
        var deck = createDeck(targetCards);
        return simulate(deck, targetCards, drawAmount);
    }
    Simulation.run = run;
})(Simulation || (Simulation = {}));
exports.runSimulation = Simulation.run;
exports.runCalculation = Calculation.calculate;

},{"./helpers":"/home/lax/devel/faeria/app/js/helpers.ts"}],"/home/lax/devel/faeria/app/js/draw-main.ts":[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var $ = require("jquery");
var helpers_1 = require("./helpers");
var Draw = require("./draw-calculation");
var base = $("#base"); // base template for cards
/**
 * Creates effects on screen based on the amount of bad luck player
 * has painfully endured. A high c will create larger effects.
 * @param  {int} c the number of desired hands
 */
function resultScreenEffects(c) {
    helpers_1.UI.shakeScreen(c);
}
/**
 * Display error text if user input is incorrect
 */
function displayError(msg) {
    $("#error-message").html(msg);
    $("#error-wrapper").show();
    $("#results-wrapper").hide();
}
/**
 * Collects user card related input and represents each card as an object with
 * needed, amount, value, foundAmount variables. Card objects are returned in an array.
 * @return {Array<CardInfo>} Array of Objects representing each target card
 */
function getCardInput() {
    var inputs = $.makeArray($(".draw").not("#base"));
    return inputs.map(function (val, index) {
        var input = $(val);
        return {
            needed: Number(input.find(".card-need").val()),
            total: Number(input.find(".card-deck").val()),
            value: index
        };
    });
}
/**
 * Checks all user entered input. Returns an object containing validity and optionally
 * a message to explain what is not valid.
 * @param  {int}  drawAmount    User entered card draw value
 * @param {Array<CardInfo>}    cardInputs    array of objects containing each card input.
 * @return {Object}             Object containing validity and msg values
 */
function isInputValid(drawAmount, cardInputs) {
    var totalAmount = cardInputs.reduce(function (acc, input) { return acc + Number(input.total); }, 0);
    // User supposes a larger deck than is possible
    if (totalAmount > Draw.DECK_SIZE) {
        return { val: false,
            msg: $("<span>").append("Target card ", helpers_1.UI.highlightWrap("amounts"), " sum exceeds deck size") };
    }
    var totalNeeded = cardInputs.reduce(function (acc, input) { return acc + Number(input.needed); }, 0);
    // User needs more cards than there are draws, will always fail.
    if (totalNeeded > drawAmount) {
        return { val: false,
            msg: $("<span>").append("Fewer ", helpers_1.UI.highlightWrap("draws "), "than ", helpers_1.UI.highlightWrap("needed"), " cards") };
    }
    var validNeeded = cardInputs.every(function (input) { return Number(input.total) >= Number(input.needed); });
    // One or more needed values exceeds its amount in deck
    if (!validNeeded) {
        return { val: false, msg: $("<span>").append(helpers_1.UI.highlightWrap("Needed"), " cannot be larger than card ", helpers_1.UI.highlightWrap("amount"), " in deck") };
    }
    return { val: true, msg: $("") };
}
/**
 * Disables calculate button and shows a spinning load icon
 */
function addLoadingIndicator() {
    $("#calculate-btn").addClass("disabled");
    $("#chance-text-number").html("---");
    $("#error-wrapper").hide();
    $("#results-wrapper").show();
    $("#calculate-btn span").show();
}
/**
 * Removes effects shown while loading
 */
function cleanupLoadIndicator() {
    $("#calculate-btn span").hide();
    $("#calculate-btn").removeClass("disabled");
}
/**
 * Validates user input and runs drawSimulation if input is valid.
 */
function run() {
    var smartMulligan = $("#mulligan-checkbox").is(':checked'), drawAmount = Number($(".draw-amount").val()), cardInfo = getCardInput(), validity = isInputValid(drawAmount, cardInfo);
    if (validity.val) {
        var func = (smartMulligan) ? Draw.runSimulation : Draw.runCalculation, promise = helpers_1.Helpers.timeFunction(func, cardInfo, drawAmount);
        promise.then(function (_a) {
            var t = _a.t, results = _a.results;
            cleanupLoadIndicator();
            helpers_1.UI.updateResults((t / 1000).toFixed(3), results);
            resultScreenEffects(results);
        });
    }
    else {
        cleanupLoadIndicator();
        displayError(validity.msg);
    }
    $("#faq-wrapper").collapse('hide');
}
function init() {
    // Add initial target card input
    helpers_1.UI.addCard(base);
    // Add button listeners
    $("#add-card-btn").click(function () { return helpers_1.UI.addCardListener(base); });
    $("#calculate-btn").on("mousedown", function () {
        addLoadingIndicator();
        setTimeout(run, 100); // Need this timeout so control is given back to DOM so it can be updated.
    });
    helpers_1.UI.init();
    $(".draw-amount").val(helpers_1.Helpers.getRandomIntInclusive(3, 20));
}
exports.init = init;

},{"./draw-calculation":"/home/lax/devel/faeria/app/js/draw-calculation.ts","./helpers":"/home/lax/devel/faeria/app/js/helpers.ts","jquery":undefined}],"/home/lax/devel/faeria/app/js/helpers.ts":[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var $ = require("jquery");
require("jrumble");
var UI;
(function (UI) {
    function init() {
        // Initialize rumble effect on elements
        $(".rumble").jrumble(); // FIXME
        // This sets the collapse arrow the right way at start for collapsible cards
        $(".card-header a").toggleClass("collapsed");
        // Initialize tooltips
        $('[data-toggle="tooltip"]').tooltip();
        // Hide load icon, setting display none in css is buggy for some reason.
        $("#calculate-btn span").hide();
    }
    UI.init = init;
    function updateResults(time, c, decimals) {
        if (decimals === void 0) { decimals = 0; }
        $("#chance-number").html((c * 1000).toFixed(decimals));
        $("#time-taken").html(time).show();
    }
    UI.updateResults = updateResults;
    /**
     * Wraps a string in span with text-highlight class
     * @param string
     * @returns {jQuery}
     */
    function highlightWrap(string) {
        return $("<span>").addClass("text-highlight").html(string);
    }
    UI.highlightWrap = highlightWrap;
    /**
     * Listener for card delete button
     */
    function removeCard() {
        $(this).closest(".card")
            .slideToggle("fast", function () {
            this.remove();
        });
        spinGlyphicon($("#add-card-btn").find("span"), true);
    }
    UI.removeCard = removeCard;
    /**
     * Add a new card to be considered for probability.
     */
    function addCard(base) {
        var newCard = base.clone();
        $("#card-container").append(newCard);
        newCard.removeAttr('id')
            .hide()
            .slideToggle("fast")
            .find(".remove-card-btn")
            .click(removeCard);
        spinGlyphicon($(this).find("span"));
        return newCard;
    }
    UI.addCard = addCard;
    /**
     * Spins a glyphicon for a given duration.
     * @param span {Object} jquery object pointing to span with glyphicon class
     * @param reverse {Boolean} reverse spin direction if true
     * @param duration {Number} spin duration in milliseconds
     */
    function spinGlyphicon(span, reverse, duration) {
        if (reverse === void 0) { reverse = false; }
        if (duration === void 0) { duration = 200; }
        var spinClass = (reverse) ? "glyphicon-rev-spin" : "glyphicon-spin";
        span.addClass(spinClass);
        setTimeout(function () { return span.removeClass(spinClass); }, duration);
    }
    UI.spinGlyphicon = spinGlyphicon;
    function addCardListener(base) {
        spinGlyphicon($("#add-card-btn").find("span"));
        return addCard(base);
    }
    UI.addCardListener = addCardListener;
    /**
     * Shakes the selected element(s)
     * @param  {String} selector elements to select
     * @param  {boolean} rotate   If true shakes rotation
     * @param  {int} strength the magnitude of the shakes
     * @param  {int} duration time in milliseconds before shake is stopped
     */
    function rumbleElement(selector, rotate, strength, duration) {
        var rumble = {
            x: 10 * strength,
            y: 10 * strength,
            rotation: (rotate) ? 4 * strength : 0
        };
        $(selector).jrumble(rumble)
            .trigger('startRumble');
        setTimeout(function () {
            $(selector).trigger('stopRumble');
        }, duration);
    }
    UI.rumbleElement = rumbleElement;
    /**
     * Shakes screen and some specific elements based on c
     * @param  {Number} c chance of reaching desired outcome (probability)
     */
    function shakeScreen(c) {
        /* The c value is floored because when it is too small, the rumbles will move the elements by subpixels and
         it creates a jagged effect */
        var floorVal = 0.009, flooredC = Math.max(floorVal, c);
        rumbleElement("#chance-number", true, flooredC, 1200);
        if (flooredC > floorVal) {
            rumbleElement("#title", true, flooredC / 4, 1100);
            rumbleElement(".card", true, flooredC / 2, 800);
            rumbleElement(".content", false, flooredC / 2, 900);
        }
    }
    UI.shakeScreen = shakeScreen;
})(UI = exports.UI || (exports.UI = {}));
var Helpers;
(function (Helpers) {
    /**
     * Returns a promise which resolves to an object with needed information
     * @param  {Function}    func function to time
     * @param  {Array} args  func arguments
     * @return {Promise}     Returns a promise that resolves to an object with t and results values
     */
    function timeFunction(func) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        return new Promise(function (resolve, reject) {
            var t0 = performance.now(), returnValue = func.apply(void 0, args), deltaTime = performance.now() - t0;
            resolve({ t: deltaTime, results: returnValue });
        });
    }
    Helpers.timeFunction = timeFunction;
    function range(start, end) {
        return Array(end - start).fill(0).map(function (val, index) { return index + start; });
    }
    Helpers.range = range;
    function rangeInclusive(start, end) {
        return range(start, end + 1);
    }
    Helpers.rangeInclusive = rangeInclusive;
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }
    Helpers.getRandomInt = getRandomInt;
    function getRandomIntInclusive(min, max) {
        return getRandomInt(min, max + 1);
    }
    Helpers.getRandomIntInclusive = getRandomIntInclusive;
})(Helpers = exports.Helpers || (exports.Helpers = {}));

},{"jquery":undefined,"jrumble":undefined}],"/home/lax/devel/faeria/app/js/main.ts":[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var $ = require("jquery");
var Tether = require("tether");
window.jQuery = window.$ = $;
window.Tether = Tether;
require("bootstrap");
var draw = require("./draw-main");
var ping = require("./ping-main");
/**
 * This is the entry point for both draw and ping sites
 */
$(function () {
    var location = $("#location").data("location");
    if (location == "draw") {
        draw.init();
    }
    else if (location == "ping") {
        ping.init();
    }
});

},{"./draw-main":"/home/lax/devel/faeria/app/js/draw-main.ts","./ping-main":"/home/lax/devel/faeria/app/js/ping-main.ts","bootstrap":undefined,"jquery":undefined,"tether":undefined}],"/home/lax/devel/faeria/app/js/ping-calculation.ts":[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Ping;
(function (Ping) {
    function _createOutcomeTree(creatures, pings) {
        if (pings <= 0 || creatures.length <= 0) {
            return [];
        }
        return creatures.map(function (targetCreature, index) {
            var probability = 1 / creatures.length, targetId = targetCreature[0], creaturesAfterPing = creatures
                .map(function (creature, i) { return (i === index) ? creature.slice(0, creature.length - 1) : creature; })
                .filter(function (creature) { return creature.length !== 0; }); // Filter out tree root value (-1) from outcomes
            return { p: probability, target: targetId, children: _createOutcomeTree(creaturesAfterPing, pings - 1) };
        });
    }
    /**
     * Creates a probability tree. Each node has a probability value, to get the probability to arrive at
     * a node you multiply all probabilities from that node up to the root node. The outcome can be found in the same
     * way by traveling to the root while collecting all target values
     * @param creatures {ReadonlyArray<Creature>}
     * @param pings {number}
     * @param parentNode {Node}
     * @return {Node} returns the root node of the tree
     */
    function createOutcomeTree(creatures, pings) {
        return { target: -1, p: 1, children: _createOutcomeTree(creatures, pings) };
    }
    /**
     * Traverses tree down to leaf nodes and collects all outcomes and returns them as an array of outcomes
     * @param currentNode {Node}    current node being traversed
     * @param target {ReadonlyArray<number>} accumulated targets hit while traversing down tree
     * @param p {number}    accumulated probability while traversing down tree
     * @returns {ReadonlyArray<Outcome>}
     */
    function getOutcomes(currentNode, target, p) {
        if (target === void 0) { target = []; }
        if (p === void 0) { p = 1; }
        if (currentNode.children.length === 0) {
            return [{ val: target.concat(currentNode.target)
                        .filter(function (targetVal) { return targetVal !== -1; }), p: p * currentNode.p }];
        }
        return [].concat.apply([], currentNode.children.map(function (child) {
            return getOutcomes(child, target.concat(currentNode.target), p * currentNode.p);
        }));
    }
    /**
     * Returns true if creature's damage taken in this outcome is in compliance with creature.toDie
     * For example if creature.toDie = true and damage taken >= creature.hp the outcome is desired.
     * @param creature {CreatureInfo}
     * @param outcome {Outcome} outcome object containing outcome and p variable
     * @returns {boolean}
     */
    function isDesiredOutcome(creature, outcome) {
        var dmg = outcome.val.reduce(function (acc, val) {
            if (val === creature.id)
                return acc + 1;
            else
                return acc;
        }, 0);
        return ((creature.toDie && dmg >= creature.hp) || (!creature.toDie && dmg < creature.hp));
    }
    /**
     * Filters outcomes to only outcomes that have desired results
     * @param creatureInputs {ReadonlyArray<CreatureInfo>} array with creature objects
     * @param outcomes {ReadonlyArray<Outcome>} array of outcomes
     * @returns {ReadonlyArray<Outcome>}
     */
    function filterOutcomes(creatureInputs, outcomes) {
        return creatureInputs.reduce(function (acc, c) {
            return acc.filter(function (outcome) { return isDesiredOutcome(c, outcome); });
        }, outcomes);
    }
    function calculate(creatureInput, pings) {
        // Each Creature is represented as an array with length = hp and filled with its name on each entry
        var creatures = creatureInput.map(function (c) { return Array(c.hp).fill(c.id); }), root = createOutcomeTree(creatures, pings), outcomes = getOutcomes(root), filteredOutcomes = filterOutcomes(creatureInput, outcomes), summedProbability = filteredOutcomes.reduce(function (acc, outcome) { return acc + outcome.p; }, 0);
        return summedProbability;
    }
    Ping.calculate = calculate;
})(Ping = exports.Ping || (exports.Ping = {}));

},{}],"/home/lax/devel/faeria/app/js/ping-main.ts":[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var $ = require("jquery");
var helpers_1 = require("./helpers");
var ping_calculation_1 = require("./ping-calculation");
// Template for creating creature cards
var base = $("#base");
/**
 * Changes creature card color depending on desired life status
 */
function changeLifeStatus(context) {
    var newVal = Number($(context).val()), creatureCard = context.closest(".card");
    if (newVal) {
        creatureCard.removeClass("card-success");
        if (creatureCard.hasClass("god")) {
            creatureCard.addClass("card-primary");
        }
        else {
            creatureCard.addClass("card-info");
        }
    }
    else {
        if (creatureCard.hasClass("god")) {
            creatureCard.removeClass("card-primary");
        }
        else {
            creatureCard.removeClass("card-info");
        }
        creatureCard.addClass("card-success");
    }
}
/**
 * Collects user creature input and creates an array of creature objects
 * @returns {Array}  array with objects containing toDie, hp, id variables
 */
function getCreatureInput() {
    var inputs = $.makeArray($(".card.creature").not("#base"));
    return inputs.map(function (val, index) {
        var input = $(val), hp = Number($(input).find("input.creature-hp").val());
        return {
            toDie: Number($(input).find("select").val()) === 1,
            hp: hp,
            id: index
        };
    });
}
/**
 * Reads ping input and adjusts the value to be within valid range. Updates the input value to adjusted value
 * and then returns adjusted value
 * @returns {number}    adjusted ping value
 */
function getPingInput() {
    var pingInput = $("#ping-card").find("input"), pings = pingInput.val(), pingAdjusted = Math.min(Math.max(pings, 1), 12);
    pingInput.val(pingAdjusted);
    return pingAdjusted;
}
function cleanupLoadIndicator() {
    $("#calculate-btn").removeClass("disabled");
    $("#calculate-btn span").hide();
}
/**
 * Disables calculate button and shows a spinning load icon
 */
function addLoadingIndicator() {
    $("#calculate-btn").addClass("disabled");
    $("#chance-text-number").html("---");
    $("#calculate-btn span").show();
}
/**
 * Calculates ping probability from user input and displays result.
 */
function run() {
    var creatures = getCreatureInput(), pings = getPingInput(), promise = helpers_1.Helpers.timeFunction(ping_calculation_1.Ping.calculate, creatures, pings, true);
    promise.then(function (_a) {
        var t = _a.t, results = _a.results;
        helpers_1.UI.updateResults((t / 1000).toFixed(3), results);
        helpers_1.UI.shakeScreen(results);
        cleanupLoadIndicator();
    });
}
function init() {
    $(".creature.god select").change(function () {
        changeLifeStatus($(this));
    });
    $("#add-card-btn").click(function () {
        var newCreature = helpers_1.UI.addCardListener(base);
        newCreature.change(function () {
            changeLifeStatus($(this).find("select"));
        });
    });
    $("#calculate-btn").click(function () {
        addLoadingIndicator();
        setTimeout(run, 100); // Timeout is used to let DOM update load indicator before heavy run function
    });
    helpers_1.UI.init();
}
exports.init = init;

},{"./helpers":"/home/lax/devel/faeria/app/js/helpers.ts","./ping-calculation":"/home/lax/devel/faeria/app/js/ping-calculation.ts","jquery":undefined}]},{},["/home/lax/devel/faeria/app/js/main.ts"])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhcHAvanMvZHJhdy1jYWxjdWxhdGlvbi50cyIsImFwcC9qcy9kcmF3LW1haW4udHMiLCJhcHAvanMvaGVscGVycy50cyIsImFwcC9qcy9tYWluLnRzIiwiYXBwL2pzL3BpbmctY2FsY3VsYXRpb24udHMiLCJhcHAvanMvcGluZy1tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUEsWUFBWSxDQUFDOztBQUNiLHFDQUFrQztBQUVyQixRQUFBLFNBQVMsR0FBRyxFQUFFLENBQUM7QUFFNUI7OztHQUdHO0FBQ0gsSUFBVSxXQUFXLENBbUZwQjtBQW5GRCxXQUFVLFdBQVc7SUFHakI7Ozs7O09BS0c7SUFDSCxnQkFBZ0IsQ0FBUyxFQUFFLENBQVM7UUFDaEMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqQixNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDZCxDQUFDO1FBQ0QsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDVixNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ2IsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMxQyxDQUFDO0lBQ0wsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCwwQkFBMEIsWUFBZ0M7UUFDdEQsTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsVUFBQyxHQUFHLEVBQUUsS0FBSztZQUNsQyxJQUFNLFlBQVksR0FBVyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQUMsT0FBTyxFQUFFLElBQUk7Z0JBQ3BELE1BQU0sQ0FBQyxPQUFPLEdBQUcsTUFB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WUFBRSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN4QixvQkFBb0IsRUFBRSxDQUFDO0lBQzNCLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQztBQUVEO0lBQ0ksQ0FBQyxDQUFDLHNCQUFzQixDQUFDLENBQUMsTUFBTSxDQUFDO1FBQzdCLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzlCLENBQUMsQ0FBQyxDQUFDO0lBQ0gsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUNyQixJQUFNLFdBQVcsR0FBRyxZQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdDLFdBQVcsQ0FBQyxNQUFNLENBQUM7WUFDZixnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDN0MsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDLENBQUMsQ0FBQztJQUNILENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUN0QixtQkFBbUIsRUFBRSxDQUFDO1FBQ3RCLFVBQVUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBRSw2RUFBNkU7SUFDeEcsQ0FBQyxDQUFDLENBQUM7SUFDSCxZQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDZCxDQUFDO0FBZkQsb0JBZUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXCJ1c2Ugc3RyaWN0XCI7XG5pbXBvcnQge0hlbHBlcnN9IGZyb20gXCIuL2hlbHBlcnNcIjtcblxuZXhwb3J0IGNvbnN0IERFQ0tfU0laRSA9IDMwO1xuZXhwb3J0IHR5cGUgQ2FyZEluZm8gPSB7IG5lZWRlZDogbnVtYmVyLCB0b3RhbDogbnVtYmVyLCB2YWx1ZTogbnVtYmVyfTtcbi8qKlxuICogQ2FsY3VsYXRpb24gbmFtZXNwYWNlIGNhbGN1bGF0ZXMgcHJvYmFiaWxpdHkgdG8gZHJhdyBkZXNpcmVkIGNhcmRzIHVzaW5nIGNvbWJpbmF0b3JpY3MuIEl0cyBkaXNhZHZhbnRhZ2UgaXMgdGhhdFxuICogaXQgZG9lcyBub3QgYWNjb3VudCBmb3Igc3RhcnRpbmcgaGFuZCBtdWxsaWdhbnMgYnV0IGlzIG11Y2ggZmFzdGVyIHRoYXQgc2ltdWxhdGlvbi5cbiAqL1xubmFtZXNwYWNlIENhbGN1bGF0aW9uIHtcbiAgICB0eXBlIENhcmQgPSB7IGRyYXduOiBudW1iZXIsIHRvdGFsOiBudW1iZXJ9O1xuICAgIHR5cGUgQ29tYmluYXRpb24gPSBBcnJheTxDYXJkPjtcbiAgICAvKipcbiAgICAgKiBSZWN1cnNpdmUgaW1wbGVtZW50YXRpb24gb2YgbiBjaG9vc2Ugay5cbiAgICAgKiBAcGFyYW0gIHtpbnR9IG4gVG90YWwgYW1vdW50IHRvIGNob29zZSBmcm9tXG4gICAgICogQHBhcmFtICB7aW50fSBrIEhvdyBtYW55IHRvIGNob29zZVxuICAgICAqIEByZXR1cm4ge2ludH0gICBSZXR1cm5zIGhvdyBtYW55IHBvc3NpYmxlIGNvbWJpbmF0aW9ucyBjYW4gYmUgZHJhd24gZGlzcmVnYXJkaW5nIG9yZGVyIGRyYXduXG4gICAgICovXG4gICAgZnVuY3Rpb24gY2hvb3NlKG46IG51bWJlciwgazogbnVtYmVyKTogbnVtYmVyIHtcbiAgICAgICAgaWYgKG4gPCAwIHx8IGsgPCAwKSB7XG4gICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGsgPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIChuICogY2hvb3NlKG4gLSAxLCBrIC0gMSkpIC8gaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIG51bWJlciBvZiBjb21iaW5hdGlvbnMgdGhlIGNhcmRzIGNhbiBtYWtlLiBGSVhNRSBleHBsYWluIGJldHRlci5cbiAgICAgKiBAcGFyYW0gY29tYmluYXRpb25zXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZnVuY3Rpb24gY29tYmluYXRpb25Db3VudChjb21iaW5hdGlvbnM6IEFycmF5PENvbWJpbmF0aW9uPik6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBjb21iaW5hdGlvbnMucmVkdWNlKChzdW0sIGNvbWJvKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjb21ib1Byb2R1Y3Q6IG51bWJlciA9IGNvbWJvLnJlZHVjZSgocHJvZHVjdCwgY2FyZCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBwcm9kdWN0ICogY2hvb3NlKGNhcmQudG90YWwsIGNhcmQuZHJhd24pO1xuICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgICAgICByZXR1cm4gY29tYm9Qcm9kdWN0ICsgc3VtO1xuICAgICAgICB9LCAwKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGaWxscyBhIGNvbWJpbmF0aW9ucyBvZiB0YXJnZXQgY2FyZHMgd2l0aCByZW1haW5pbmcgZHJhd3MgZnJvbSBub24gdGFyZ2V0IGNhcmRzIGFuZCByZXR1cm5zIHRoYXQgdXBkYXRlZFxuICAgICAqIGFycmF5IG9mIGNvbWJpbmF0aW9ucy5cbiAgICAgKiBAcGFyYW0gdGFyZ2V0Q29tYmluYXRpb25zXG4gICAgICogQHBhcmFtIGRyYXdzXG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZpbGxDb21iaW5hdGlvbnModGFyZ2V0Q29tYmluYXRpb25zOiBBcnJheTxDb21iaW5hdGlvbj4sIGRyYXdzOiBudW1iZXIpOiBBcnJheTxDb21iaW5hdGlvbj4ge1xuICAgICAgICBjb25zdCBub25UYXJnZXRBbW91bnQ6IG51bWJlciA9IERFQ0tfU0laRSAtIHRhcmdldENvbWJpbmF0aW9uc1swXS5yZWR1Y2UoKGFjYywgY2FyZCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBhY2MgKyBjYXJkLnRvdGFsO1xuICAgICAgICAgICAgfSwgMCk7XG4gICAgICAgIC8vIEFkZCB0aGUgcmVtYWluaW5nIGRyYXdzIChhZnRlciBjb21iaW5hdGlvbiBoYXMgYmVlbiBkcmF3bikgZnJvbSBub24gdGFyZ2V0IGNhcmRzXG4gICAgICAgIHJldHVybiB0YXJnZXRDb21iaW5hdGlvbnMubWFwKChjb21ibykgPT4ge1xuICAgICAgICAgICAgY29uc3QgZHJhd246IG51bWJlciA9IGNvbWJvLnJlZHVjZSgoZHJhd0FjYywgY2FyZCkgPT4gZHJhd0FjYyArIGNhcmQuZHJhd24sIDApLFxuICAgICAgICAgICAgICAgIGRyYXdzTGVmdDogbnVtYmVyID0gTWF0aC5tYXgoZHJhd3MgLSBkcmF3biwgMCk7XG4gICAgICAgICAgICByZXR1cm4gY29tYm8uY29uY2F0KHt0b3RhbDogbm9uVGFyZ2V0QW1vdW50LCBkcmF3bjogZHJhd3NMZWZ0fSlcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbGwgdmFsaWQgY29tYmluYXRpb24gb2YgdGFyZ2V0IGNhcmQgZHJhd3MuIERyYXdzIG9ubHkgZnJvbSB0YXJnZXQgY2FyZHMsIHRoZSBkZWNrIGlzIG5vdCBjb25zaWRlcmVkLlxuICAgICAqIEV2ZXJ5IHZhbGlkIGNhcmQgZHJhdyBpcyByZXByZXNlbnRlZCBhcyBhbiBhcnJheSB3aXRoIHR3byB2YWx1ZXMgW3RvdGFsLCBkcmF3bl0sIGZvciBhIHRhcmdldENhcmQge25lZWRlZDogMiwgYW1vdW50OiAzfVxuICAgICAqIHR3byBhcnJheSB3aWxsIGJlIGNyZWF0ZWQgc2luY2UgdGhlcmUgYXJlIHR2byB2YWxpZCBjb21iaW5hdGlvbnMgb2YgdGhhdCBjYXJkIChkcmF3biA9IDIgYW5kIGRyYXduID0gMyksXG4gICAgICogZWFjaCBzZXBhcmF0ZSBjb21iaW5hdGlvbiBvZiBhIGNhcmQgd2lsbCB0aGVuIGJlIGNvbWJpbmVkIHdpdGggYWxsIG90aGVyIGNhcmRzIHZhbGlkIGNvbWJpbmF0aW9ucyB0byBjcmVhdGVcbiAgICAgKiBhbGwgdmFsaWQgY29tYmluYXRpb25zIG9mIHRhcmdldCBjYXJkIGRyYXdzLlxuICAgICAqIEBwYXJhbSB0YXJnZXRDYXJkcyB7Q2FyZEluZm99XG4gICAgICogQHBhcmFtIGFjdGl2ZUNvbWJvIHtDb21iaW5hdGlvbn1cbiAgICAgKiBAcmV0dXJucyB7QXJyYXk8Q29tYmluYXRpb24+fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHRhcmdldENvbWJpbmF0aW9ucyh0YXJnZXRDYXJkczogQXJyYXk8Q2FyZEluZm8+LCBhY3RpdmVDb21ibzogQ29tYmluYXRpb24gPSBbXSk6IEFycmF5PENvbWJpbmF0aW9uPiB7XG4gICAgICAgIGlmICh0YXJnZXRDYXJkcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBbYWN0aXZlQ29tYm9dOyAgLy8gTm90IGVudGlyZWx5IHN1cmUgd2h5IEkgbmVlZCB0byB3cmFwIHRoaXNcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBbY2FyZCwgLi4uY2FyZHNMZWZ0XSA9IHRhcmdldENhcmRzO1xuICAgICAgICByZXR1cm4gSGVscGVycy5yYW5nZUluY2x1c2l2ZShjYXJkLm5lZWRlZCwgY2FyZC50b3RhbCkucmVkdWNlKChyZXN1bHRzLCBjdXJyZW50TmVlZGVkKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0cy5jb25jYXQodGFyZ2V0Q29tYmluYXRpb25zKGNhcmRzTGVmdCwgYWN0aXZlQ29tYm8uY29uY2F0KHt0b3RhbDogY2FyZC50b3RhbCwgZHJhd246IGN1cnJlbnROZWVkZWR9KSkpO1xuICAgICAgICB9LCBbXSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGNhcmRzIHtBcnJheTxDYXJkSW5mbz59ICAgICBBcnJheSBjb250YWluaW5nIE9iamVjdHMgd2l0aCBpbmZvcm1hdGlvbiBhYm91dCB0YXJnZXQgY2FyZHMgKGFtb3VudCwgbmVlZGVkKVxuICAgICAqIEBwYXJhbSBkcmF3cyB7bnVtYmVyfSAgICBBbW91bnQgb2YgZHJhd3NcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSAgICAgICAgQ2hhbmNlIHRvIGRyYXcgZGVzaXJlZCBoYW5kXG4gICAgICovXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNhbGN1bGF0ZShjYXJkczogQXJyYXk8Q2FyZEluZm8+LCBkcmF3czogbnVtYmVyKTogbnVtYmVyIHtcbiAgICAgICAgY29uc3QgdmFsaWRUYXJnZXRDb21iaW5hdGlvbnMgPSB0YXJnZXRDb21iaW5hdGlvbnMoY2FyZHMpLFxuICAgICAgICAgICAgYWxsVmFsaWRDb21iaW5hdGlvbnMgPSBmaWxsQ29tYmluYXRpb25zKHZhbGlkVGFyZ2V0Q29tYmluYXRpb25zLCBkcmF3cyk7XG4gICAgICAgIHJldHVybiBjb21iaW5hdGlvbkNvdW50KGFsbFZhbGlkQ29tYmluYXRpb25zKSAvIGNob29zZShERUNLX1NJWkUsIGRyYXdzKTtcbiAgICB9XG59XG5cbi8qKlxuICogU2ltdWxhdGlvbiBuYW1lc3BhY2UgY2FsY3VsYXRlcyBkcmF3IHByb2JhYmlsaXR5IGJ5IHNpbXVsYXRpbmcgbWFueSBoYW5kcyBkcmF3biBhbmQgbG9va2luZyBhdCB0aGUgbnVtYmVyIG9mIGRlc2lyZWQgaGFuZHNcbiAqIGZvdW5kIGluIHJlbGF0aW9uIHRvIGFsbCBoYW5kcyBkcmF3bi4gSXQgYWxzbyBzaW11bGF0ZXMgaW50ZWxsaWdlbnQgbXVsbGlnYW5zIHdoaWNoIGlzIGl0cyBvbmx5IGFkdmFudGFnZSBvdmVyXG4gKiBDYWxjdWxhdGlvbiBuYW1lc3BhY2Ugc29sdXRpb24uXG4gKi9cbm5hbWVzcGFjZSBTaW11bGF0aW9uIHtcbiAgICAvKipcbiAgICAgKiBJbiBwbGFjZSBzd2FwcyB2YWx1ZXMgb2YgaSBhbmQgaiBpbmRleGVzIGluIGFycmF5LlxuICAgICAqIEBwYXJhbSAge0FycmF5fSBhIFtkZXNjcmlwdGlvbl1cbiAgICAgKiBAcGFyYW0gIHtpbnR9IGkgaW5kZXggMVxuICAgICAqIEBwYXJhbSAge2ludH0gaiBpbmRleCAyXG4gICAgICovXG4gICAgZnVuY3Rpb24gc3dhcChhOiBBcnJheTxhbnk+LCBpOiBudW1iZXIsIGo6IG51bWJlcik6IHZvaWQge1xuICAgICAgICBsZXQgdGVtcCA9IGFbaSAtIDFdO1xuICAgICAgICBhW2kgLSAxXSA9IGFbal07XG4gICAgICAgIGFbal0gPSB0ZW1wO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBTaHVmZmxlcyBhcnJheSBpbiBwbGFjZS4gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9hLzYyNzQzODFcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBhIEFycmF5IHRvIGJlIHNodWZmbGVkLlxuICAgICAqIEByZXR1cm4ge0FycmF5fSAgcmV0dXJucyBzaHVmZmxlZCBhcnJheVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNodWZmbGUoYTogQXJyYXk8YW55Pik6IEFycmF5PGFueT4ge1xuICAgICAgICBmb3IgKGxldCBpID0gYS5sZW5ndGg7IGkgPiAwOyBpLS0pIHtcbiAgICAgICAgICAgIGxldCBqID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogaSk7XG4gICAgICAgICAgICBzd2FwKGEsIGksIGopO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFycmF5IG9mIGludGVnZXJzIHJlcHJlc2VudGluZyB0aGUgZGVjay4gQ2FyZHMgb2Ygbm8gaW50ZXJlc3QgYXJlIGFkZGVkIGFzIC0xLCB0YXJnZXQgY2FyZHNcbiAgICAgKiBhcmUgYWRkZWQgd2l0aCB2YWx1ZSBjb250YWluZWQgaW4gY2FyZCBPYmplY3QgaW4gdGFyZ2V0Q2FyZHMgYXJyYXkuXG4gICAgICogQHBhcmFtICB7QXJyYXl9IHRhcmdldENhcmRzIEFycmF5IGNvbnRhaW5pbmcgY2FyZCBPYmplY3RzXG4gICAgICogQHJldHVybiB7QXJyYXl9ICAgICAgICAgIFJldHVybnMgYXJyYXkgcmVwcmVzZW50aW5nIHRoZSBwb3B1bGF0ZWQgZGVjay5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjcmVhdGVEZWNrKHRhcmdldENhcmRzOiBBcnJheTxDYXJkSW5mbz4pOiBBcnJheTxudW1iZXI+IHtcbiAgICAgICAgY29uc3QgdGFyZ2V0cyA9IHRhcmdldENhcmRzLm1hcChjYXJkID0+IEFycmF5PG51bWJlcj4oY2FyZC50b3RhbCkuZmlsbChjYXJkLnZhbHVlKSksXG4gICAgICAgICAgICBub25UYXJnZXRzID0gQXJyYXkoMzApLmZpbGwoLTEpO1xuICAgICAgICByZXR1cm4gW10uY29uY2F0KC4uLnRhcmdldHMsIG5vblRhcmdldHMpLnNsaWNlKDAsIDMwKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIGRlY2sgY29udGFpbnMgY2FyZCBpbiB0aGUgbmVlZGVkIGFtb3VudC5cbiAgICAgKiBAcGFyYW0gIHtBcnJheX0gZGVjayAgRGVjayByZXByZXNlbnRlZCBhcyBpbnRlZ2VyIGFycmF5XG4gICAgICogQHBhcmFtICB7Q2FyZEluZm99IGNhcmQgU291Z2h0IGFmdGVyIGNhcmQgb2JqZWN0XG4gICAgICogQHJldHVybiB7Ym9vbGVhbn0gICAgICBUcnVlIGlmIGRlY2sgY29udGFpbnMgY2FyZC52YWx1ZSBhdGxlYXN0IGNhcmQubmVlZGVkIGFtb3VudCBvZiB0aW1lc1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNvbnRhaW5zKGRlY2s6IEFycmF5PG51bWJlcj4sIGNhcmQ6IENhcmRJbmZvKTogYm9vbGVhbiB7XG4gICAgICAgIGlmIChjYXJkLm5lZWRlZCA8PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGVjay5yZWR1Y2UoKGFjYywgY2FyZFZhbCkgPT5cbiAgICAgICAgICAgICAgICAoY2FyZFZhbCA9PT0gY2FyZC52YWx1ZSkgPyBhY2MgKyAxIDogYWNjLCAwKSA+PSBjYXJkLm5lZWRlZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaHJvd3MgYXdheSBhbGwgbm9uIHRhcmdldCBjYXJkcyBpbiBzdGFydGluZyBoYW5kLlxuICAgICAqIEBwYXJhbSAge0FycmF5fSBkZWNrICAgICAgICAgICBEZWNrIHJlcHJlc2VudGVkIGFzIGludGVnZXIgYXJyYXlcbiAgICAgKiBAcGFyYW0gIHtBcnJheX0gdGFyZ2V0Q2FyZHMgICAgQXJyYXkgY29udGFpbmluZyBkZXNpcmVkIGNhcmRzIHdpdGggaW5mb3JtYXRpb25cbiAgICAgKiBAcGFyYW0gIHtCb29sZWFufSBzbWFydE11bGxpZ2FuICB1c2Ugc21hcnQgbXVsbGlnYW5zIGluIGRyYXdTaW11bGF0aW9uIGlmIHRydWVcbiAgICAgKiBAcmV0dXJuIHtBcnJheX0gICAgICAgICAgICAgICAgQW4gYXJyYXkgd2hlcmUgdGhlIGZpcnN0IG9iamVjdCBpcyBhY3RpdmUgaGFuZCBhbmQgc2Vjb25kIGlzIGFjdGl2ZSBkZWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gbXVsbGlnYW4oZGVjazogQXJyYXk8bnVtYmVyPik6IEFycmF5PEFycmF5PG51bWJlcj4+IHtcbiAgICAgICAgY29uc3Qgc3RhcnRpbmdIYW5kID0gZGVjay5zbGljZSgwLCAzKSxcbiAgICAgICAgICAgIGFjdGl2ZURlY2sgPSBkZWNrLnNsaWNlKDMpLFxuICAgICAgICAgICAgaGFuZEFmdGVyTXVsbGlnYW4gPSBzdGFydGluZ0hhbmQuZmlsdGVyKCh2YWwpID0+IHZhbCA+PSAwKSxcbiAgICAgICAgICAgIG11bGxpZ2FuQ291bnQgPSAzIC0gaGFuZEFmdGVyTXVsbGlnYW4ubGVuZ3RoO1xuICAgICAgICAvKiBQdXQgbXVsbGlnYW5lZCBjYXJkcyBiYWNrIGluIGRlY2suIEFsbCBtdWxsaWdhbmVkIGNhcmRzIGFyZSBvZiBubyBpbnRlcmVzdCAoLTEpICovXG4gICAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCBtdWxsaWdhbkNvdW50OyBpKyspIHtcbiAgICAgICAgICAgIGFjdGl2ZURlY2sucHVzaCgtMSk7XG4gICAgICAgICAgICBzd2FwKGFjdGl2ZURlY2ssIGFjdGl2ZURlY2subGVuZ3RoIC0gMSwgSGVscGVycy5nZXRSYW5kb21JbnRJbmNsdXNpdmUoMCwgYWN0aXZlRGVjay5sZW5ndGgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW2hhbmRBZnRlck11bGxpZ2FuLCBhY3RpdmVEZWNrXTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU2h1ZmZsZXMgZGVjaywgcGVyZm9ybXMgbXVsbGlnYW4sIHNodWZmbGVzIGFnYWluLCBkcmF3cyByZW1haW5pbmcgY2FyZHMgYW5kIGNoZWNrcyBpZiBhbGwgY2FyZHMgYXJlIHJlcHJlc2VudGVkXG4gICAgICogYXQgbGVhc3QgdGhlIG5lZWRlZCBhbW91bnQgb2YgdGltZXMuXG4gICAgICogQHBhcmFtICB7QXJyYXl9IGRlY2sgICAgIERlY2sgcmVwcmVzZW50ZWQgYXMgaW50ZWdlciBhcnJheVxuICAgICAqIEBwYXJhbSAge0FycmF5fSB0YXJnZXRDYXJkcyAgICAgQXJyYXkgY29udGFpbmluZyBkZXNpcmVkIGNhcmRzIHdpdGggaW5mb3JtYXRpb25cbiAgICAgKiBAcGFyYW0gIHtOdW1iZXJ9IGRyYXdBbW91bnQgYW1vdW50IG9mIGNhcmRzIGRyYXduXG4gICAgICogQHJldHVybiB7Ym9vbGVhbn0gICAgICAgICAgUmV0dXJucyB0cnVlIGlmIGRyYXduIGNhcmRzIGNvbnRhaW4gcmVxdWlyZWQgY2FyZHMuXG4gICAgICovXG4gICAgZnVuY3Rpb24gdHJpYWwoZGVjazogQXJyYXk8bnVtYmVyPiwgdGFyZ2V0Q2FyZHM6IEFycmF5PENhcmRJbmZvPiwgZHJhd0Ftb3VudDogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IGFjdGl2ZURlY2sgPSBzaHVmZmxlKGRlY2spLFxuICAgICAgICAgICAgW2hhbmRBZnRlck11bGxpZ2FuLCBkZWNrQWZ0ZXJNdWxsaWdhbl0gPSBtdWxsaWdhbihhY3RpdmVEZWNrKSxcbiAgICAgICAgICAgIHJlbWFpbmluZ0RyYXdzID0gMyAtIGhhbmRBZnRlck11bGxpZ2FuLmxlbmd0aCwgIC8vIDMgaXMgc3RhcnRpbmcgaGFuZCBzaXplIGJlZm9yZSBtdWxsaWdhblxuICAgICAgICAgICAgaGFuZEFmdGVyRHJhd3MgPSBoYW5kQWZ0ZXJNdWxsaWdhbi5jb25jYXQoZGVja0FmdGVyTXVsbGlnYW4uc2xpY2UoMCwgcmVtYWluaW5nRHJhd3MpKTtcbiAgICAgICAgLy8gUmV0dXJuIHRydWUgaWYgZXZlcnkgbmVlZGVkIGNhcmQgaXMgY29udGFpbmVkIGluIGRyYXduIGNhcmRzXG4gICAgICAgIHJldHVybiB0YXJnZXRDYXJkcy5ldmVyeSgoY2FyZCkgPT4gY29udGFpbnMoaGFuZEFmdGVyRHJhd3MsIGNhcmQpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU2ltdWxhdGVzIHNldmVyYWwgc2VwYXJhdGUgaW5zdGFuY2VzIG9mIGRlY2tzIHdpdGhcbiAgICAgKiBkcmF3QW1vdW50IG9mIGRyYXdzIGFuZCBjaGVja3MgaWYgcmVxdWlyZWQgY2FyZHMgYXJlIGNvbnRhaW5lZCBpbiBoYW5kLlxuICAgICAqIEBwYXJhbSAge0FycmF5fSBkZWNrICAgICBEZWNrIHJlcHJlc2VudGVkIGFzIGludGVnZXIgYXJyYXlcbiAgICAgKiBAcGFyYW0gIHtBcnJheX0gdGFyZ2V0Q2FyZHMgICAgIEFycmF5IGNvbnRhaW5pbmcgZGVzaXJlZCBjYXJkcyB3aXRoIGluZm9ybWF0aW9uXG4gICAgICogQHBhcmFtICB7bnVtYmVyfSBkcmF3QW1vdW50IGFtb3VudCBvZiBjYXJkcyBkcmF3blxuICAgICAqIEBwYXJhbSAge251bWJlcn0gcHJlY2lzaW9uICBIb3cgbWFueSB0aW1lcyBkcmF3U2ltdWxhdGlvbiBzaG91bGQgYmUgcnVuXG4gICAgICogQHJldHVybiB7bnVtYmVyfSAgICAgICAgICAgIHJhdGlvIG9mIHN1Y2Nlc3NmdWwgZHJhd3MgdG8gdG90YWwgZHJhd3NcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzaW11bGF0ZShkZWNrOiBBcnJheTxudW1iZXI+LCB0YXJnZXRDYXJkczogQXJyYXk8Q2FyZEluZm8+LCBkcmF3QW1vdW50OiBudW1iZXIsIHByZWNpc2lvbjogbnVtYmVyPTIwMDAwMCk6IG51bWJlciB7XG4gICAgICAgIGxldCB0b3RhbFRyaWVzOiBudW1iZXIgPSBwcmVjaXNpb24sXG4gICAgICAgICAgICBzdWNjZXNzOiBudW1iZXIgPSAwO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRvdGFsVHJpZXM7IGkrKykge1xuICAgICAgICAgICAgaWYodHJpYWwoZGVjaywgdGFyZ2V0Q2FyZHMsIGRyYXdBbW91bnQpKVxuICAgICAgICAgICAgICAgIHN1Y2Nlc3MrKztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3VjY2VzcyAvIHRvdGFsVHJpZXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBkZWNrIGFuZCBzaW11bGF0ZXMgZHJhd3MuXG4gICAgICogQHBhcmFtICB7QXJyYXl9IHRhcmdldENhcmRzICAgICAgICBBcnJheSBjb250YWluaW5nIG9iamVjdHMgd2l0aCB0YXJnZXQgY2FyZHMgaW5mb3JtYXRpb25cbiAgICAgKiBAcGFyYW0gIHtpbnR9ICBkcmF3QW1vdW50ICAgICAgICAgIEFtb3VudCBvZiBjYXJkcyB0byBkcmF3IHRvIGhhbmRcbiAgICAgKiBAcmV0dXJuIHtudW1iZXJ9ICAgICAgICAgICAgICAgICAgIFJldHVybnMgdGhlIHJhdGlvIG9mIGRlc2lyZWQgaGFuZHMgdG8gYWxsIGhhbmRzXG4gICAgICovXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHJ1bih0YXJnZXRDYXJkczogQXJyYXk8Q2FyZEluZm8+LCBkcmF3QW1vdW50OiBudW1iZXIpOiBudW1iZXIge1xuICAgICAgICBjb25zdCBkZWNrOiBBcnJheTxudW1iZXI+ID0gY3JlYXRlRGVjayh0YXJnZXRDYXJkcyk7XG4gICAgICAgIHJldHVybiBzaW11bGF0ZShkZWNrLCB0YXJnZXRDYXJkcywgZHJhd0Ftb3VudCk7XG4gICAgfVxufVxuXG5leHBvcnQgY29uc3QgcnVuU2ltdWxhdGlvbiA9IFNpbXVsYXRpb24ucnVuO1xuZXhwb3J0IGNvbnN0IHJ1bkNhbGN1bGF0aW9uID0gQ2FsY3VsYXRpb24uY2FsY3VsYXRlOyIsIlwidXNlIHN0cmljdFwiO1xuaW1wb3J0ICogYXMgJCBmcm9tIFwianF1ZXJ5XCI7XG5pbXBvcnQge1VJLCBIZWxwZXJzfSBmcm9tIFwiLi9oZWxwZXJzXCJcbmltcG9ydCAqIGFzIERyYXcgZnJvbSBcIi4vZHJhdy1jYWxjdWxhdGlvblwiO1xuaW1wb3J0IHtDYXJkSW5mb30gZnJvbSBcIi4vZHJhdy1jYWxjdWxhdGlvblwiO1xuXG5jb25zdCBiYXNlOiBKUXVlcnk8SFRNTEVsZW1lbnQ+ID0gJChcIiNiYXNlXCIpOyAgLy8gYmFzZSB0ZW1wbGF0ZSBmb3IgY2FyZHNcblxuLyoqXG4gKiBDcmVhdGVzIGVmZmVjdHMgb24gc2NyZWVuIGJhc2VkIG9uIHRoZSBhbW91bnQgb2YgYmFkIGx1Y2sgcGxheWVyXG4gKiBoYXMgcGFpbmZ1bGx5IGVuZHVyZWQuIEEgaGlnaCBjIHdpbGwgY3JlYXRlIGxhcmdlciBlZmZlY3RzLlxuICogQHBhcmFtICB7aW50fSBjIHRoZSBudW1iZXIgb2YgZGVzaXJlZCBoYW5kc1xuICovXG5mdW5jdGlvbiByZXN1bHRTY3JlZW5FZmZlY3RzKGM6IG51bWJlcik6IHZvaWQge1xuICAgIFVJLnNoYWtlU2NyZWVuKGMpO1xufVxuXG4vKipcbiAqIERpc3BsYXkgZXJyb3IgdGV4dCBpZiB1c2VyIGlucHV0IGlzIGluY29ycmVjdFxuICovXG5mdW5jdGlvbiBkaXNwbGF5RXJyb3IobXNnOiBKUXVlcnk8SFRNTEVsZW1lbnQ+KTogdm9pZCB7XG4gICAgJChcIiNlcnJvci1tZXNzYWdlXCIpLmh0bWwobXNnKTtcbiAgICAkKFwiI2Vycm9yLXdyYXBwZXJcIikuc2hvdygpO1xuICAgICQoXCIjcmVzdWx0cy13cmFwcGVyXCIpLmhpZGUoKTtcbn1cblxuLyoqXG4gKiBDb2xsZWN0cyB1c2VyIGNhcmQgcmVsYXRlZCBpbnB1dCBhbmQgcmVwcmVzZW50cyBlYWNoIGNhcmQgYXMgYW4gb2JqZWN0IHdpdGhcbiAqIG5lZWRlZCwgYW1vdW50LCB2YWx1ZSwgZm91bmRBbW91bnQgdmFyaWFibGVzLiBDYXJkIG9iamVjdHMgYXJlIHJldHVybmVkIGluIGFuIGFycmF5LlxuICogQHJldHVybiB7QXJyYXk8Q2FyZEluZm8+fSBBcnJheSBvZiBPYmplY3RzIHJlcHJlc2VudGluZyBlYWNoIHRhcmdldCBjYXJkXG4gKi9cbmZ1bmN0aW9uIGdldENhcmRJbnB1dCgpOiBBcnJheTxDYXJkSW5mbz4ge1xuICAgIGNvbnN0IGlucHV0czogQXJyYXk8SFRNTEVsZW1lbnQ+ID0gJC5tYWtlQXJyYXkoJChcIi5kcmF3XCIpLm5vdChcIiNiYXNlXCIpKTtcbiAgICByZXR1cm4gaW5wdXRzLm1hcCgodmFsLCBpbmRleCkgPT4ge1xuICAgICAgICBjb25zdCBpbnB1dCA9ICQodmFsKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG5lZWRlZDogTnVtYmVyKGlucHV0LmZpbmQoXCIuY2FyZC1uZWVkXCIpLnZhbCgpKSxcbiAgICAgICAgICAgIHRvdGFsOiBOdW1iZXIoaW5wdXQuZmluZChcIi5jYXJkLWRlY2tcIikudmFsKCkpLFxuICAgICAgICAgICAgdmFsdWU6IGluZGV4XG4gICAgICAgIH07XG4gICAgfSk7XG59XG5cbi8qKlxuICogQ2hlY2tzIGFsbCB1c2VyIGVudGVyZWQgaW5wdXQuIFJldHVybnMgYW4gb2JqZWN0IGNvbnRhaW5pbmcgdmFsaWRpdHkgYW5kIG9wdGlvbmFsbHlcbiAqIGEgbWVzc2FnZSB0byBleHBsYWluIHdoYXQgaXMgbm90IHZhbGlkLlxuICogQHBhcmFtICB7aW50fSAgZHJhd0Ftb3VudCAgICBVc2VyIGVudGVyZWQgY2FyZCBkcmF3IHZhbHVlXG4gKiBAcGFyYW0ge0FycmF5PENhcmRJbmZvPn0gICAgY2FyZElucHV0cyAgICBhcnJheSBvZiBvYmplY3RzIGNvbnRhaW5pbmcgZWFjaCBjYXJkIGlucHV0LlxuICogQHJldHVybiB7T2JqZWN0fSAgICAgICAgICAgICBPYmplY3QgY29udGFpbmluZyB2YWxpZGl0eSBhbmQgbXNnIHZhbHVlc1xuICovXG5mdW5jdGlvbiBpc0lucHV0VmFsaWQoZHJhd0Ftb3VudDogbnVtYmVyLCBjYXJkSW5wdXRzOiBBcnJheTxDYXJkSW5mbz4pOiB7dmFsOiBib29sZWFuLCBtc2c6IEpRdWVyeTxIVE1MRWxlbWVudD59IHtcbiAgICBjb25zdCB0b3RhbEFtb3VudDogbnVtYmVyID0gY2FyZElucHV0cy5yZWR1Y2UoKGFjYywgaW5wdXQpID0+IGFjYyArIE51bWJlcihpbnB1dC50b3RhbCksIDApO1xuICAgIC8vIFVzZXIgc3VwcG9zZXMgYSBsYXJnZXIgZGVjayB0aGFuIGlzIHBvc3NpYmxlXG4gICAgaWYgKHRvdGFsQW1vdW50ID4gRHJhdy5ERUNLX1NJWkUpIHtcbiAgICAgICAgcmV0dXJuIHt2YWw6IGZhbHNlLFxuICAgICAgICAgICAgbXNnOiAkKFwiPHNwYW4+XCIpLmFwcGVuZChcIlRhcmdldCBjYXJkIFwiLCBVSS5oaWdobGlnaHRXcmFwKFwiYW1vdW50c1wiKSwgXCIgc3VtIGV4Y2VlZHMgZGVjayBzaXplXCIpfTtcbiAgICB9XG4gICAgY29uc3QgdG90YWxOZWVkZWQ6IG51bWJlciA9IGNhcmRJbnB1dHMucmVkdWNlKChhY2MsIGlucHV0KSA9PiBhY2MgKyBOdW1iZXIoaW5wdXQubmVlZGVkKSwgMCk7XG4gICAgLy8gVXNlciBuZWVkcyBtb3JlIGNhcmRzIHRoYW4gdGhlcmUgYXJlIGRyYXdzLCB3aWxsIGFsd2F5cyBmYWlsLlxuICAgIGlmICh0b3RhbE5lZWRlZCA+IGRyYXdBbW91bnQpIHtcbiAgICAgICAgcmV0dXJuIHt2YWw6IGZhbHNlLFxuICAgICAgICAgICAgbXNnOiAkKFwiPHNwYW4+XCIpLmFwcGVuZChcIkZld2VyIFwiLCBVSS5oaWdobGlnaHRXcmFwKFwiZHJhd3MgXCIpLCBcInRoYW4gXCIsIFVJLmhpZ2hsaWdodFdyYXAoXCJuZWVkZWRcIiksIFwiIGNhcmRzXCIpfTtcbiAgICB9XG4gICAgY29uc3QgdmFsaWROZWVkZWQ6IGJvb2xlYW4gPSBjYXJkSW5wdXRzLmV2ZXJ5KChpbnB1dCkgPT4gTnVtYmVyKGlucHV0LnRvdGFsKSA+PSBOdW1iZXIoaW5wdXQubmVlZGVkKSk7XG4gICAgLy8gT25lIG9yIG1vcmUgbmVlZGVkIHZhbHVlcyBleGNlZWRzIGl0cyBhbW91bnQgaW4gZGVja1xuICAgIGlmICghdmFsaWROZWVkZWQpIHtcbiAgICAgICAgcmV0dXJuIHt2YWw6IGZhbHNlLCBtc2c6ICQoXCI8c3Bhbj5cIikuYXBwZW5kKFVJLmhpZ2hsaWdodFdyYXAoXCJOZWVkZWRcIiksIFwiIGNhbm5vdCBiZSBsYXJnZXIgdGhhbiBjYXJkIFwiLCBVSS5oaWdobGlnaHRXcmFwKFwiYW1vdW50XCIpLCBcIiBpbiBkZWNrXCIpfTtcbiAgICB9XG4gICAgcmV0dXJuIHt2YWw6IHRydWUsIG1zZzogJChcIlwiKX07XG59XG4vKipcbiAqIERpc2FibGVzIGNhbGN1bGF0ZSBidXR0b24gYW5kIHNob3dzIGEgc3Bpbm5pbmcgbG9hZCBpY29uXG4gKi9cbmZ1bmN0aW9uIGFkZExvYWRpbmdJbmRpY2F0b3IoKTogdm9pZCB7XG4gICAgJChcIiNjYWxjdWxhdGUtYnRuXCIpLmFkZENsYXNzKFwiZGlzYWJsZWRcIik7XG4gICAgJChcIiNjaGFuY2UtdGV4dC1udW1iZXJcIikuaHRtbChcIi0tLVwiKTtcbiAgICAkKFwiI2Vycm9yLXdyYXBwZXJcIikuaGlkZSgpO1xuICAgICQoXCIjcmVzdWx0cy13cmFwcGVyXCIpLnNob3coKTtcbiAgICAkKFwiI2NhbGN1bGF0ZS1idG4gc3BhblwiKS5zaG93KCk7XG59XG4vKipcbiAqIFJlbW92ZXMgZWZmZWN0cyBzaG93biB3aGlsZSBsb2FkaW5nXG4gKi9cbmZ1bmN0aW9uIGNsZWFudXBMb2FkSW5kaWNhdG9yKCk6IHZvaWQge1xuICAgICQoXCIjY2FsY3VsYXRlLWJ0biBzcGFuXCIpLmhpZGUoKTtcbiAgICAkKFwiI2NhbGN1bGF0ZS1idG5cIikucmVtb3ZlQ2xhc3MoXCJkaXNhYmxlZFwiKTtcbn1cbi8qKlxuICogVmFsaWRhdGVzIHVzZXIgaW5wdXQgYW5kIHJ1bnMgZHJhd1NpbXVsYXRpb24gaWYgaW5wdXQgaXMgdmFsaWQuXG4gKi9cbmZ1bmN0aW9uIHJ1bigpOiB2b2lkIHtcbiAgICBjb25zdCBzbWFydE11bGxpZ2FuOiBib29sZWFuID0gJChcIiNtdWxsaWdhbi1jaGVja2JveFwiKS5pcygnOmNoZWNrZWQnKSxcbiAgICAgICAgZHJhd0Ftb3VudCA9IE51bWJlcigkKFwiLmRyYXctYW1vdW50XCIpLnZhbCgpKSxcbiAgICAgICAgY2FyZEluZm86IEFycmF5PENhcmRJbmZvPiA9IGdldENhcmRJbnB1dCgpLFxuICAgICAgICB2YWxpZGl0eSA9IGlzSW5wdXRWYWxpZChkcmF3QW1vdW50LCBjYXJkSW5mbyk7XG4gICAgaWYgKHZhbGlkaXR5LnZhbCkge1xuICAgICAgICBjb25zdCBmdW5jID0gKHNtYXJ0TXVsbGlnYW4pID8gRHJhdy5ydW5TaW11bGF0aW9uIDogRHJhdy5ydW5DYWxjdWxhdGlvbixcbiAgICAgICAgICAgIHByb21pc2UgPSBIZWxwZXJzLnRpbWVGdW5jdGlvbihmdW5jLCBjYXJkSW5mbywgZHJhd0Ftb3VudCk7XG4gICAgICAgIHByb21pc2UudGhlbigoe3QsIHJlc3VsdHN9KSA9PiB7XG4gICAgICAgICAgICBjbGVhbnVwTG9hZEluZGljYXRvcigpO1xuICAgICAgICAgICAgVUkudXBkYXRlUmVzdWx0cygodCAvIDEwMDApLnRvRml4ZWQoMyksIHJlc3VsdHMpO1xuICAgICAgICAgICAgcmVzdWx0U2NyZWVuRWZmZWN0cyhyZXN1bHRzKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBjbGVhbnVwTG9hZEluZGljYXRvcigpO1xuICAgICAgICBkaXNwbGF5RXJyb3IodmFsaWRpdHkubXNnKTtcbiAgICB9XG4gICAgJChcIiNmYXEtd3JhcHBlclwiKS5jb2xsYXBzZSgnaGlkZScpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGluaXQoKTogdm9pZCB7XG4gICAgLy8gQWRkIGluaXRpYWwgdGFyZ2V0IGNhcmQgaW5wdXRcbiAgICBVSS5hZGRDYXJkKGJhc2UpO1xuICAgIC8vIEFkZCBidXR0b24gbGlzdGVuZXJzXG4gICAgJChcIiNhZGQtY2FyZC1idG5cIikuY2xpY2soKCkgPT4gVUkuYWRkQ2FyZExpc3RlbmVyKGJhc2UpKTtcbiAgICAkKFwiI2NhbGN1bGF0ZS1idG5cIikub24oXCJtb3VzZWRvd25cIiwgKCkgPT4ge1xuICAgICAgICBhZGRMb2FkaW5nSW5kaWNhdG9yKCk7XG4gICAgICAgIHNldFRpbWVvdXQocnVuLCAxMDApOyAgLy8gTmVlZCB0aGlzIHRpbWVvdXQgc28gY29udHJvbCBpcyBnaXZlbiBiYWNrIHRvIERPTSBzbyBpdCBjYW4gYmUgdXBkYXRlZC5cbiAgICB9KTtcbiAgICBVSS5pbml0KCk7XG4gICAgJChcIi5kcmF3LWFtb3VudFwiKS52YWwoSGVscGVycy5nZXRSYW5kb21JbnRJbmNsdXNpdmUoMywgMjApKTtcbn0iLCJcInVzZSBzdHJpY3RcIjtcbmltcG9ydCAqIGFzICQgZnJvbSBcImpxdWVyeVwiO1xuaW1wb3J0IFwianJ1bWJsZVwiO1xuXG5leHBvcnQgbmFtZXNwYWNlIFVJIHtcbiAgICBleHBvcnQgZnVuY3Rpb24gaW5pdCgpOiB2b2lkIHsgLy8gRklYTUUgcmVuYW1lIHRvIGluaXRVSVxuICAgICAgICAvLyBJbml0aWFsaXplIHJ1bWJsZSBlZmZlY3Qgb24gZWxlbWVudHNcbiAgICAgICAgJChcIi5ydW1ibGVcIikuanJ1bWJsZSgpOyAvLyBGSVhNRVxuICAgICAgICAvLyBUaGlzIHNldHMgdGhlIGNvbGxhcHNlIGFycm93IHRoZSByaWdodCB3YXkgYXQgc3RhcnQgZm9yIGNvbGxhcHNpYmxlIGNhcmRzXG4gICAgICAgICQoXCIuY2FyZC1oZWFkZXIgYVwiKS50b2dnbGVDbGFzcyhcImNvbGxhcHNlZFwiKTtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICAkKCdbZGF0YS10b2dnbGU9XCJ0b29sdGlwXCJdJykudG9vbHRpcCgpO1xuICAgICAgICAvLyBIaWRlIGxvYWQgaWNvbiwgc2V0dGluZyBkaXNwbGF5IG5vbmUgaW4gY3NzIGlzIGJ1Z2d5IGZvciBzb21lIHJlYXNvbi5cbiAgICAgICAgJChcIiNjYWxjdWxhdGUtYnRuIHNwYW5cIikuaGlkZSgpO1xuICAgIH1cbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlUmVzdWx0cyh0aW1lOiBzdHJpbmcsIGM6IG51bWJlciwgZGVjaW1hbHM6IG51bWJlciA9IDApIHtcbiAgICAgICAgJChcIiNjaGFuY2UtbnVtYmVyXCIpLmh0bWwoKGMgKiAxMDAwKS50b0ZpeGVkKGRlY2ltYWxzKSk7XG4gICAgICAgICQoXCIjdGltZS10YWtlblwiKS5odG1sKHRpbWUpLnNob3coKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogV3JhcHMgYSBzdHJpbmcgaW4gc3BhbiB3aXRoIHRleHQtaGlnaGxpZ2h0IGNsYXNzXG4gICAgICogQHBhcmFtIHN0cmluZ1xuICAgICAqIEByZXR1cm5zIHtqUXVlcnl9XG4gICAgICovXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGhpZ2hsaWdodFdyYXAoc3RyaW5nOiBzdHJpbmcpOiBKUXVlcnk8SFRNTEVsZW1lbnQ+IHtcbiAgICAgICAgcmV0dXJuICQoXCI8c3Bhbj5cIikuYWRkQ2xhc3MoXCJ0ZXh0LWhpZ2hsaWdodFwiKS5odG1sKHN0cmluZyk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIExpc3RlbmVyIGZvciBjYXJkIGRlbGV0ZSBidXR0b25cbiAgICAgKi9cbiAgICBleHBvcnQgZnVuY3Rpb24gcmVtb3ZlQ2FyZCgpOiB2b2lkIHtcbiAgICAgICAgJCh0aGlzKS5jbG9zZXN0KFwiLmNhcmRcIilcbiAgICAgICAgICAgIC5zbGlkZVRvZ2dsZShcImZhc3RcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW1vdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICBzcGluR2x5cGhpY29uKCQoXCIjYWRkLWNhcmQtYnRuXCIpLmZpbmQoXCJzcGFuXCIpLCB0cnVlKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQWRkIGEgbmV3IGNhcmQgdG8gYmUgY29uc2lkZXJlZCBmb3IgcHJvYmFiaWxpdHkuXG4gICAgICovXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGFkZENhcmQoYmFzZTogSlF1ZXJ5PEhUTUxFbGVtZW50Pik6IEpRdWVyeTxIVE1MRWxlbWVudD4ge1xuICAgICAgICBjb25zdCBuZXdDYXJkID0gYmFzZS5jbG9uZSgpO1xuICAgICAgICAkKFwiI2NhcmQtY29udGFpbmVyXCIpLmFwcGVuZChuZXdDYXJkKTtcbiAgICAgICAgbmV3Q2FyZC5yZW1vdmVBdHRyKCdpZCcpXG4gICAgICAgICAgICAuaGlkZSgpXG4gICAgICAgICAgICAuc2xpZGVUb2dnbGUoXCJmYXN0XCIpXG4gICAgICAgICAgICAuZmluZChcIi5yZW1vdmUtY2FyZC1idG5cIilcbiAgICAgICAgICAgIC5jbGljayhyZW1vdmVDYXJkKVxuICAgICAgICBzcGluR2x5cGhpY29uKCQodGhpcykuZmluZChcInNwYW5cIikpO1xuICAgICAgICByZXR1cm4gbmV3Q2FyZDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU3BpbnMgYSBnbHlwaGljb24gZm9yIGEgZ2l2ZW4gZHVyYXRpb24uXG4gICAgICogQHBhcmFtIHNwYW4ge09iamVjdH0ganF1ZXJ5IG9iamVjdCBwb2ludGluZyB0byBzcGFuIHdpdGggZ2x5cGhpY29uIGNsYXNzXG4gICAgICogQHBhcmFtIHJldmVyc2Uge0Jvb2xlYW59IHJldmVyc2Ugc3BpbiBkaXJlY3Rpb24gaWYgdHJ1ZVxuICAgICAqIEBwYXJhbSBkdXJhdGlvbiB7TnVtYmVyfSBzcGluIGR1cmF0aW9uIGluIG1pbGxpc2Vjb25kc1xuICAgICAqL1xuICAgIGV4cG9ydCBmdW5jdGlvbiBzcGluR2x5cGhpY29uKHNwYW46IEpRdWVyeTxIVE1MRWxlbWVudD4sIHJldmVyc2U9ZmFsc2UsIGR1cmF0aW9uPTIwMCk6IHZvaWQge1xuICAgICAgICBjb25zdCBzcGluQ2xhc3MgPSAocmV2ZXJzZSkgPyBcImdseXBoaWNvbi1yZXYtc3BpblwiIDogXCJnbHlwaGljb24tc3BpblwiO1xuICAgICAgICBzcGFuLmFkZENsYXNzKHNwaW5DbGFzcyk7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gc3Bhbi5yZW1vdmVDbGFzcyhzcGluQ2xhc3MpLCBkdXJhdGlvbik7XG4gICAgfVxuXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGFkZENhcmRMaXN0ZW5lcihiYXNlOiBKUXVlcnk8SFRNTEVsZW1lbnQ+KTogSlF1ZXJ5PEhUTUxFbGVtZW50PiB7XG4gICAgICAgIHNwaW5HbHlwaGljb24oJChcIiNhZGQtY2FyZC1idG5cIikuZmluZChcInNwYW5cIikpO1xuICAgICAgICByZXR1cm4gYWRkQ2FyZChiYXNlKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU2hha2VzIHRoZSBzZWxlY3RlZCBlbGVtZW50KHMpXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSBzZWxlY3RvciBlbGVtZW50cyB0byBzZWxlY3RcbiAgICAgKiBAcGFyYW0gIHtib29sZWFufSByb3RhdGUgICBJZiB0cnVlIHNoYWtlcyByb3RhdGlvblxuICAgICAqIEBwYXJhbSAge2ludH0gc3RyZW5ndGggdGhlIG1hZ25pdHVkZSBvZiB0aGUgc2hha2VzXG4gICAgICogQHBhcmFtICB7aW50fSBkdXJhdGlvbiB0aW1lIGluIG1pbGxpc2Vjb25kcyBiZWZvcmUgc2hha2UgaXMgc3RvcHBlZFxuICAgICAqL1xuICAgIGV4cG9ydCBmdW5jdGlvbiBydW1ibGVFbGVtZW50KHNlbGVjdG9yOiBzdHJpbmcsIHJvdGF0ZTogYm9vbGVhbiwgc3RyZW5ndGg6IG51bWJlciwgZHVyYXRpb246IG51bWJlcik6IHZvaWQge1xuICAgICAgICBjb25zdCBydW1ibGUgPSB7XG4gICAgICAgICAgICB4OiAxMCAqIHN0cmVuZ3RoLFxuICAgICAgICAgICAgeTogMTAgKiBzdHJlbmd0aCxcbiAgICAgICAgICAgIHJvdGF0aW9uOiAocm90YXRlKSA/IDQgKiBzdHJlbmd0aCA6IDBcbiAgICAgICAgfTtcbiAgICAgICAgJChzZWxlY3RvcikuanJ1bWJsZShydW1ibGUpXG4gICAgICAgICAgICAudHJpZ2dlcignc3RhcnRSdW1ibGUnKTtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICQoc2VsZWN0b3IpLnRyaWdnZXIoJ3N0b3BSdW1ibGUnKTtcbiAgICAgICAgfSwgZHVyYXRpb24pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBTaGFrZXMgc2NyZWVuIGFuZCBzb21lIHNwZWNpZmljIGVsZW1lbnRzIGJhc2VkIG9uIGNcbiAgICAgKiBAcGFyYW0gIHtOdW1iZXJ9IGMgY2hhbmNlIG9mIHJlYWNoaW5nIGRlc2lyZWQgb3V0Y29tZSAocHJvYmFiaWxpdHkpXG4gICAgICovXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNoYWtlU2NyZWVuKGM6IG51bWJlcik6IHZvaWQge1xuICAgICAgICAvKiBUaGUgYyB2YWx1ZSBpcyBmbG9vcmVkIGJlY2F1c2Ugd2hlbiBpdCBpcyB0b28gc21hbGwsIHRoZSBydW1ibGVzIHdpbGwgbW92ZSB0aGUgZWxlbWVudHMgYnkgc3VicGl4ZWxzIGFuZFxuICAgICAgICAgaXQgY3JlYXRlcyBhIGphZ2dlZCBlZmZlY3QgKi9cbiAgICAgICAgY29uc3QgZmxvb3JWYWwgPSAwLjAwOSxcbiAgICAgICAgICAgIGZsb29yZWRDID0gTWF0aC5tYXgoZmxvb3JWYWwsIGMpO1xuICAgICAgICBydW1ibGVFbGVtZW50KFwiI2NoYW5jZS1udW1iZXJcIiwgdHJ1ZSwgZmxvb3JlZEMsIDEyMDApO1xuICAgICAgICBpZihmbG9vcmVkQyA+IGZsb29yVmFsKSB7ICAvLyBJZiBjIHZhbHVlIHdhcyBub3QgZmxvb3JlZCBydW1ibGUgYWxsIGVsZW1lbnRzXG4gICAgICAgICAgICBydW1ibGVFbGVtZW50KFwiI3RpdGxlXCIsIHRydWUsIGZsb29yZWRDIC8gNCAsIDExMDApO1xuICAgICAgICAgICAgcnVtYmxlRWxlbWVudChcIi5jYXJkXCIsIHRydWUsIGZsb29yZWRDIC8gMiwgODAwKTtcbiAgICAgICAgICAgIHJ1bWJsZUVsZW1lbnQoXCIuY29udGVudFwiLCBmYWxzZSwgZmxvb3JlZEMgLyAyLCA5MDApO1xuICAgICAgICB9XG4gICAgfVxufVxuZXhwb3J0IG5hbWVzcGFjZSBIZWxwZXJzIHtcbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgcHJvbWlzZSB3aGljaCByZXNvbHZlcyB0byBhbiBvYmplY3Qgd2l0aCBuZWVkZWQgaW5mb3JtYXRpb25cbiAgICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gICAgZnVuYyBmdW5jdGlvbiB0byB0aW1lXG4gICAgICogQHBhcmFtICB7QXJyYXl9IGFyZ3MgIGZ1bmMgYXJndW1lbnRzXG4gICAgICogQHJldHVybiB7UHJvbWlzZX0gICAgIFJldHVybnMgYSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gYW4gb2JqZWN0IHdpdGggdCBhbmQgcmVzdWx0cyB2YWx1ZXNcbiAgICAgKi9cbiAgICBleHBvcnQgZnVuY3Rpb24gdGltZUZ1bmN0aW9uIChmdW5jOiBGdW5jdGlvbiwgLi4uYXJnczogQXJyYXk8YW55Pik6IFByb21pc2U8e3Q6IG51bWJlciwgcmVzdWx0czogYW55fT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdDA6IG51bWJlciA9IHBlcmZvcm1hbmNlLm5vdygpLFxuICAgICAgICAgICAgICAgIHJldHVyblZhbHVlOiBhbnkgPSBmdW5jKC4uLmFyZ3MpLFxuICAgICAgICAgICAgICAgIGRlbHRhVGltZTogbnVtYmVyID0gcGVyZm9ybWFuY2Uubm93KCkgLSB0MDtcbiAgICAgICAgICAgIHJlc29sdmUoe3Q6IGRlbHRhVGltZSwgcmVzdWx0czogcmV0dXJuVmFsdWV9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGV4cG9ydCBmdW5jdGlvbiByYW5nZShzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlcik6IFJlYWRvbmx5QXJyYXk8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiBBcnJheShlbmQgLSBzdGFydCkuZmlsbCgwKS5tYXAoKHZhbCwgaW5kZXgpID0+IGluZGV4ICsgc3RhcnQpO1xuICAgIH1cbiAgICBleHBvcnQgZnVuY3Rpb24gcmFuZ2VJbmNsdXNpdmUoc3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIpOiBSZWFkb25seUFycmF5PG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gcmFuZ2Uoc3RhcnQsIGVuZCArIDEpO1xuICAgIH1cbiAgICBleHBvcnQgZnVuY3Rpb24gZ2V0UmFuZG9tSW50KG1pbjogbnVtYmVyLCBtYXg6IG51bWJlcik6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSkgKyBtaW47XG4gICAgfVxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXRSYW5kb21JbnRJbmNsdXNpdmUobWluOiBudW1iZXIsIG1heDogbnVtYmVyKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIGdldFJhbmRvbUludChtaW4sIG1heCArIDEpO1xuICAgIH1cbn0iLCJcInVzZSBzdHJpY3RcIjtcbmltcG9ydCAqIGFzICQgZnJvbSBcImpxdWVyeVwiO1xuaW1wb3J0ICogYXMgVGV0aGVyIGZyb20gXCJ0ZXRoZXJcIjtcbi8qXG5UaGlzIGlzIGRlcHJlc3NpbmcgYnV0IGZvciBib290c3RyYXAgdG8gZmluZCB0aGVzZSB0aGluZyB3aGVuIGJ1bmRsZWQgSSBuZWVkIHRvIGRlY2xhcmUgdGhlbSBpbiBnbG9iYWwgbmFtZXNwYWNlXG5saWtlIHRoaXMuIEl0IHdvcmtlZCB3aXRob3V0IHdoZW4gSSBidW5kbGVkIGV2ZXJ5dGhpbmcgaW50byBvbmUgYnVuZGxlIG5vdCBkaXZpZGVkIGluIGxpYnMgYW5kIHNyYy5cbiAqL1xuZGVjbGFyZSBnbG9iYWwge1xuICAgIGludGVyZmFjZSBXaW5kb3cgeyBqUXVlcnk6IGFueSwgJDogYW55LCBUZXRoZXI6IGFueX1cbn1cbndpbmRvdy5qUXVlcnkgPSB3aW5kb3cuJCA9ICQ7XG53aW5kb3cuVGV0aGVyID0gVGV0aGVyO1xuaW1wb3J0IFwiYm9vdHN0cmFwXCI7XG5pbXBvcnQgKiBhcyBkcmF3IGZyb20gXCIuL2RyYXctbWFpblwiO1xuaW1wb3J0ICogYXMgcGluZyBmcm9tIFwiLi9waW5nLW1haW5cIjtcblxuZGVjbGFyZSBnbG9iYWwge1xuICAgIGludGVyZmFjZSBKUXVlcnkge1xuICAgICAgICBqcnVtYmxlKGFyZz86IG9iamVjdCk6IEpRdWVyeTtcbiAgICAgICAgaHRtbChvYmo6SlF1ZXJ5KTogSlF1ZXJ5OyAgLy8gQWxsb3cgaHRtbCBpbnB1dCB3aXRoIEpRdWVyeSBvYmplY3RzXG4gICAgfVxufVxuLyoqXG4gKiBUaGlzIGlzIHRoZSBlbnRyeSBwb2ludCBmb3IgYm90aCBkcmF3IGFuZCBwaW5nIHNpdGVzXG4gKi9cbiQoKCkgPT4ge1xuICAgIGNvbnN0IGxvY2F0aW9uID0gJChcIiNsb2NhdGlvblwiKS5kYXRhKFwibG9jYXRpb25cIik7XG4gICAgaWYgKGxvY2F0aW9uID09IFwiZHJhd1wiKSB7XG4gICAgICAgIGRyYXcuaW5pdCgpO1xuICAgIH1cbiAgICBlbHNlIGlmIChsb2NhdGlvbiA9PSBcInBpbmdcIikge1xuICAgICAgICBwaW5nLmluaXQoKTtcbiAgICB9XG59KTsiLCJcInVzZSBzdHJpY3RcIjtcblxuZXhwb3J0IHR5cGUgQ3JlYXR1cmVJbmZvID0ge3RvRGllOiBib29sZWFuLCBocDogbnVtYmVyLCBpZDogbnVtYmVyfTtcbmV4cG9ydCBuYW1lc3BhY2UgUGluZyB7XG4gICAgLy8gQ3JlYXR1cmUgaXMgcmVwcmVzZW50ZWQgYnkgYW4gYXJyYXkgdGhlIGxlbmd0aCBvZiBpdHMgaHAgd2hlcmUgZWFjaCBlbnRyeSBpcyBpdHMgaWRcbiAgICB0eXBlIENyZWF0dXJlID0gUmVhZG9ubHlBcnJheTxudW1iZXI+O1xuICAgIC8vIEVhY2ggZW50cnkgaW4gdmFsIGFycmF5IGlzICdpZCcgb2YgdGFyZ2V0ZWQgY3JlYXR1cmVcbiAgICB0eXBlIE91dGNvbWUgPSAge3ZhbDogUmVhZG9ubHlBcnJheTxudW1iZXI+LCBwOiBudW1iZXJ9XG4gICAgLy8gTm9kZSBpcyBhIG5vZGUgaW4gcHJvYmFiaWxpdHkgdHJlZVxuICAgIHR5cGUgTm9kZSA9IHtwOiBudW1iZXIsIHRhcmdldDogbnVtYmVyLCBjaGlsZHJlbjogUmVhZG9ubHlBcnJheTxOb2RlPn1cblxuICAgIGZ1bmN0aW9uIF9jcmVhdGVPdXRjb21lVHJlZShjcmVhdHVyZXM6IFJlYWRvbmx5QXJyYXk8Q3JlYXR1cmU+LCBwaW5nczogbnVtYmVyKTogQXJyYXk8Tm9kZT4ge1xuICAgICAgICBpZiAocGluZ3MgPD0gMCB8fCBjcmVhdHVyZXMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY3JlYXR1cmVzLm1hcCgodGFyZ2V0Q3JlYXR1cmUsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwcm9iYWJpbGl0eSA9IDEgLyBjcmVhdHVyZXMubGVuZ3RoLFxuICAgICAgICAgICAgICAgIHRhcmdldElkOiBudW1iZXIgPSB0YXJnZXRDcmVhdHVyZVswXSxcbiAgICAgICAgICAgICAgICBjcmVhdHVyZXNBZnRlclBpbmcgPSBjcmVhdHVyZXNcbiAgICAgICAgICAgICAgICAgICAgLm1hcCgoY3JlYXR1cmUsIGkpID0+IChpID09PSBpbmRleCkgPyBjcmVhdHVyZS5zbGljZSgwLCBjcmVhdHVyZS5sZW5ndGggLSAxKSA6IGNyZWF0dXJlKVxuICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGNyZWF0dXJlID0+IGNyZWF0dXJlLmxlbmd0aCAhPT0gMCk7ICAvLyBGaWx0ZXIgb3V0IHRyZWUgcm9vdCB2YWx1ZSAoLTEpIGZyb20gb3V0Y29tZXNcbiAgICAgICAgICAgIHJldHVybiB7cDogcHJvYmFiaWxpdHksIHRhcmdldDogdGFyZ2V0SWQsIGNoaWxkcmVuOiBfY3JlYXRlT3V0Y29tZVRyZWUoY3JlYXR1cmVzQWZ0ZXJQaW5nLCBwaW5ncyAtIDEpfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIHByb2JhYmlsaXR5IHRyZWUuIEVhY2ggbm9kZSBoYXMgYSBwcm9iYWJpbGl0eSB2YWx1ZSwgdG8gZ2V0IHRoZSBwcm9iYWJpbGl0eSB0byBhcnJpdmUgYXRcbiAgICAgKiBhIG5vZGUgeW91IG11bHRpcGx5IGFsbCBwcm9iYWJpbGl0aWVzIGZyb20gdGhhdCBub2RlIHVwIHRvIHRoZSByb290IG5vZGUuIFRoZSBvdXRjb21lIGNhbiBiZSBmb3VuZCBpbiB0aGUgc2FtZVxuICAgICAqIHdheSBieSB0cmF2ZWxpbmcgdG8gdGhlIHJvb3Qgd2hpbGUgY29sbGVjdGluZyBhbGwgdGFyZ2V0IHZhbHVlc1xuICAgICAqIEBwYXJhbSBjcmVhdHVyZXMge1JlYWRvbmx5QXJyYXk8Q3JlYXR1cmU+fVxuICAgICAqIEBwYXJhbSBwaW5ncyB7bnVtYmVyfVxuICAgICAqIEBwYXJhbSBwYXJlbnROb2RlIHtOb2RlfVxuICAgICAqIEByZXR1cm4ge05vZGV9IHJldHVybnMgdGhlIHJvb3Qgbm9kZSBvZiB0aGUgdHJlZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNyZWF0ZU91dGNvbWVUcmVlKGNyZWF0dXJlczogUmVhZG9ubHlBcnJheTxDcmVhdHVyZT4sIHBpbmdzOiBudW1iZXIpOiBOb2RlIHtcbiAgICAgICAgcmV0dXJuIHt0YXJnZXQ6IC0xLCBwOiAxLCBjaGlsZHJlbjogX2NyZWF0ZU91dGNvbWVUcmVlKGNyZWF0dXJlcywgcGluZ3MpfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUcmF2ZXJzZXMgdHJlZSBkb3duIHRvIGxlYWYgbm9kZXMgYW5kIGNvbGxlY3RzIGFsbCBvdXRjb21lcyBhbmQgcmV0dXJucyB0aGVtIGFzIGFuIGFycmF5IG9mIG91dGNvbWVzXG4gICAgICogQHBhcmFtIGN1cnJlbnROb2RlIHtOb2RlfSAgICBjdXJyZW50IG5vZGUgYmVpbmcgdHJhdmVyc2VkXG4gICAgICogQHBhcmFtIHRhcmdldCB7UmVhZG9ubHlBcnJheTxudW1iZXI+fSBhY2N1bXVsYXRlZCB0YXJnZXRzIGhpdCB3aGlsZSB0cmF2ZXJzaW5nIGRvd24gdHJlZVxuICAgICAqIEBwYXJhbSBwIHtudW1iZXJ9ICAgIGFjY3VtdWxhdGVkIHByb2JhYmlsaXR5IHdoaWxlIHRyYXZlcnNpbmcgZG93biB0cmVlXG4gICAgICogQHJldHVybnMge1JlYWRvbmx5QXJyYXk8T3V0Y29tZT59XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0T3V0Y29tZXMoY3VycmVudE5vZGU6IE5vZGUsIHRhcmdldDogUmVhZG9ubHlBcnJheTxudW1iZXI+PVtdLCBwOiBudW1iZXI9MSk6IFJlYWRvbmx5QXJyYXk8T3V0Y29tZT4ge1xuICAgICAgICBpZihjdXJyZW50Tm9kZS5jaGlsZHJlbi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBbe3ZhbDogdGFyZ2V0LmNvbmNhdChjdXJyZW50Tm9kZS50YXJnZXQpXG4gICAgICAgICAgICAgICAgLmZpbHRlcih0YXJnZXRWYWwgPT4gdGFyZ2V0VmFsICE9PSAtMSksIHA6IHAgKiBjdXJyZW50Tm9kZS5wfV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFtdLmNvbmNhdCggLi4uY3VycmVudE5vZGUuY2hpbGRyZW4ubWFwKGNoaWxkID0+IHtcbiAgICAgICAgICAgIHJldHVybiBnZXRPdXRjb21lcyhjaGlsZCwgdGFyZ2V0LmNvbmNhdChjdXJyZW50Tm9kZS50YXJnZXQpLCBwICogY3VycmVudE5vZGUucCk7XG4gICAgICAgIH0pKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIGNyZWF0dXJlJ3MgZGFtYWdlIHRha2VuIGluIHRoaXMgb3V0Y29tZSBpcyBpbiBjb21wbGlhbmNlIHdpdGggY3JlYXR1cmUudG9EaWVcbiAgICAgKiBGb3IgZXhhbXBsZSBpZiBjcmVhdHVyZS50b0RpZSA9IHRydWUgYW5kIGRhbWFnZSB0YWtlbiA+PSBjcmVhdHVyZS5ocCB0aGUgb3V0Y29tZSBpcyBkZXNpcmVkLlxuICAgICAqIEBwYXJhbSBjcmVhdHVyZSB7Q3JlYXR1cmVJbmZvfVxuICAgICAqIEBwYXJhbSBvdXRjb21lIHtPdXRjb21lfSBvdXRjb21lIG9iamVjdCBjb250YWluaW5nIG91dGNvbWUgYW5kIHAgdmFyaWFibGVcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc0Rlc2lyZWRPdXRjb21lKGNyZWF0dXJlOiBDcmVhdHVyZUluZm8sIG91dGNvbWU6IE91dGNvbWUpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgZG1nID0gb3V0Y29tZS52YWwucmVkdWNlKChhY2MsIHZhbCkgPT4ge1xuICAgICAgICAgICAgaWYgKHZhbCA9PT0gY3JlYXR1cmUuaWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFjYyArIDE7XG4gICAgICAgICAgICBlbHNlIHJldHVybiBhY2M7XG4gICAgICAgIH0sIDApO1xuICAgICAgICByZXR1cm4gKChjcmVhdHVyZS50b0RpZSAmJiBkbWcgPj0gY3JlYXR1cmUuaHApIHx8ICghY3JlYXR1cmUudG9EaWUgJiYgZG1nIDwgY3JlYXR1cmUuaHApKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGaWx0ZXJzIG91dGNvbWVzIHRvIG9ubHkgb3V0Y29tZXMgdGhhdCBoYXZlIGRlc2lyZWQgcmVzdWx0c1xuICAgICAqIEBwYXJhbSBjcmVhdHVyZUlucHV0cyB7UmVhZG9ubHlBcnJheTxDcmVhdHVyZUluZm8+fSBhcnJheSB3aXRoIGNyZWF0dXJlIG9iamVjdHNcbiAgICAgKiBAcGFyYW0gb3V0Y29tZXMge1JlYWRvbmx5QXJyYXk8T3V0Y29tZT59IGFycmF5IG9mIG91dGNvbWVzXG4gICAgICogQHJldHVybnMge1JlYWRvbmx5QXJyYXk8T3V0Y29tZT59XG4gICAgICovXG4gICAgZnVuY3Rpb24gZmlsdGVyT3V0Y29tZXMoY3JlYXR1cmVJbnB1dHM6IFJlYWRvbmx5QXJyYXk8Q3JlYXR1cmVJbmZvPiwgb3V0Y29tZXM6IFJlYWRvbmx5QXJyYXk8T3V0Y29tZT4pOiBSZWFkb25seUFycmF5PE91dGNvbWU+IHtcbiAgICAgICAgcmV0dXJuIGNyZWF0dXJlSW5wdXRzLnJlZHVjZSgoYWNjLCBjKSA9PlxuICAgICAgICAgICAgICAgIGFjYy5maWx0ZXIob3V0Y29tZSA9PiBpc0Rlc2lyZWRPdXRjb21lKGMsIG91dGNvbWUpKSxcbiAgICAgICAgICAgIG91dGNvbWVzKTtcbiAgICB9XG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNhbGN1bGF0ZShjcmVhdHVyZUlucHV0OiBSZWFkb25seUFycmF5PENyZWF0dXJlSW5mbz4sIHBpbmdzOiBudW1iZXIpOiBudW1iZXIge1xuICAgICAgICAvLyBFYWNoIENyZWF0dXJlIGlzIHJlcHJlc2VudGVkIGFzIGFuIGFycmF5IHdpdGggbGVuZ3RoID0gaHAgYW5kIGZpbGxlZCB3aXRoIGl0cyBuYW1lIG9uIGVhY2ggZW50cnlcbiAgICAgICAgY29uc3QgY3JlYXR1cmVzOiBSZWFkb25seUFycmF5PENyZWF0dXJlPiA9IGNyZWF0dXJlSW5wdXQubWFwKGMgPT4gQXJyYXkoYy5ocCkuZmlsbChjLmlkKSksXG4gICAgICAgICAgICByb290ID0gY3JlYXRlT3V0Y29tZVRyZWUoY3JlYXR1cmVzLCBwaW5ncyksXG4gICAgICAgICAgICBvdXRjb21lcyA9IGdldE91dGNvbWVzKHJvb3QpLFxuICAgICAgICAgICAgZmlsdGVyZWRPdXRjb21lcyA9IGZpbHRlck91dGNvbWVzKGNyZWF0dXJlSW5wdXQsIG91dGNvbWVzKSxcbiAgICAgICAgICAgIHN1bW1lZFByb2JhYmlsaXR5ID0gZmlsdGVyZWRPdXRjb21lcy5yZWR1Y2UoKGFjYywgb3V0Y29tZSkgPT4gYWNjICsgb3V0Y29tZS5wLCAwKTtcbiAgICAgICAgcmV0dXJuIHN1bW1lZFByb2JhYmlsaXR5O1xuICAgIH1cbn1cbi8qKlxuICogRklYTUUgSSB3b25kZXIgd2hhdCBJIHdhcyB0aGlua2luZyB3aGVuIEkgbWFkZSBDcmVhdHVyZSByZXByZXNlbnRlZCBieSBhbiBhcnJheSAodGhhdCBpcyBjb3BpZWQgZXZlcnl0aW1lXG4gKiBpdCBpcyBwaW5nZWQgd2hpY2ggaXMgYSBsb3QgaW4gYWxsIG91dGNvbWVzIHRvdGFsKS4gSWYgY3JlYXR1cmUgd2FzIHtuYW1lLCBocH0gaXQgd291bGQgcHJvYmFibHkgYmUgbXVjaCBsZXNzXG4gKiBpbXBhY3RmdWwgb24gcGVyZm9ybWFuY2VcbiAqLyIsIlwidXNlIHN0cmljdFwiO1xuaW1wb3J0ICogYXMgJCBmcm9tIFwianF1ZXJ5XCI7XG5pbXBvcnQge1VJLCBIZWxwZXJzfSBmcm9tIFwiLi9oZWxwZXJzXCJcbmltcG9ydCB7UGluZywgQ3JlYXR1cmVJbmZvfSBmcm9tIFwiLi9waW5nLWNhbGN1bGF0aW9uXCI7XG5cbi8vIFRlbXBsYXRlIGZvciBjcmVhdGluZyBjcmVhdHVyZSBjYXJkc1xuY29uc3QgYmFzZSA9ICQoXCIjYmFzZVwiKTtcblxuLyoqXG4gKiBDaGFuZ2VzIGNyZWF0dXJlIGNhcmQgY29sb3IgZGVwZW5kaW5nIG9uIGRlc2lyZWQgbGlmZSBzdGF0dXNcbiAqL1xuZnVuY3Rpb24gY2hhbmdlTGlmZVN0YXR1cyhjb250ZXh0OiBKUXVlcnk8SFRNTEVsZW1lbnQ+KTogdm9pZCB7XG4gICAgY29uc3QgbmV3VmFsOiBudW1iZXIgPSBOdW1iZXIoJChjb250ZXh0KS52YWwoKSksXG4gICAgICAgIGNyZWF0dXJlQ2FyZCA9IGNvbnRleHQuY2xvc2VzdChcIi5jYXJkXCIpO1xuICAgIGlmIChuZXdWYWwpIHtcbiAgICAgICAgY3JlYXR1cmVDYXJkLnJlbW92ZUNsYXNzKFwiY2FyZC1zdWNjZXNzXCIpO1xuICAgICAgICBpZiAoY3JlYXR1cmVDYXJkLmhhc0NsYXNzKFwiZ29kXCIpKSB7XG4gICAgICAgICAgICBjcmVhdHVyZUNhcmQuYWRkQ2xhc3MoXCJjYXJkLXByaW1hcnlcIik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjcmVhdHVyZUNhcmQuYWRkQ2xhc3MoXCJjYXJkLWluZm9cIik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGlmIChjcmVhdHVyZUNhcmQuaGFzQ2xhc3MoXCJnb2RcIikpIHtcbiAgICAgICAgICAgIGNyZWF0dXJlQ2FyZC5yZW1vdmVDbGFzcyhcImNhcmQtcHJpbWFyeVwiKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNyZWF0dXJlQ2FyZC5yZW1vdmVDbGFzcyhcImNhcmQtaW5mb1wiKTtcbiAgICAgICAgfVxuICAgICAgICBjcmVhdHVyZUNhcmQuYWRkQ2xhc3MoXCJjYXJkLXN1Y2Nlc3NcIik7XG4gICAgfVxufVxuLyoqXG4gKiBDb2xsZWN0cyB1c2VyIGNyZWF0dXJlIGlucHV0IGFuZCBjcmVhdGVzIGFuIGFycmF5IG9mIGNyZWF0dXJlIG9iamVjdHNcbiAqIEByZXR1cm5zIHtBcnJheX0gIGFycmF5IHdpdGggb2JqZWN0cyBjb250YWluaW5nIHRvRGllLCBocCwgaWQgdmFyaWFibGVzXG4gKi9cbmZ1bmN0aW9uIGdldENyZWF0dXJlSW5wdXQoKTogQXJyYXk8Q3JlYXR1cmVJbmZvPiB7XG4gICAgY29uc3QgaW5wdXRzOiBBcnJheTxIVE1MRWxlbWVudD4gPSAkLm1ha2VBcnJheSgkKFwiLmNhcmQuY3JlYXR1cmVcIikubm90KFwiI2Jhc2VcIikpO1xuICAgIHJldHVybiBpbnB1dHMubWFwKCh2YWwsIGluZGV4KSA9PiB7XG4gICAgICAgIGNvbnN0IGlucHV0ID0gJCh2YWwpLFxuICAgICAgICAgICAgaHAgPSBOdW1iZXIoJChpbnB1dCkuZmluZChcImlucHV0LmNyZWF0dXJlLWhwXCIpLnZhbCgpKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRvRGllOiBOdW1iZXIoJChpbnB1dCkuZmluZChcInNlbGVjdFwiKS52YWwoKSkgPT09IDEsXG4gICAgICAgICAgICBocDogaHAsXG4gICAgICAgICAgICBpZDogaW5kZXhcbiAgICAgICAgfVxuICAgIH0pO1xufVxuLyoqXG4gKiBSZWFkcyBwaW5nIGlucHV0IGFuZCBhZGp1c3RzIHRoZSB2YWx1ZSB0byBiZSB3aXRoaW4gdmFsaWQgcmFuZ2UuIFVwZGF0ZXMgdGhlIGlucHV0IHZhbHVlIHRvIGFkanVzdGVkIHZhbHVlXG4gKiBhbmQgdGhlbiByZXR1cm5zIGFkanVzdGVkIHZhbHVlXG4gKiBAcmV0dXJucyB7bnVtYmVyfSAgICBhZGp1c3RlZCBwaW5nIHZhbHVlXG4gKi9cbmZ1bmN0aW9uIGdldFBpbmdJbnB1dCgpOiBudW1iZXIge1xuICAgIGNvbnN0IHBpbmdJbnB1dDogSlF1ZXJ5PEhUTUxFbGVtZW50PiA9ICQoXCIjcGluZy1jYXJkXCIpLmZpbmQoXCJpbnB1dFwiKSxcbiAgICAgICAgcGluZ3M6IG51bWJlciA9IHBpbmdJbnB1dC52YWwoKSBhcyBudW1iZXIsXG4gICAgICAgIHBpbmdBZGp1c3RlZDogbnVtYmVyID0gTWF0aC5taW4oTWF0aC5tYXgocGluZ3MsIDEpLCAxMik7XG4gICAgcGluZ0lucHV0LnZhbChwaW5nQWRqdXN0ZWQpO1xuICAgIHJldHVybiBwaW5nQWRqdXN0ZWQ7XG59XG5mdW5jdGlvbiBjbGVhbnVwTG9hZEluZGljYXRvcigpIHtcbiAgICAkKFwiI2NhbGN1bGF0ZS1idG5cIikucmVtb3ZlQ2xhc3MoXCJkaXNhYmxlZFwiKTtcbiAgICAkKFwiI2NhbGN1bGF0ZS1idG4gc3BhblwiKS5oaWRlKCk7XG59XG4vKipcbiAqIERpc2FibGVzIGNhbGN1bGF0ZSBidXR0b24gYW5kIHNob3dzIGEgc3Bpbm5pbmcgbG9hZCBpY29uXG4gKi9cbmZ1bmN0aW9uIGFkZExvYWRpbmdJbmRpY2F0b3IoKTogdm9pZCB7XG4gICAgJChcIiNjYWxjdWxhdGUtYnRuXCIpLmFkZENsYXNzKFwiZGlzYWJsZWRcIik7XG4gICAgJChcIiNjaGFuY2UtdGV4dC1udW1iZXJcIikuaHRtbChcIi0tLVwiKTtcbiAgICAkKFwiI2NhbGN1bGF0ZS1idG4gc3BhblwiKS5zaG93KCk7XG59XG4vKipcbiAqIENhbGN1bGF0ZXMgcGluZyBwcm9iYWJpbGl0eSBmcm9tIHVzZXIgaW5wdXQgYW5kIGRpc3BsYXlzIHJlc3VsdC5cbiAqL1xuZnVuY3Rpb24gcnVuKCkge1xuICAgIGNvbnN0IGNyZWF0dXJlcyA9IGdldENyZWF0dXJlSW5wdXQoKSxcbiAgICAgICAgcGluZ3MgPSBnZXRQaW5nSW5wdXQoKSxcbiAgICAgICAgcHJvbWlzZSA9IEhlbHBlcnMudGltZUZ1bmN0aW9uKFBpbmcuY2FsY3VsYXRlLCBjcmVhdHVyZXMsIHBpbmdzLCB0cnVlKTtcbiAgICBwcm9taXNlLnRoZW4oKHt0LCByZXN1bHRzfSkgPT4ge1xuICAgICAgICBVSS51cGRhdGVSZXN1bHRzKCh0IC8gMTAwMCkudG9GaXhlZCgzKSwgcmVzdWx0cyk7XG4gICAgICAgIFVJLnNoYWtlU2NyZWVuKHJlc3VsdHMpO1xuICAgICAgICBjbGVhbnVwTG9hZEluZGljYXRvcigpO1xuICAgIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaW5pdCgpOiB2b2lkIHtcbiAgICAkKFwiLmNyZWF0dXJlLmdvZCBzZWxlY3RcIikuY2hhbmdlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY2hhbmdlTGlmZVN0YXR1cygkKHRoaXMpKTtcbiAgICB9KTtcbiAgICAkKFwiI2FkZC1jYXJkLWJ0blwiKS5jbGljaygoKSA9PiB7XG4gICAgICAgIGNvbnN0IG5ld0NyZWF0dXJlID0gVUkuYWRkQ2FyZExpc3RlbmVyKGJhc2UpO1xuICAgICAgICBuZXdDcmVhdHVyZS5jaGFuZ2UoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY2hhbmdlTGlmZVN0YXR1cygkKHRoaXMpLmZpbmQoXCJzZWxlY3RcIikpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICAkKFwiI2NhbGN1bGF0ZS1idG5cIikuY2xpY2soKCkgPT4ge1xuICAgICAgICBhZGRMb2FkaW5nSW5kaWNhdG9yKCk7XG4gICAgICAgIHNldFRpbWVvdXQocnVuLCAxMDApOyAgLy8gVGltZW91dCBpcyB1c2VkIHRvIGxldCBET00gdXBkYXRlIGxvYWQgaW5kaWNhdG9yIGJlZm9yZSBoZWF2eSBydW4gZnVuY3Rpb25cbiAgICB9KTtcbiAgICBVSS5pbml0KCk7XG59Il19
