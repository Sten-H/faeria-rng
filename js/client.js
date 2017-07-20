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
 * This namespace uses side effects heavily, having pure functions affected performance in a very bad way I found.
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
        var temp = a[i];
        a[i] = a[j];
        a[j] = temp;
    }
    /**
     * Shuffles array in place. https://stackoverflow.com/a/6274381
     * @param {Array} a Array to be shuffled.
     * @return {Array}  returns shuffled array
     */
    function shuffle(a) {
        for (var i = a.length - 1; i >= 0; i--) {
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
     * Used after starting hand is mulliganed to put non target cards back in deck.
     * @param {Array<number>} deck
     */
    function replaceNonTarget(deck) {
        deck.push(-1);
        var newIndex = helpers_1.Helpers.getRandomInt(0, deck.length);
        swap(deck, deck.length - 1, newIndex);
    }
    /**
     * Throws away all non target cards in starting hand.
     * @param  {Array} deck           Deck represented as integer array
     * @return {Array}                An array where the first object is active hand and second is active deck
     */
    function mulligan(deck) {
        var startingHand = deck.slice(0, 3), activeDeck = deck.slice(3), handAfterMulligan = startingHand.filter(function (val) { return val >= 0; }), mulliganCount = 3 - handAfterMulligan.length;
        /* Put mulliganed cards back in deck. All mulliganed cards are of no interest (-1) */
        helpers_1.Helpers.range(0, mulliganCount).forEach(function (_) { return replaceNonTarget(activeDeck); });
        return [handAfterMulligan, activeDeck];
    }
    /**
     * Performs a mulligan, shuffles again, draws remaining cards and checks if all cards are represented
     * at least the needed amount of times.
     * @param  {Array} deck     Deck represented as integer array, should be shuffled beforehand
     * @param  {Array} targetCards     Array containing desired cards with information
     * @param  {Number} drawAmount amount of cards drawn
     * @return {boolean}          Returns true if drawn cards contain all required cards.
     */
    function trial(deck, targetCards, drawAmount) {
        var _a = mulligan(deck), handAfterMulligan = _a[0], deckAfterMulligan = _a[1], remainingDraws = drawAmount - handAfterMulligan.length, // 3 is starting hand size before mulligan
        handAfterDraws = handAfterMulligan.concat.apply(handAfterMulligan, deckAfterMulligan.slice(0, remainingDraws));
        // Return true if every needed card is contained in drawn cards
        return targetCards.every(function (card) { return contains(handAfterDraws, card); });
    }
    /**
     * Simulates several separate instances of decks with
     * drawAmount of draws and checks if required cards are contained in hand.
     * @param  {Array} targetCards     Array containing desired cards with information
     * @param  {number} drawAmount amount of cards drawn
     * @param  {number} tries How many times drawSimulation should be run
     * @return {number}            ratio of successful draws to total draws
     */
    function simulate(targetCards, drawAmount, tries) {
        if (tries === void 0) { tries = 200000; }
        var deck = createDeck(targetCards), desiredOutcomes = helpers_1.Helpers.range(0, tries)
            .map(function (_) { return trial(shuffle(deck), targetCards, drawAmount); })
            .filter(function (v) { return v; }).length;
        return desiredOutcomes / tries;
    }
    Simulation.simulate = simulate;
})(Simulation || (Simulation = {}));
exports.runSimulation = Simulation.simulate;
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
        return { isValid: false,
            errorMsg: $("<span>").append("Target card ", helpers_1.UI.highlightWrap("amounts"), " sum exceeds deck size") };
    }
    var totalNeeded = cardInputs.reduce(function (acc, input) { return acc + Number(input.needed); }, 0);
    // User needs more cards than there are draws, will always fail.
    if (totalNeeded > drawAmount) {
        return { isValid: false,
            errorMsg: $("<span>").append("Fewer ", helpers_1.UI.highlightWrap("draws "), "than ", helpers_1.UI.highlightWrap("needed"), " cards") };
    }
    var validNeeded = cardInputs.every(function (input) { return Number(input.total) >= Number(input.needed); });
    // One or more needed values exceeds its amount in deck
    if (!validNeeded) {
        return { isValid: false,
            errorMsg: $("<span>").append(helpers_1.UI.highlightWrap("Needed"), " cannot be larger than card ", helpers_1.UI.highlightWrap("amount"), " in deck") };
    }
    return { isValid: true, errorMsg: $("") };
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
function cleanupLoadingIndicator() {
    $("#calculate-btn span").hide();
    $("#calculate-btn").removeClass("disabled");
}
/**
 * Validates user input and runs drawSimulation if input is valid.
 */
function run() {
    var smartMulligan = $("#mulligan-checkbox").is(':checked'), drawAmount = $(".draw-amount").val(), cardInfo = getCardInput(), _a = isInputValid(drawAmount, cardInfo), isValid = _a.isValid, errorMsg = _a.errorMsg;
    if (isValid) {
        var func = (smartMulligan) ? Draw.runSimulation : Draw.runCalculation, promise = helpers_1.Helpers.timeFunction(func, cardInfo, drawAmount);
        promise.then(function (_a) {
            var t = _a.t, results = _a.results;
            cleanupLoadingIndicator();
            helpers_1.UI.updateResults((t / 1000).toFixed(3), results);
            resultScreenEffects(results);
        });
    }
    else {
        cleanupLoadingIndicator();
        displayError(errorMsg);
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
var R = require("ramda"); // All I want is basically to use a lazy seq once :/
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
        return R.range(start, end);
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

},{"jquery":undefined,"jrumble":undefined,"ramda":undefined}],"/home/lax/devel/faeria/app/js/main.ts":[function(require,module,exports){
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
    function pingCreature(creature) {
        return {
            id: creature.id,
            hp: creature.hp - 1
        };
    }
    function _createOutcomeTree(creatures, pings) {
        if (pings <= 0 || creatures.length <= 0) {
            return [];
        }
        return creatures.map(function (targetCreature, index) {
            var probability = 1 / creatures.length, targetId = targetCreature.id, creaturesAfterPing = creatures
                .map(function (creature, i) { return (i === index) ? pingCreature(creature) : creature; })
                .filter(function (creature) { return creature.hp !== 0; }); // Filter out tree root value (-1) from outcomes
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
        var creatures = creatureInput.map(function (c) { return ({ id: c.id, hp: c.hp }); }), root = createOutcomeTree(creatures, pings), outcomes = getOutcomes(root), filteredOutcomes = filterOutcomes(creatureInput, outcomes), summedProbability = filteredOutcomes.reduce(function (acc, outcome) { return acc + outcome.p; }, 0);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhcHAvanMvZHJhdy1jYWxjdWxhdGlvbi50cyIsImFwcC9qcy9kcmF3LW1haW4udHMiLCJhcHAvanMvaGVscGVycy50cyIsImFwcC9qcy9tYWluLnRzIiwiYXBwL2pzL3BpbmctY2FsY3VsYXRpb24udHMiLCJhcHAvanMvcGluZy1tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUEsWUFBWSxDQUFDOztBQUNiLHFDQUFrQztBQUVyQixRQUFBLFNBQVMsR0FBRyxFQUFFLENBQUM7QUFFNUI7OztHQUdHO0FBQ0gsSUFBVSxXQUFXLENBbUZwQjtBQW5GRCxXQUFVLFdBQVc7SUFHakI7Ozs7O09BS0c7SUFDSCxnQkFBZ0IsQ0FBUyxFQUFFLENBQVM7UUFDaEMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqQixNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDZCxDQUFDO1FBQ0QsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDVixNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ2IsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMxQyxDQUFDO0lBQ0wsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCwwQkFBMEIsWUFBZ0M7UUFDdEQsTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsVUFBQyxHQUFHLEVBQUUsS0FBSztZQUNsQyxJQUFNLFlBQVksR0FBVyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQUMsT0FBTyxFQUFFLElBQUk7Z0JBQ3BELE1BQU0sQ0FBQyxPQUFPLEdBQUcsTUFB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LENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUM3QixnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUM5QixDQUFDLENBQUMsQ0FBQztJQUNILENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDckIsSUFBTSxXQUFXLEdBQUcsWUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QyxXQUFXLENBQUMsTUFBTSxDQUFDO1lBQ2YsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQzdDLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQyxDQUFDLENBQUM7SUFDSCxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDdEIsbUJBQW1CLEVBQUUsQ0FBQztRQUN0QixVQUFVLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUUsNkVBQTZFO0lBQ3hHLENBQUMsQ0FBQyxDQUFDO0lBQ0gsWUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ2QsQ0FBQztBQWZELG9CQWVDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xuaW1wb3J0IHtIZWxwZXJzfSBmcm9tIFwiLi9oZWxwZXJzXCI7XG5cbmV4cG9ydCBjb25zdCBERUNLX1NJWkUgPSAzMDtcbmV4cG9ydCB0eXBlIENhcmRJbmZvID0geyBuZWVkZWQ6IG51bWJlciwgdG90YWw6IG51bWJlciwgdmFsdWU6IG51bWJlcn07XG4vKipcbiAqIENhbGN1bGF0aW9uIG5hbWVzcGFjZSBjYWxjdWxhdGVzIHByb2JhYmlsaXR5IHRvIGRyYXcgZGVzaXJlZCBjYXJkcyB1c2luZyBjb21iaW5hdG9yaWNzLiBJdHMgZGlzYWR2YW50YWdlIGlzIHRoYXRcbiAqIGl0IGRvZXMgbm90IGFjY291bnQgZm9yIHN0YXJ0aW5nIGhhbmQgbXVsbGlnYW5zIGJ1dCBpcyBtdWNoIGZhc3RlciB0aGF0IHNpbXVsYXRpb24uXG4gKi9cbm5hbWVzcGFjZSBDYWxjdWxhdGlvbiB7XG4gICAgdHlwZSBDYXJkID0geyBkcmF3bjogbnVtYmVyLCB0b3RhbDogbnVtYmVyfTtcbiAgICB0eXBlIENvbWJpbmF0aW9uID0gQXJyYXk8Q2FyZD47XG4gICAgLyoqXG4gICAgICogUmVjdXJzaXZlIGltcGxlbWVudGF0aW9uIG9mIG4gY2hvb3NlIGsuXG4gICAgICogQHBhcmFtICB7aW50fSBuIFRvdGFsIGFtb3VudCB0byBjaG9vc2UgZnJvbVxuICAgICAqIEBwYXJhbSAge2ludH0gayBIb3cgbWFueSB0byBjaG9vc2VcbiAgICAgKiBAcmV0dXJuIHtpbnR9ICAgUmV0dXJucyBob3cgbWFueSBwb3NzaWJsZSBjb21iaW5hdGlvbnMgY2FuIGJlIGRyYXduIGRpc3JlZ2FyZGluZyBvcmRlciBkcmF3blxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNob29zZShuOiBudW1iZXIsIGs6IG51bWJlcik6IG51bWJlciB7XG4gICAgICAgIGlmIChuIDwgMCB8fCBrIDwgMCkge1xuICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICB9XG4gICAgICAgIGlmIChrID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAobiAqIGNob29zZShuIC0gMSwgayAtIDEpKSAvIGs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBudW1iZXIgb2YgY29tYmluYXRpb25zIHRoZSBjYXJkcyBjYW4gbWFrZS4gRklYTUUgZXhwbGFpbiBiZXR0ZXIuXG4gICAgICogQHBhcmFtIGNvbWJpbmF0aW9uc1xuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNvbWJpbmF0aW9uQ291bnQoY29tYmluYXRpb25zOiBBcnJheTxDb21iaW5hdGlvbj4pOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gY29tYmluYXRpb25zLnJlZHVjZSgoc3VtLCBjb21ibykgPT4ge1xuICAgICAgICAgICAgY29uc3QgY29tYm9Qcm9kdWN0OiBudW1iZXIgPSBjb21iby5yZWR1Y2UoKHByb2R1Y3QsIGNhcmQpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvZHVjdCAqIGNob29zZShjYXJkLnRvdGFsLCBjYXJkLmRyYXduKTtcbiAgICAgICAgICAgIH0sIDEpO1xuICAgICAgICAgICAgcmV0dXJuIGNvbWJvUHJvZHVjdCArIHN1bTtcbiAgICAgICAgfSwgMCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmlsbHMgYSBjb21iaW5hdGlvbnMgb2YgdGFyZ2V0IGNhcmRzIHdpdGggcmVtYWluaW5nIGRyYXdzIGZyb20gbm9uIHRhcmdldCBjYXJkcyBhbmQgcmV0dXJucyB0aGF0IHVwZGF0ZWRcbiAgICAgKiBhcnJheSBvZiBjb21iaW5hdGlvbnMuXG4gICAgICogQHBhcmFtIHRhcmdldENvbWJpbmF0aW9uc1xuICAgICAqIEBwYXJhbSBkcmF3c1xuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmaWxsQ29tYmluYXRpb25zKHRhcmdldENvbWJpbmF0aW9uczogQXJyYXk8Q29tYmluYXRpb24+LCBkcmF3czogbnVtYmVyKTogQXJyYXk8Q29tYmluYXRpb24+IHtcbiAgICAgICAgY29uc3Qgbm9uVGFyZ2V0QW1vdW50OiBudW1iZXIgPSBERUNLX1NJWkUgLSB0YXJnZXRDb21iaW5hdGlvbnNbMF0ucmVkdWNlKChhY2MsIGNhcmQpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYWNjICsgY2FyZC50b3RhbDtcbiAgICAgICAgICAgIH0sIDApO1xuICAgICAgICAvLyBBZGQgdGhlIHJlbWFpbmluZyBkcmF3cyAoYWZ0ZXIgY29tYmluYXRpb24gaGFzIGJlZW4gZHJhd24pIGZyb20gbm9uIHRhcmdldCBjYXJkc1xuICAgICAgICByZXR1cm4gdGFyZ2V0Q29tYmluYXRpb25zLm1hcCgoY29tYm8pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGRyYXduOiBudW1iZXIgPSBjb21iby5yZWR1Y2UoKGRyYXdBY2MsIGNhcmQpID0+IGRyYXdBY2MgKyBjYXJkLmRyYXduLCAwKSxcbiAgICAgICAgICAgICAgICBkcmF3c0xlZnQ6IG51bWJlciA9IE1hdGgubWF4KGRyYXdzIC0gZHJhd24sIDApO1xuICAgICAgICAgICAgcmV0dXJuIGNvbWJvLmNvbmNhdCh7dG90YWw6IG5vblRhcmdldEFtb3VudCwgZHJhd246IGRyYXdzTGVmdH0pXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYWxsIHZhbGlkIGNvbWJpbmF0aW9uIG9mIHRhcmdldCBjYXJkIGRyYXdzLiBEcmF3cyBvbmx5IGZyb20gdGFyZ2V0IGNhcmRzLCB0aGUgZGVjayBpcyBub3QgY29uc2lkZXJlZC5cbiAgICAgKiBFdmVyeSB2YWxpZCBjYXJkIGRyYXcgaXMgcmVwcmVzZW50ZWQgYXMgYW4gYXJyYXkgd2l0aCB0d28gdmFsdWVzIFt0b3RhbCwgZHJhd25dLCBmb3IgYSB0YXJnZXRDYXJkIHtuZWVkZWQ6IDIsIGFtb3VudDogM31cbiAgICAgKiB0d28gYXJyYXkgd2lsbCBiZSBjcmVhdGVkIHNpbmNlIHRoZXJlIGFyZSB0dm8gdmFsaWQgY29tYmluYXRpb25zIG9mIHRoYXQgY2FyZCAoZHJhd24gPSAyIGFuZCBkcmF3biA9IDMpLFxuICAgICAqIGVhY2ggc2VwYXJhdGUgY29tYmluYXRpb24gb2YgYSBjYXJkIHdpbGwgdGhlbiBiZSBjb21iaW5lZCB3aXRoIGFsbCBvdGhlciBjYXJkcyB2YWxpZCBjb21iaW5hdGlvbnMgdG8gY3JlYXRlXG4gICAgICogYWxsIHZhbGlkIGNvbWJpbmF0aW9ucyBvZiB0YXJnZXQgY2FyZCBkcmF3cy5cbiAgICAgKiBAcGFyYW0gdGFyZ2V0Q2FyZHMge0NhcmRJbmZvfVxuICAgICAqIEBwYXJhbSBhY3RpdmVDb21ibyB7Q29tYmluYXRpb259XG4gICAgICogQHJldHVybnMge0FycmF5PENvbWJpbmF0aW9uPn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiB0YXJnZXRDb21iaW5hdGlvbnModGFyZ2V0Q2FyZHM6IEFycmF5PENhcmRJbmZvPiwgYWN0aXZlQ29tYm86IENvbWJpbmF0aW9uID0gW10pOiBBcnJheTxDb21iaW5hdGlvbj4ge1xuICAgICAgICBpZiAodGFyZ2V0Q2FyZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gW2FjdGl2ZUNvbWJvXTsgIC8vIE5vdCBlbnRpcmVseSBzdXJlIHdoeSBJIG5lZWQgdG8gd3JhcCB0aGlzXG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgW2NhcmQsIC4uLmNhcmRzTGVmdF0gPSB0YXJnZXRDYXJkcztcbiAgICAgICAgcmV0dXJuIEhlbHBlcnMucmFuZ2VJbmNsdXNpdmUoY2FyZC5uZWVkZWQsIGNhcmQudG90YWwpLnJlZHVjZSgocmVzdWx0cywgY3VycmVudE5lZWRlZCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdHMuY29uY2F0KHRhcmdldENvbWJpbmF0aW9ucyhjYXJkc0xlZnQsIGFjdGl2ZUNvbWJvLmNvbmNhdCh7dG90YWw6IGNhcmQudG90YWwsIGRyYXduOiBjdXJyZW50TmVlZGVkfSkpKTtcbiAgICAgICAgfSwgW10pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYXJkcyB7QXJyYXk8Q2FyZEluZm8+fSAgICAgQXJyYXkgY29udGFpbmluZyBPYmplY3RzIHdpdGggaW5mb3JtYXRpb24gYWJvdXQgdGFyZ2V0IGNhcmRzIChhbW91bnQsIG5lZWRlZClcbiAgICAgKiBAcGFyYW0gZHJhd3Mge251bWJlcn0gICAgQW1vdW50IG9mIGRyYXdzXG4gICAgICogQHJldHVybnMge251bWJlcn0gICAgICAgIENoYW5jZSB0byBkcmF3IGRlc2lyZWQgaGFuZFxuICAgICAqL1xuICAgIGV4cG9ydCBmdW5jdGlvbiBjYWxjdWxhdGUoY2FyZHM6IEFycmF5PENhcmRJbmZvPiwgZHJhd3M6IG51bWJlcik6IG51bWJlciB7XG4gICAgICAgIGNvbnN0IHZhbGlkVGFyZ2V0Q29tYmluYXRpb25zID0gdGFyZ2V0Q29tYmluYXRpb25zKGNhcmRzKSxcbiAgICAgICAgICAgIGFsbFZhbGlkQ29tYmluYXRpb25zID0gZmlsbENvbWJpbmF0aW9ucyh2YWxpZFRhcmdldENvbWJpbmF0aW9ucywgZHJhd3MpO1xuICAgICAgICByZXR1cm4gY29tYmluYXRpb25Db3VudChhbGxWYWxpZENvbWJpbmF0aW9ucykgLyBjaG9vc2UoREVDS19TSVpFLCBkcmF3cyk7XG4gICAgfVxufVxuXG4vKipcbiAqIFNpbXVsYXRpb24gbmFtZXNwYWNlIGNhbGN1bGF0ZXMgZHJhdyBwcm9iYWJpbGl0eSBieSBzaW11bGF0aW5nIG1hbnkgaGFuZHMgZHJhd24gYW5kIGxvb2tpbmcgYXQgdGhlIG51bWJlciBvZiBkZXNpcmVkIGhhbmRzXG4gKiBmb3VuZCBpbiByZWxhdGlvbiB0byBhbGwgaGFuZHMgZHJhd24uIEl0IGFsc28gc2ltdWxhdGVzIGludGVsbGlnZW50IG11bGxpZ2FucyB3aGljaCBpcyBpdHMgb25seSBhZHZhbnRhZ2Ugb3ZlclxuICogQ2FsY3VsYXRpb24gbmFtZXNwYWNlIHNvbHV0aW9uLlxuICogVGhpcyBuYW1lc3BhY2UgdXNlcyBzaWRlIGVmZmVjdHMgaGVhdmlseSwgaGF2aW5nIHB1cmUgZnVuY3Rpb25zIGFmZmVjdGVkIHBlcmZvcm1hbmNlIGluIGEgdmVyeSBiYWQgd2F5IEkgZm91bmQuXG4gKi9cbm5hbWVzcGFjZSBTaW11bGF0aW9uIHtcbiAgICAvKipcbiAgICAgKiBJbiBwbGFjZSBzd2FwcyB2YWx1ZXMgb2YgaSBhbmQgaiBpbmRleGVzIGluIGFycmF5LlxuICAgICAqIEBwYXJhbSAge0FycmF5fSBhIFtkZXNjcmlwdGlvbl1cbiAgICAgKiBAcGFyYW0gIHtpbnR9IGkgaW5kZXggMVxuICAgICAqIEBwYXJhbSAge2ludH0gaiBpbmRleCAyXG4gICAgICovXG4gICAgZnVuY3Rpb24gc3dhcChhOiBBcnJheTxhbnk+LCBpOiBudW1iZXIsIGo6IG51bWJlcik6IHZvaWQge1xuICAgICAgICBsZXQgdGVtcCA9IGFbaV07XG4gICAgICAgIGFbaV0gPSBhW2pdO1xuICAgICAgICBhW2pdID0gdGVtcDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU2h1ZmZsZXMgYXJyYXkgaW4gcGxhY2UuIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vYS82Mjc0MzgxXG4gICAgICogQHBhcmFtIHtBcnJheX0gYSBBcnJheSB0byBiZSBzaHVmZmxlZC5cbiAgICAgKiBAcmV0dXJuIHtBcnJheX0gIHJldHVybnMgc2h1ZmZsZWQgYXJyYXlcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzaHVmZmxlKGE6IEFycmF5PGFueT4pOiBBcnJheTxhbnk+IHtcbiAgICAgICAgZm9yIChsZXQgaSA9IGEubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgIGxldCBqID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogaSk7XG4gICAgICAgICAgICBzd2FwKGEsIGksIGopO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFycmF5IG9mIGludGVnZXJzIHJlcHJlc2VudGluZyB0aGUgZGVjay4gQ2FyZHMgb2Ygbm8gaW50ZXJlc3QgYXJlIGFkZGVkIGFzIC0xLCB0YXJnZXQgY2FyZHNcbiAgICAgKiBhcmUgYWRkZWQgd2l0aCB2YWx1ZSBjb250YWluZWQgaW4gY2FyZCBPYmplY3QgaW4gdGFyZ2V0Q2FyZHMgYXJyYXkuXG4gICAgICogQHBhcmFtICB7QXJyYXl9IHRhcmdldENhcmRzIEFycmF5IGNvbnRhaW5pbmcgY2FyZCBPYmplY3RzXG4gICAgICogQHJldHVybiB7QXJyYXl9ICAgICAgICAgIFJldHVybnMgYXJyYXkgcmVwcmVzZW50aW5nIHRoZSBwb3B1bGF0ZWQgZGVjay5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjcmVhdGVEZWNrKHRhcmdldENhcmRzOiBBcnJheTxDYXJkSW5mbz4pOiBBcnJheTxudW1iZXI+IHtcbiAgICAgICAgY29uc3QgdGFyZ2V0cyA9IHRhcmdldENhcmRzLm1hcChjYXJkID0+IEFycmF5PG51bWJlcj4oY2FyZC50b3RhbCkuZmlsbChjYXJkLnZhbHVlKSksXG4gICAgICAgICAgICBub25UYXJnZXRzID0gQXJyYXkoMzApLmZpbGwoLTEpO1xuICAgICAgICByZXR1cm4gW10uY29uY2F0KC4uLnRhcmdldHMsIG5vblRhcmdldHMpLnNsaWNlKDAsIDMwKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIGRlY2sgY29udGFpbnMgY2FyZCBpbiB0aGUgbmVlZGVkIGFtb3VudC5cbiAgICAgKiBAcGFyYW0gIHtBcnJheX0gZGVjayAgRGVjayByZXByZXNlbnRlZCBhcyBpbnRlZ2VyIGFycmF5XG4gICAgICogQHBhcmFtICB7Q2FyZEluZm99IGNhcmQgU291Z2h0IGFmdGVyIGNhcmQgb2JqZWN0XG4gICAgICogQHJldHVybiB7Ym9vbGVhbn0gICAgICBUcnVlIGlmIGRlY2sgY29udGFpbnMgY2FyZC52YWx1ZSBhdGxlYXN0IGNhcmQubmVlZGVkIGFtb3VudCBvZiB0aW1lc1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNvbnRhaW5zKGRlY2s6IEFycmF5PG51bWJlcj4sIGNhcmQ6IENhcmRJbmZvKTogYm9vbGVhbiB7XG4gICAgICAgIGlmIChjYXJkLm5lZWRlZCA8PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGVjay5yZWR1Y2UoKGFjYywgY2FyZFZhbCkgPT5cbiAgICAgICAgICAgICAgICAoY2FyZFZhbCA9PT0gY2FyZC52YWx1ZSkgPyBhY2MgKyAxIDogYWNjLCAwKSA+PSBjYXJkLm5lZWRlZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVc2VkIGFmdGVyIHN0YXJ0aW5nIGhhbmQgaXMgbXVsbGlnYW5lZCB0byBwdXQgbm9uIHRhcmdldCBjYXJkcyBiYWNrIGluIGRlY2suXG4gICAgICogQHBhcmFtIHtBcnJheTxudW1iZXI+fSBkZWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gcmVwbGFjZU5vblRhcmdldChkZWNrOiBBcnJheTxudW1iZXI+KSB7XG4gICAgICAgIGRlY2sucHVzaCgtMSk7XG4gICAgICAgIGNvbnN0IG5ld0luZGV4ID0gSGVscGVycy5nZXRSYW5kb21JbnQoMCwgZGVjay5sZW5ndGgpO1xuICAgICAgICBzd2FwKGRlY2ssIGRlY2subGVuZ3RoIC0gMSwgbmV3SW5kZXgpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaHJvd3MgYXdheSBhbGwgbm9uIHRhcmdldCBjYXJkcyBpbiBzdGFydGluZyBoYW5kLlxuICAgICAqIEBwYXJhbSAge0FycmF5fSBkZWNrICAgICAgICAgICBEZWNrIHJlcHJlc2VudGVkIGFzIGludGVnZXIgYXJyYXlcbiAgICAgKiBAcmV0dXJuIHtBcnJheX0gICAgICAgICAgICAgICAgQW4gYXJyYXkgd2hlcmUgdGhlIGZpcnN0IG9iamVjdCBpcyBhY3RpdmUgaGFuZCBhbmQgc2Vjb25kIGlzIGFjdGl2ZSBkZWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gbXVsbGlnYW4oZGVjazogQXJyYXk8bnVtYmVyPik6IEFycmF5PEFycmF5PG51bWJlcj4+IHtcbiAgICAgICAgY29uc3Qgc3RhcnRpbmdIYW5kID0gZGVjay5zbGljZSgwLCAzKSxcbiAgICAgICAgICAgIGFjdGl2ZURlY2sgPSBkZWNrLnNsaWNlKDMpLFxuICAgICAgICAgICAgaGFuZEFmdGVyTXVsbGlnYW4gPSBzdGFydGluZ0hhbmQuZmlsdGVyKCh2YWwpID0+IHZhbCA+PSAwKSxcbiAgICAgICAgICAgIG11bGxpZ2FuQ291bnQgPSAzIC0gaGFuZEFmdGVyTXVsbGlnYW4ubGVuZ3RoO1xuICAgICAgICAvKiBQdXQgbXVsbGlnYW5lZCBjYXJkcyBiYWNrIGluIGRlY2suIEFsbCBtdWxsaWdhbmVkIGNhcmRzIGFyZSBvZiBubyBpbnRlcmVzdCAoLTEpICovXG4gICAgICAgIEhlbHBlcnMucmFuZ2UoMCwgbXVsbGlnYW5Db3VudCkuZm9yRWFjaCgoXykgPT4gcmVwbGFjZU5vblRhcmdldChhY3RpdmVEZWNrKSk7XG4gICAgICAgIHJldHVybiBbaGFuZEFmdGVyTXVsbGlnYW4sIGFjdGl2ZURlY2tdO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtcyBhIG11bGxpZ2FuLCBzaHVmZmxlcyBhZ2FpbiwgZHJhd3MgcmVtYWluaW5nIGNhcmRzIGFuZCBjaGVja3MgaWYgYWxsIGNhcmRzIGFyZSByZXByZXNlbnRlZFxuICAgICAqIGF0IGxlYXN0IHRoZSBuZWVkZWQgYW1vdW50IG9mIHRpbWVzLlxuICAgICAqIEBwYXJhbSAge0FycmF5fSBkZWNrICAgICBEZWNrIHJlcHJlc2VudGVkIGFzIGludGVnZXIgYXJyYXksIHNob3VsZCBiZSBzaHVmZmxlZCBiZWZvcmVoYW5kXG4gICAgICogQHBhcmFtICB7QXJyYXl9IHRhcmdldENhcmRzICAgICBBcnJheSBjb250YWluaW5nIGRlc2lyZWQgY2FyZHMgd2l0aCBpbmZvcm1hdGlvblxuICAgICAqIEBwYXJhbSAge051bWJlcn0gZHJhd0Ftb3VudCBhbW91bnQgb2YgY2FyZHMgZHJhd25cbiAgICAgKiBAcmV0dXJuIHtib29sZWFufSAgICAgICAgICBSZXR1cm5zIHRydWUgaWYgZHJhd24gY2FyZHMgY29udGFpbiBhbGwgcmVxdWlyZWQgY2FyZHMuXG4gICAgICovXG4gICAgZnVuY3Rpb24gdHJpYWwoZGVjazogQXJyYXk8bnVtYmVyPiwgdGFyZ2V0Q2FyZHM6IEFycmF5PENhcmRJbmZvPiwgZHJhd0Ftb3VudDogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IFtoYW5kQWZ0ZXJNdWxsaWdhbiwgZGVja0FmdGVyTXVsbGlnYW5dID0gbXVsbGlnYW4oZGVjayksXG4gICAgICAgICAgICByZW1haW5pbmdEcmF3cyA9IGRyYXdBbW91bnQgLSBoYW5kQWZ0ZXJNdWxsaWdhbi5sZW5ndGgsICAvLyAzIGlzIHN0YXJ0aW5nIGhhbmQgc2l6ZSBiZWZvcmUgbXVsbGlnYW5cbiAgICAgICAgICAgIGhhbmRBZnRlckRyYXdzID0gaGFuZEFmdGVyTXVsbGlnYW4uY29uY2F0KCAuLi5kZWNrQWZ0ZXJNdWxsaWdhbi5zbGljZSgwLCByZW1haW5pbmdEcmF3cykpO1xuICAgICAgICAvLyBSZXR1cm4gdHJ1ZSBpZiBldmVyeSBuZWVkZWQgY2FyZCBpcyBjb250YWluZWQgaW4gZHJhd24gY2FyZHNcbiAgICAgICAgcmV0dXJuIHRhcmdldENhcmRzLmV2ZXJ5KChjYXJkKSA9PiBjb250YWlucyhoYW5kQWZ0ZXJEcmF3cywgY2FyZCkpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBTaW11bGF0ZXMgc2V2ZXJhbCBzZXBhcmF0ZSBpbnN0YW5jZXMgb2YgZGVja3Mgd2l0aFxuICAgICAqIGRyYXdBbW91bnQgb2YgZHJhd3MgYW5kIGNoZWNrcyBpZiByZXF1aXJlZCBjYXJkcyBhcmUgY29udGFpbmVkIGluIGhhbmQuXG4gICAgICogQHBhcmFtICB7QXJyYXl9IHRhcmdldENhcmRzICAgICBBcnJheSBjb250YWluaW5nIGRlc2lyZWQgY2FyZHMgd2l0aCBpbmZvcm1hdGlvblxuICAgICAqIEBwYXJhbSAge251bWJlcn0gZHJhd0Ftb3VudCBhbW91bnQgb2YgY2FyZHMgZHJhd25cbiAgICAgKiBAcGFyYW0gIHtudW1iZXJ9IHRyaWVzIEhvdyBtYW55IHRpbWVzIGRyYXdTaW11bGF0aW9uIHNob3VsZCBiZSBydW5cbiAgICAgKiBAcmV0dXJuIHtudW1iZXJ9ICAgICAgICAgICAgcmF0aW8gb2Ygc3VjY2Vzc2Z1bCBkcmF3cyB0byB0b3RhbCBkcmF3c1xuICAgICAqL1xuICAgIGV4cG9ydCBmdW5jdGlvbiBzaW11bGF0ZSh0YXJnZXRDYXJkczogQXJyYXk8Q2FyZEluZm8+LCBkcmF3QW1vdW50OiBudW1iZXIsIHRyaWVzOiBudW1iZXI9MjAwMDAwKTogbnVtYmVyIHtcbiAgICAgICAgY29uc3QgZGVjayA9IGNyZWF0ZURlY2sodGFyZ2V0Q2FyZHMpLFxuICAgICAgICAgICAgZGVzaXJlZE91dGNvbWVzID0gSGVscGVycy5yYW5nZSgwLCB0cmllcylcbiAgICAgICAgICAgICAgICAubWFwKCBfID0+IHRyaWFsKHNodWZmbGUoZGVjayksIHRhcmdldENhcmRzLCBkcmF3QW1vdW50KSlcbiAgICAgICAgICAgICAgICAuZmlsdGVyKHYgPT4gdikubGVuZ3RoO1xuICAgICAgICByZXR1cm4gZGVzaXJlZE91dGNvbWVzIC8gdHJpZXM7XG4gICAgfVxufVxuZXhwb3J0IGNvbnN0IHJ1blNpbXVsYXRpb24gPSBTaW11bGF0aW9uLnNpbXVsYXRlO1xuZXhwb3J0IGNvbnN0IHJ1bkNhbGN1bGF0aW9uID0gQ2FsY3VsYXRpb24uY2FsY3VsYXRlOyIsIlwidXNlIHN0cmljdFwiO1xuaW1wb3J0ICogYXMgJCBmcm9tIFwianF1ZXJ5XCI7XG5pbXBvcnQge1VJLCBIZWxwZXJzfSBmcm9tIFwiLi9oZWxwZXJzXCJcbmltcG9ydCAqIGFzIERyYXcgZnJvbSBcIi4vZHJhdy1jYWxjdWxhdGlvblwiO1xuaW1wb3J0IHtDYXJkSW5mb30gZnJvbSBcIi4vZHJhdy1jYWxjdWxhdGlvblwiO1xuXG5jb25zdCBiYXNlOiBKUXVlcnk8SFRNTEVsZW1lbnQ+ID0gJChcIiNiYXNlXCIpOyAgLy8gYmFzZSB0ZW1wbGF0ZSBmb3IgY2FyZHNcblxuLyoqXG4gKiBDcmVhdGVzIGVmZmVjdHMgb24gc2NyZWVuIGJhc2VkIG9uIHRoZSBhbW91bnQgb2YgYmFkIGx1Y2sgcGxheWVyXG4gKiBoYXMgcGFpbmZ1bGx5IGVuZHVyZWQuIEEgaGlnaCBjIHdpbGwgY3JlYXRlIGxhcmdlciBlZmZlY3RzLlxuICogQHBhcmFtICB7aW50fSBjIHRoZSBudW1iZXIgb2YgZGVzaXJlZCBoYW5kc1xuICovXG5mdW5jdGlvbiByZXN1bHRTY3JlZW5FZmZlY3RzKGM6IG51bWJlcik6IHZvaWQge1xuICAgIFVJLnNoYWtlU2NyZWVuKGMpO1xufVxuLyoqXG4gKiBEaXNwbGF5IGVycm9yIHRleHQgaWYgdXNlciBpbnB1dCBpcyBpbmNvcnJlY3RcbiAqL1xuZnVuY3Rpb24gZGlzcGxheUVycm9yKG1zZzogSlF1ZXJ5PEhUTUxFbGVtZW50Pik6IHZvaWQge1xuICAgICQoXCIjZXJyb3ItbWVzc2FnZVwiKS5odG1sKG1zZyk7XG4gICAgJChcIiNlcnJvci13cmFwcGVyXCIpLnNob3coKTtcbiAgICAkKFwiI3Jlc3VsdHMtd3JhcHBlclwiKS5oaWRlKCk7XG59XG5cbi8qKlxuICogQ29sbGVjdHMgdXNlciBjYXJkIHJlbGF0ZWQgaW5wdXQgYW5kIHJlcHJlc2VudHMgZWFjaCBjYXJkIGFzIGFuIG9iamVjdCB3aXRoXG4gKiBuZWVkZWQsIGFtb3VudCwgdmFsdWUsIGZvdW5kQW1vdW50IHZhcmlhYmxlcy4gQ2FyZCBvYmplY3RzIGFyZSByZXR1cm5lZCBpbiBhbiBhcnJheS5cbiAqIEByZXR1cm4ge0FycmF5PENhcmRJbmZvPn0gQXJyYXkgb2YgT2JqZWN0cyByZXByZXNlbnRpbmcgZWFjaCB0YXJnZXQgY2FyZFxuICovXG5mdW5jdGlvbiBnZXRDYXJkSW5wdXQoKTogQXJyYXk8Q2FyZEluZm8+IHtcbiAgICBjb25zdCBpbnB1dHM6IEFycmF5PEhUTUxFbGVtZW50PiA9ICQubWFrZUFycmF5KCQoXCIuZHJhd1wiKS5ub3QoXCIjYmFzZVwiKSk7XG4gICAgcmV0dXJuIGlucHV0cy5tYXAoKHZhbCwgaW5kZXgpID0+IHtcbiAgICAgICAgY29uc3QgaW5wdXQgPSAkKHZhbCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBuZWVkZWQ6IE51bWJlcihpbnB1dC5maW5kKFwiLmNhcmQtbmVlZFwiKS52YWwoKSksXG4gICAgICAgICAgICB0b3RhbDogTnVtYmVyKGlucHV0LmZpbmQoXCIuY2FyZC1kZWNrXCIpLnZhbCgpKSxcbiAgICAgICAgICAgIHZhbHVlOiBpbmRleFxuICAgICAgICB9O1xuICAgIH0pO1xufVxuXG4vKipcbiAqIENoZWNrcyBhbGwgdXNlciBlbnRlcmVkIGlucHV0LiBSZXR1cm5zIGFuIG9iamVjdCBjb250YWluaW5nIHZhbGlkaXR5IGFuZCBvcHRpb25hbGx5XG4gKiBhIG1lc3NhZ2UgdG8gZXhwbGFpbiB3aGF0IGlzIG5vdCB2YWxpZC5cbiAqIEBwYXJhbSAge2ludH0gIGRyYXdBbW91bnQgICAgVXNlciBlbnRlcmVkIGNhcmQgZHJhdyB2YWx1ZVxuICogQHBhcmFtIHtBcnJheTxDYXJkSW5mbz59ICAgIGNhcmRJbnB1dHMgICAgYXJyYXkgb2Ygb2JqZWN0cyBjb250YWluaW5nIGVhY2ggY2FyZCBpbnB1dC5cbiAqIEByZXR1cm4ge09iamVjdH0gICAgICAgICAgICAgT2JqZWN0IGNvbnRhaW5pbmcgdmFsaWRpdHkgYW5kIG1zZyB2YWx1ZXNcbiAqL1xuZnVuY3Rpb24gaXNJbnB1dFZhbGlkKGRyYXdBbW91bnQ6IG51bWJlciwgY2FyZElucHV0czogQXJyYXk8Q2FyZEluZm8+KToge2lzVmFsaWQ6IGJvb2xlYW4sIGVycm9yTXNnOiBKUXVlcnk8SFRNTEVsZW1lbnQ+fSB7XG4gICAgY29uc3QgdG90YWxBbW91bnQ6IG51bWJlciA9IGNhcmRJbnB1dHMucmVkdWNlKChhY2MsIGlucHV0KSA9PiBhY2MgKyBOdW1iZXIoaW5wdXQudG90YWwpLCAwKTtcbiAgICAvLyBVc2VyIHN1cHBvc2VzIGEgbGFyZ2VyIGRlY2sgdGhhbiBpcyBwb3NzaWJsZVxuICAgIGlmICh0b3RhbEFtb3VudCA+IERyYXcuREVDS19TSVpFKSB7XG4gICAgICAgIHJldHVybiB7aXNWYWxpZDogZmFsc2UsXG4gICAgICAgICAgICBlcnJvck1zZzogJChcIjxzcGFuPlwiKS5hcHBlbmQoXCJUYXJnZXQgY2FyZCBcIiwgVUkuaGlnaGxpZ2h0V3JhcChcImFtb3VudHNcIiksIFwiIHN1bSBleGNlZWRzIGRlY2sgc2l6ZVwiKX07XG4gICAgfVxuICAgIGNvbnN0IHRvdGFsTmVlZGVkOiBudW1iZXIgPSBjYXJkSW5wdXRzLnJlZHVjZSgoYWNjLCBpbnB1dCkgPT4gYWNjICsgTnVtYmVyKGlucHV0Lm5lZWRlZCksIDApO1xuICAgIC8vIFVzZXIgbmVlZHMgbW9yZSBjYXJkcyB0aGFuIHRoZXJlIGFyZSBkcmF3cywgd2lsbCBhbHdheXMgZmFpbC5cbiAgICBpZiAodG90YWxOZWVkZWQgPiBkcmF3QW1vdW50KSB7XG4gICAgICAgIHJldHVybiB7aXNWYWxpZDogZmFsc2UsXG4gICAgICAgICAgICBlcnJvck1zZzogJChcIjxzcGFuPlwiKS5hcHBlbmQoXCJGZXdlciBcIiwgVUkuaGlnaGxpZ2h0V3JhcChcImRyYXdzIFwiKSwgXCJ0aGFuIFwiLCBVSS5oaWdobGlnaHRXcmFwKFwibmVlZGVkXCIpLCBcIiBjYXJkc1wiKX07XG4gICAgfVxuICAgIGNvbnN0IHZhbGlkTmVlZGVkOiBib29sZWFuID0gY2FyZElucHV0cy5ldmVyeSgoaW5wdXQpID0+IE51bWJlcihpbnB1dC50b3RhbCkgPj0gTnVtYmVyKGlucHV0Lm5lZWRlZCkpO1xuICAgIC8vIE9uZSBvciBtb3JlIG5lZWRlZCB2YWx1ZXMgZXhjZWVkcyBpdHMgYW1vdW50IGluIGRlY2tcbiAgICBpZiAoIXZhbGlkTmVlZGVkKSB7XG4gICAgICAgIHJldHVybiB7aXNWYWxpZDogZmFsc2UsXG4gICAgICAgICAgICBlcnJvck1zZzogJChcIjxzcGFuPlwiKS5hcHBlbmQoVUkuaGlnaGxpZ2h0V3JhcChcIk5lZWRlZFwiKSwgXCIgY2Fubm90IGJlIGxhcmdlciB0aGFuIGNhcmQgXCIsIFVJLmhpZ2hsaWdodFdyYXAoXCJhbW91bnRcIiksIFwiIGluIGRlY2tcIil9O1xuICAgIH1cbiAgICByZXR1cm4ge2lzVmFsaWQ6IHRydWUsIGVycm9yTXNnOiAkKFwiXCIpfTtcbn1cbi8qKlxuICogRGlzYWJsZXMgY2FsY3VsYXRlIGJ1dHRvbiBhbmQgc2hvd3MgYSBzcGlubmluZyBsb2FkIGljb25cbiAqL1xuZnVuY3Rpb24gYWRkTG9hZGluZ0luZGljYXRvcigpOiB2b2lkIHtcbiAgICAkKFwiI2NhbGN1bGF0ZS1idG5cIikuYWRkQ2xhc3MoXCJkaXNhYmxlZFwiKTtcbiAgICAkKFwiI2NoYW5jZS10ZXh0LW51bWJlclwiKS5odG1sKFwiLS0tXCIpO1xuICAgICQoXCIjZXJyb3Itd3JhcHBlclwiKS5oaWRlKCk7XG4gICAgJChcIiNyZXN1bHRzLXdyYXBwZXJcIikuc2hvdygpO1xuICAgICQoXCIjY2FsY3VsYXRlLWJ0biBzcGFuXCIpLnNob3coKTtcbn1cbi8qKlxuICogUmVtb3ZlcyBlZmZlY3RzIHNob3duIHdoaWxlIGxvYWRpbmdcbiAqL1xuZnVuY3Rpb24gY2xlYW51cExvYWRpbmdJbmRpY2F0b3IoKTogdm9pZCB7XG4gICAgJChcIiNjYWxjdWxhdGUtYnRuIHNwYW5cIikuaGlkZSgpO1xuICAgICQoXCIjY2FsY3VsYXRlLWJ0blwiKS5yZW1vdmVDbGFzcyhcImRpc2FibGVkXCIpO1xufVxuLyoqXG4gKiBWYWxpZGF0ZXMgdXNlciBpbnB1dCBhbmQgcnVucyBkcmF3U2ltdWxhdGlvbiBpZiBpbnB1dCBpcyB2YWxpZC5cbiAqL1xuZnVuY3Rpb24gcnVuKCk6IHZvaWQge1xuICAgIGNvbnN0IHNtYXJ0TXVsbGlnYW46IGJvb2xlYW4gPSAkKFwiI211bGxpZ2FuLWNoZWNrYm94XCIpLmlzKCc6Y2hlY2tlZCcpLFxuICAgICAgICBkcmF3QW1vdW50ID0gJChcIi5kcmF3LWFtb3VudFwiKS52YWwoKSBhcyBudW1iZXIsXG4gICAgICAgIGNhcmRJbmZvID0gZ2V0Q2FyZElucHV0KCksXG4gICAgICAgIHtpc1ZhbGlkLCBlcnJvck1zZ30gPSBpc0lucHV0VmFsaWQoZHJhd0Ftb3VudCwgY2FyZEluZm8pO1xuICAgIGlmIChpc1ZhbGlkKSB7XG4gICAgICAgIGNvbnN0IGZ1bmMgPSAoc21hcnRNdWxsaWdhbikgPyBEcmF3LnJ1blNpbXVsYXRpb24gOiBEcmF3LnJ1bkNhbGN1bGF0aW9uLFxuICAgICAgICAgICAgcHJvbWlzZSA9IEhlbHBlcnMudGltZUZ1bmN0aW9uKGZ1bmMsIGNhcmRJbmZvLCBkcmF3QW1vdW50KTtcbiAgICAgICAgcHJvbWlzZS50aGVuKCh7dCwgcmVzdWx0c30pID0+IHtcbiAgICAgICAgICAgIGNsZWFudXBMb2FkaW5nSW5kaWNhdG9yKCk7XG4gICAgICAgICAgICBVSS51cGRhdGVSZXN1bHRzKCh0IC8gMTAwMCkudG9GaXhlZCgzKSwgcmVzdWx0cyk7XG4gICAgICAgICAgICByZXN1bHRTY3JlZW5FZmZlY3RzKHJlc3VsdHMpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGNsZWFudXBMb2FkaW5nSW5kaWNhdG9yKCk7XG4gICAgICAgIGRpc3BsYXlFcnJvcihlcnJvck1zZyk7XG4gICAgfVxuICAgICQoXCIjZmFxLXdyYXBwZXJcIikuY29sbGFwc2UoJ2hpZGUnKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBpbml0KCk6IHZvaWQge1xuICAgIC8vIEFkZCBpbml0aWFsIHRhcmdldCBjYXJkIGlucHV0XG4gICAgVUkuYWRkQ2FyZChiYXNlKTtcbiAgICAvLyBBZGQgYnV0dG9uIGxpc3RlbmVyc1xuICAgICQoXCIjYWRkLWNhcmQtYnRuXCIpLmNsaWNrKCgpID0+IFVJLmFkZENhcmRMaXN0ZW5lcihiYXNlKSk7XG4gICAgJChcIiNjYWxjdWxhdGUtYnRuXCIpLm9uKFwibW91c2Vkb3duXCIsICgpID0+IHtcbiAgICAgICAgYWRkTG9hZGluZ0luZGljYXRvcigpO1xuICAgICAgICBzZXRUaW1lb3V0KHJ1biwgMTAwKTsgIC8vIE5lZWQgdGhpcyB0aW1lb3V0IHNvIGNvbnRyb2wgaXMgZ2l2ZW4gYmFjayB0byBET00gc28gaXQgY2FuIGJlIHVwZGF0ZWQuXG4gICAgfSk7XG4gICAgVUkuaW5pdCgpO1xuICAgICQoXCIuZHJhdy1hbW91bnRcIikudmFsKEhlbHBlcnMuZ2V0UmFuZG9tSW50SW5jbHVzaXZlKDMsIDIwKSk7XG59IiwiXCJ1c2Ugc3RyaWN0XCI7XG5pbXBvcnQgKiBhcyAkIGZyb20gXCJqcXVlcnlcIjtcbmltcG9ydCBcImpydW1ibGVcIjtcbmltcG9ydCAqIGFzIFIgZnJvbSBcInJhbWRhXCI7ICAvLyBBbGwgSSB3YW50IGlzIGJhc2ljYWxseSB0byB1c2UgYSBsYXp5IHNlcSBvbmNlIDovXG5cblxuZXhwb3J0IG5hbWVzcGFjZSBVSSB7XG4gICAgZXhwb3J0IGZ1bmN0aW9uIGluaXQoKTogdm9pZCB7IC8vIEZJWE1FIHJlbmFtZSB0byBpbml0VUlcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBydW1ibGUgZWZmZWN0IG9uIGVsZW1lbnRzXG4gICAgICAgICQoXCIucnVtYmxlXCIpLmpydW1ibGUoKTsgLy8gRklYTUVcbiAgICAgICAgLy8gVGhpcyBzZXRzIHRoZSBjb2xsYXBzZSBhcnJvdyB0aGUgcmlnaHQgd2F5IGF0IHN0YXJ0IGZvciBjb2xsYXBzaWJsZSBjYXJkc1xuICAgICAgICAkKFwiLmNhcmQtaGVhZGVyIGFcIikudG9nZ2xlQ2xhc3MoXCJjb2xsYXBzZWRcIik7XG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHNcbiAgICAgICAgJCgnW2RhdGEtdG9nZ2xlPVwidG9vbHRpcFwiXScpLnRvb2x0aXAoKTtcbiAgICAgICAgLy8gSGlkZSBsb2FkIGljb24sIHNldHRpbmcgZGlzcGxheSBub25lIGluIGNzcyBpcyBidWdneSBmb3Igc29tZSByZWFzb24uXG4gICAgICAgICQoXCIjY2FsY3VsYXRlLWJ0biBzcGFuXCIpLmhpZGUoKTtcbiAgICB9XG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZVJlc3VsdHModGltZTogc3RyaW5nLCBjOiBudW1iZXIsIGRlY2ltYWxzOiBudW1iZXIgPSAwKSB7XG4gICAgICAgICQoXCIjY2hhbmNlLW51bWJlclwiKS5odG1sKChjICogMTAwMCkudG9GaXhlZChkZWNpbWFscykpO1xuICAgICAgICAkKFwiI3RpbWUtdGFrZW5cIikuaHRtbCh0aW1lKS5zaG93KCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFdyYXBzIGEgc3RyaW5nIGluIHNwYW4gd2l0aCB0ZXh0LWhpZ2hsaWdodCBjbGFzc1xuICAgICAqIEBwYXJhbSBzdHJpbmdcbiAgICAgKiBAcmV0dXJucyB7alF1ZXJ5fVxuICAgICAqL1xuICAgIGV4cG9ydCBmdW5jdGlvbiBoaWdobGlnaHRXcmFwKHN0cmluZzogc3RyaW5nKTogSlF1ZXJ5PEhUTUxFbGVtZW50PiB7XG4gICAgICAgIHJldHVybiAkKFwiPHNwYW4+XCIpLmFkZENsYXNzKFwidGV4dC1oaWdobGlnaHRcIikuaHRtbChzdHJpbmcpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBMaXN0ZW5lciBmb3IgY2FyZCBkZWxldGUgYnV0dG9uXG4gICAgICovXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZUNhcmQoKTogdm9pZCB7XG4gICAgICAgICQodGhpcykuY2xvc2VzdChcIi5jYXJkXCIpXG4gICAgICAgICAgICAuc2xpZGVUb2dnbGUoXCJmYXN0XCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgc3BpbkdseXBoaWNvbigkKFwiI2FkZC1jYXJkLWJ0blwiKS5maW5kKFwic3BhblwiKSwgdHJ1ZSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFkZCBhIG5ldyBjYXJkIHRvIGJlIGNvbnNpZGVyZWQgZm9yIHByb2JhYmlsaXR5LlxuICAgICAqL1xuICAgIGV4cG9ydCBmdW5jdGlvbiBhZGRDYXJkKGJhc2U6IEpRdWVyeTxIVE1MRWxlbWVudD4pOiBKUXVlcnk8SFRNTEVsZW1lbnQ+IHtcbiAgICAgICAgY29uc3QgbmV3Q2FyZCA9IGJhc2UuY2xvbmUoKTtcbiAgICAgICAgJChcIiNjYXJkLWNvbnRhaW5lclwiKS5hcHBlbmQobmV3Q2FyZCk7XG4gICAgICAgIG5ld0NhcmQucmVtb3ZlQXR0cignaWQnKVxuICAgICAgICAgICAgLmhpZGUoKVxuICAgICAgICAgICAgLnNsaWRlVG9nZ2xlKFwiZmFzdFwiKVxuICAgICAgICAgICAgLmZpbmQoXCIucmVtb3ZlLWNhcmQtYnRuXCIpXG4gICAgICAgICAgICAuY2xpY2socmVtb3ZlQ2FyZClcbiAgICAgICAgc3BpbkdseXBoaWNvbigkKHRoaXMpLmZpbmQoXCJzcGFuXCIpKTtcbiAgICAgICAgcmV0dXJuIG5ld0NhcmQ7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFNwaW5zIGEgZ2x5cGhpY29uIGZvciBhIGdpdmVuIGR1cmF0aW9uLlxuICAgICAqIEBwYXJhbSBzcGFuIHtPYmplY3R9IGpxdWVyeSBvYmplY3QgcG9pbnRpbmcgdG8gc3BhbiB3aXRoIGdseXBoaWNvbiBjbGFzc1xuICAgICAqIEBwYXJhbSByZXZlcnNlIHtCb29sZWFufSByZXZlcnNlIHNwaW4gZGlyZWN0aW9uIGlmIHRydWVcbiAgICAgKiBAcGFyYW0gZHVyYXRpb24ge051bWJlcn0gc3BpbiBkdXJhdGlvbiBpbiBtaWxsaXNlY29uZHNcbiAgICAgKi9cbiAgICBleHBvcnQgZnVuY3Rpb24gc3BpbkdseXBoaWNvbihzcGFuOiBKUXVlcnk8SFRNTEVsZW1lbnQ+LCByZXZlcnNlPWZhbHNlLCBkdXJhdGlvbj0yMDApOiB2b2lkIHtcbiAgICAgICAgY29uc3Qgc3BpbkNsYXNzID0gKHJldmVyc2UpID8gXCJnbHlwaGljb24tcmV2LXNwaW5cIiA6IFwiZ2x5cGhpY29uLXNwaW5cIjtcbiAgICAgICAgc3Bhbi5hZGRDbGFzcyhzcGluQ2xhc3MpO1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHNwYW4ucmVtb3ZlQ2xhc3Moc3BpbkNsYXNzKSwgZHVyYXRpb24pO1xuICAgIH1cblxuICAgIGV4cG9ydCBmdW5jdGlvbiBhZGRDYXJkTGlzdGVuZXIoYmFzZTogSlF1ZXJ5PEhUTUxFbGVtZW50Pik6IEpRdWVyeTxIVE1MRWxlbWVudD4ge1xuICAgICAgICBzcGluR2x5cGhpY29uKCQoXCIjYWRkLWNhcmQtYnRuXCIpLmZpbmQoXCJzcGFuXCIpKTtcbiAgICAgICAgcmV0dXJuIGFkZENhcmQoYmFzZSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFNoYWtlcyB0aGUgc2VsZWN0ZWQgZWxlbWVudChzKVxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gc2VsZWN0b3IgZWxlbWVudHMgdG8gc2VsZWN0XG4gICAgICogQHBhcmFtICB7Ym9vbGVhbn0gcm90YXRlICAgSWYgdHJ1ZSBzaGFrZXMgcm90YXRpb25cbiAgICAgKiBAcGFyYW0gIHtpbnR9IHN0cmVuZ3RoIHRoZSBtYWduaXR1ZGUgb2YgdGhlIHNoYWtlc1xuICAgICAqIEBwYXJhbSAge2ludH0gZHVyYXRpb24gdGltZSBpbiBtaWxsaXNlY29uZHMgYmVmb3JlIHNoYWtlIGlzIHN0b3BwZWRcbiAgICAgKi9cbiAgICBleHBvcnQgZnVuY3Rpb24gcnVtYmxlRWxlbWVudChzZWxlY3Rvcjogc3RyaW5nLCByb3RhdGU6IGJvb2xlYW4sIHN0cmVuZ3RoOiBudW1iZXIsIGR1cmF0aW9uOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgcnVtYmxlID0ge1xuICAgICAgICAgICAgeDogMTAgKiBzdHJlbmd0aCxcbiAgICAgICAgICAgIHk6IDEwICogc3RyZW5ndGgsXG4gICAgICAgICAgICByb3RhdGlvbjogKHJvdGF0ZSkgPyA0ICogc3RyZW5ndGggOiAwXG4gICAgICAgIH07XG4gICAgICAgICQoc2VsZWN0b3IpLmpydW1ibGUocnVtYmxlKVxuICAgICAgICAgICAgLnRyaWdnZXIoJ3N0YXJ0UnVtYmxlJyk7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkKHNlbGVjdG9yKS50cmlnZ2VyKCdzdG9wUnVtYmxlJyk7XG4gICAgICAgIH0sIGR1cmF0aW9uKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU2hha2VzIHNjcmVlbiBhbmQgc29tZSBzcGVjaWZpYyBlbGVtZW50cyBiYXNlZCBvbiBjXG4gICAgICogQHBhcmFtICB7TnVtYmVyfSBjIGNoYW5jZSBvZiByZWFjaGluZyBkZXNpcmVkIG91dGNvbWUgKHByb2JhYmlsaXR5KVxuICAgICAqL1xuICAgIGV4cG9ydCBmdW5jdGlvbiBzaGFrZVNjcmVlbihjOiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgLyogVGhlIGMgdmFsdWUgaXMgZmxvb3JlZCBiZWNhdXNlIHdoZW4gaXQgaXMgdG9vIHNtYWxsLCB0aGUgcnVtYmxlcyB3aWxsIG1vdmUgdGhlIGVsZW1lbnRzIGJ5IHN1YnBpeGVscyBhbmRcbiAgICAgICAgIGl0IGNyZWF0ZXMgYSBqYWdnZWQgZWZmZWN0ICovXG4gICAgICAgIGNvbnN0IGZsb29yVmFsID0gMC4wMDksXG4gICAgICAgICAgICBmbG9vcmVkQyA9IE1hdGgubWF4KGZsb29yVmFsLCBjKTtcbiAgICAgICAgcnVtYmxlRWxlbWVudChcIiNjaGFuY2UtbnVtYmVyXCIsIHRydWUsIGZsb29yZWRDLCAxMjAwKTtcbiAgICAgICAgaWYoZmxvb3JlZEMgPiBmbG9vclZhbCkgeyAgLy8gSWYgYyB2YWx1ZSB3YXMgbm90IGZsb29yZWQgcnVtYmxlIGFsbCBlbGVtZW50c1xuICAgICAgICAgICAgcnVtYmxlRWxlbWVudChcIiN0aXRsZVwiLCB0cnVlLCBmbG9vcmVkQyAvIDQgLCAxMTAwKTtcbiAgICAgICAgICAgIHJ1bWJsZUVsZW1lbnQoXCIuY2FyZFwiLCB0cnVlLCBmbG9vcmVkQyAvIDIsIDgwMCk7XG4gICAgICAgICAgICBydW1ibGVFbGVtZW50KFwiLmNvbnRlbnRcIiwgZmFsc2UsIGZsb29yZWRDIC8gMiwgOTAwKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbmV4cG9ydCBuYW1lc3BhY2UgSGVscGVycyB7XG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhIHByb21pc2Ugd2hpY2ggcmVzb2x2ZXMgdG8gYW4gb2JqZWN0IHdpdGggbmVlZGVkIGluZm9ybWF0aW9uXG4gICAgICogQHBhcmFtICB7RnVuY3Rpb259ICAgIGZ1bmMgZnVuY3Rpb24gdG8gdGltZVxuICAgICAqIEBwYXJhbSAge0FycmF5fSBhcmdzICBmdW5jIGFyZ3VtZW50c1xuICAgICAqIEByZXR1cm4ge1Byb21pc2V9ICAgICBSZXR1cm5zIGEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvIGFuIG9iamVjdCB3aXRoIHQgYW5kIHJlc3VsdHMgdmFsdWVzXG4gICAgICovXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHRpbWVGdW5jdGlvbiAoZnVuYzogRnVuY3Rpb24sIC4uLmFyZ3M6IEFycmF5PGFueT4pOiBQcm9taXNlPHt0OiBudW1iZXIsIHJlc3VsdHM6IGFueX0+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHQwOiBudW1iZXIgPSBwZXJmb3JtYW5jZS5ub3coKSxcbiAgICAgICAgICAgICAgICByZXR1cm5WYWx1ZTogYW55ID0gZnVuYyguLi5hcmdzKSxcbiAgICAgICAgICAgICAgICBkZWx0YVRpbWU6IG51bWJlciA9IHBlcmZvcm1hbmNlLm5vdygpIC0gdDA7XG4gICAgICAgICAgICByZXNvbHZlKHt0OiBkZWx0YVRpbWUsIHJlc3VsdHM6IHJldHVyblZhbHVlfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBleHBvcnQgZnVuY3Rpb24gcmFuZ2Uoc3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIpOiBSZWFkb25seUFycmF5PG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gUi5yYW5nZShzdGFydCwgZW5kKTtcbiAgICB9XG4gICAgZXhwb3J0IGZ1bmN0aW9uIHJhbmdlSW5jbHVzaXZlKHN0YXJ0OiBudW1iZXIsIGVuZDogbnVtYmVyKTogUmVhZG9ubHlBcnJheTxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHJhbmdlKHN0YXJ0LCBlbmQgKyAxKTtcbiAgICB9XG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdldFJhbmRvbUludChtaW46IG51bWJlciwgbWF4OiBudW1iZXIpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikpICsgbWluO1xuICAgIH1cbiAgICBleHBvcnQgZnVuY3Rpb24gZ2V0UmFuZG9tSW50SW5jbHVzaXZlKG1pbjogbnVtYmVyLCBtYXg6IG51bWJlcik6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBnZXRSYW5kb21JbnQobWluLCBtYXggKyAxKTtcbiAgICB9XG59IiwiXCJ1c2Ugc3RyaWN0XCI7XG5pbXBvcnQgKiBhcyAkIGZyb20gXCJqcXVlcnlcIjtcbmltcG9ydCAqIGFzIFRldGhlciBmcm9tIFwidGV0aGVyXCI7XG4vKlxuVGhpcyBpcyBkZXByZXNzaW5nIGJ1dCBmb3IgYm9vdHN0cmFwIHRvIGZpbmQgdGhlc2UgdGhpbmcgd2hlbiBidW5kbGVkIEkgbmVlZCB0byBkZWNsYXJlIHRoZW0gaW4gZ2xvYmFsIG5hbWVzcGFjZVxubGlrZSB0aGlzLiBJdCB3b3JrZWQgd2l0aG91dCB3aGVuIEkgYnVuZGxlZCBldmVyeXRoaW5nIGludG8gb25lIGJ1bmRsZSBub3QgZGl2aWRlZCBpbiBsaWJzIGFuZCBzcmMuIFdoYXQgd291bGQgbW9zdFxubGlrZWx5IHdvcmsgaXMgYnVuZGxpbmcganF1ZXJ5IGFuZCB0ZXRoZXIgaW4gdGhlaXIgb3duIGJ1bmRsZSB0aGF0IEkgZXhwbGljaXRseSBzcmMgZmlyc3QgaW4gaHRtbCBmaWxlc1xuICovXG5kZWNsYXJlIGdsb2JhbCB7XG4gICAgaW50ZXJmYWNlIFdpbmRvdyB7IGpRdWVyeTogYW55LCAkOiBhbnksIFRldGhlcjogYW55fVxufVxud2luZG93LmpRdWVyeSA9IHdpbmRvdy4kID0gJDtcbndpbmRvdy5UZXRoZXIgPSBUZXRoZXI7XG5pbXBvcnQgXCJib290c3RyYXBcIjtcbmltcG9ydCAqIGFzIGRyYXcgZnJvbSBcIi4vZHJhdy1tYWluXCI7XG5pbXBvcnQgKiBhcyBwaW5nIGZyb20gXCIuL3BpbmctbWFpblwiO1xuXG5kZWNsYXJlIGdsb2JhbCB7XG4gICAgaW50ZXJmYWNlIEpRdWVyeSB7XG4gICAgICAgIGpydW1ibGUoYXJnPzogb2JqZWN0KTogSlF1ZXJ5O1xuICAgICAgICBodG1sKG9iajpKUXVlcnkpOiBKUXVlcnk7ICAvLyBBbGxvdyBodG1sIGlucHV0IHdpdGggSlF1ZXJ5IG9iamVjdHNcbiAgICB9XG59XG4vKipcbiAqIFRoaXMgaXMgdGhlIGVudHJ5IHBvaW50IGZvciBib3RoIGRyYXcgYW5kIHBpbmcgc2l0ZXNcbiAqL1xuJCgoKSA9PiB7XG4gICAgY29uc3QgbG9jYXRpb24gPSAkKFwiI2xvY2F0aW9uXCIpLmRhdGEoXCJsb2NhdGlvblwiKTtcbiAgICBpZiAobG9jYXRpb24gPT0gXCJkcmF3XCIpIHtcbiAgICAgICAgZHJhdy5pbml0KCk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGxvY2F0aW9uID09IFwicGluZ1wiKSB7XG4gICAgICAgIHBpbmcuaW5pdCgpO1xuICAgIH1cbn0pOyIsIlwidXNlIHN0cmljdFwiO1xuXG5leHBvcnQgdHlwZSBDcmVhdHVyZUluZm8gPSB7dG9EaWU6IGJvb2xlYW4sIGhwOiBudW1iZXIsIGlkOiBudW1iZXJ9O1xuZXhwb3J0IG5hbWVzcGFjZSBQaW5nIHtcbiAgICB0eXBlIENyZWF0dXJlID0ge2lkOiBudW1iZXIsIGhwOiBudW1iZXJ9O1xuICAgIC8vIEVhY2ggZW50cnkgaW4gdmFsIGFycmF5IGlzICdpZCcgb2YgdGFyZ2V0ZWQgY3JlYXR1cmVcbiAgICB0eXBlIE91dGNvbWUgPSAge3ZhbDogUmVhZG9ubHlBcnJheTxudW1iZXI+LCBwOiBudW1iZXJ9XG4gICAgLy8gTm9kZSBpcyBhIG5vZGUgaW4gcHJvYmFiaWxpdHkgdHJlZVxuICAgIHR5cGUgTm9kZSA9IHtwOiBudW1iZXIsIHRhcmdldDogbnVtYmVyLCBjaGlsZHJlbjogUmVhZG9ubHlBcnJheTxOb2RlPn1cblxuICAgIGZ1bmN0aW9uIHBpbmdDcmVhdHVyZShjcmVhdHVyZTogQ3JlYXR1cmUpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGlkOiBjcmVhdHVyZS5pZCxcbiAgICAgICAgICAgIGhwOiBjcmVhdHVyZS5ocCAtIDFcbiAgICAgICAgfTtcbiAgICB9XG4gICAgZnVuY3Rpb24gX2NyZWF0ZU91dGNvbWVUcmVlKGNyZWF0dXJlczogUmVhZG9ubHlBcnJheTxDcmVhdHVyZT4sIHBpbmdzOiBudW1iZXIpOiBBcnJheTxOb2RlPiB7XG4gICAgICAgIGlmIChwaW5ncyA8PSAwIHx8IGNyZWF0dXJlcy5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjcmVhdHVyZXMubWFwKCh0YXJnZXRDcmVhdHVyZSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHByb2JhYmlsaXR5ID0gMSAvIGNyZWF0dXJlcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgdGFyZ2V0SWQ6IG51bWJlciA9IHRhcmdldENyZWF0dXJlLmlkLFxuICAgICAgICAgICAgICAgIGNyZWF0dXJlc0FmdGVyUGluZyA9IGNyZWF0dXJlc1xuICAgICAgICAgICAgICAgICAgICAubWFwKChjcmVhdHVyZSwgaSkgPT4gKGkgPT09IGluZGV4KSA/IHBpbmdDcmVhdHVyZShjcmVhdHVyZSkgOiBjcmVhdHVyZSlcbiAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihjcmVhdHVyZSA9PiBjcmVhdHVyZS5ocCAhPT0gMCk7ICAvLyBGaWx0ZXIgb3V0IHRyZWUgcm9vdCB2YWx1ZSAoLTEpIGZyb20gb3V0Y29tZXNcbiAgICAgICAgICAgIHJldHVybiB7cDogcHJvYmFiaWxpdHksIHRhcmdldDogdGFyZ2V0SWQsIGNoaWxkcmVuOiBfY3JlYXRlT3V0Y29tZVRyZWUoY3JlYXR1cmVzQWZ0ZXJQaW5nLCBwaW5ncyAtIDEpfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIHByb2JhYmlsaXR5IHRyZWUuIEVhY2ggbm9kZSBoYXMgYSBwcm9iYWJpbGl0eSB2YWx1ZSwgdG8gZ2V0IHRoZSBwcm9iYWJpbGl0eSB0byBhcnJpdmUgYXRcbiAgICAgKiBhIG5vZGUgeW91IG11bHRpcGx5IGFsbCBwcm9iYWJpbGl0aWVzIGZyb20gdGhhdCBub2RlIHVwIHRvIHRoZSByb290IG5vZGUuIFRoZSBvdXRjb21lIGNhbiBiZSBmb3VuZCBpbiB0aGUgc2FtZVxuICAgICAqIHdheSBieSB0cmF2ZWxpbmcgdG8gdGhlIHJvb3Qgd2hpbGUgY29sbGVjdGluZyBhbGwgdGFyZ2V0IHZhbHVlc1xuICAgICAqIEBwYXJhbSBjcmVhdHVyZXMge1JlYWRvbmx5QXJyYXk8Q3JlYXR1cmU+fVxuICAgICAqIEBwYXJhbSBwaW5ncyB7bnVtYmVyfVxuICAgICAqIEBwYXJhbSBwYXJlbnROb2RlIHtOb2RlfVxuICAgICAqIEByZXR1cm4ge05vZGV9IHJldHVybnMgdGhlIHJvb3Qgbm9kZSBvZiB0aGUgdHJlZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNyZWF0ZU91dGNvbWVUcmVlKGNyZWF0dXJlczogUmVhZG9ubHlBcnJheTxDcmVhdHVyZT4sIHBpbmdzOiBudW1iZXIpOiBOb2RlIHtcbiAgICAgICAgcmV0dXJuIHt0YXJnZXQ6IC0xLCBwOiAxLCBjaGlsZHJlbjogX2NyZWF0ZU91dGNvbWVUcmVlKGNyZWF0dXJlcywgcGluZ3MpfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUcmF2ZXJzZXMgdHJlZSBkb3duIHRvIGxlYWYgbm9kZXMgYW5kIGNvbGxlY3RzIGFsbCBvdXRjb21lcyBhbmQgcmV0dXJucyB0aGVtIGFzIGFuIGFycmF5IG9mIG91dGNvbWVzXG4gICAgICogQHBhcmFtIGN1cnJlbnROb2RlIHtOb2RlfSAgICBjdXJyZW50IG5vZGUgYmVpbmcgdHJhdmVyc2VkXG4gICAgICogQHBhcmFtIHRhcmdldCB7UmVhZG9ubHlBcnJheTxudW1iZXI+fSBhY2N1bXVsYXRlZCB0YXJnZXRzIGhpdCB3aGlsZSB0cmF2ZXJzaW5nIGRvd24gdHJlZVxuICAgICAqIEBwYXJhbSBwIHtudW1iZXJ9ICAgIGFjY3VtdWxhdGVkIHByb2JhYmlsaXR5IHdoaWxlIHRyYXZlcnNpbmcgZG93biB0cmVlXG4gICAgICogQHJldHVybnMge1JlYWRvbmx5QXJyYXk8T3V0Y29tZT59XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0T3V0Y29tZXMoY3VycmVudE5vZGU6IE5vZGUsIHRhcmdldDogUmVhZG9ubHlBcnJheTxudW1iZXI+PVtdLCBwOiBudW1iZXI9MSk6IFJlYWRvbmx5QXJyYXk8T3V0Y29tZT4ge1xuICAgICAgICBpZihjdXJyZW50Tm9kZS5jaGlsZHJlbi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBbe3ZhbDogdGFyZ2V0LmNvbmNhdChjdXJyZW50Tm9kZS50YXJnZXQpXG4gICAgICAgICAgICAgICAgLmZpbHRlcih0YXJnZXRWYWwgPT4gdGFyZ2V0VmFsICE9PSAtMSksIHA6IHAgKiBjdXJyZW50Tm9kZS5wfV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFtdLmNvbmNhdCggLi4uY3VycmVudE5vZGUuY2hpbGRyZW4ubWFwKGNoaWxkID0+IHtcbiAgICAgICAgICAgIHJldHVybiBnZXRPdXRjb21lcyhjaGlsZCwgdGFyZ2V0LmNvbmNhdChjdXJyZW50Tm9kZS50YXJnZXQpLCBwICogY3VycmVudE5vZGUucCk7XG4gICAgICAgIH0pKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIGNyZWF0dXJlJ3MgZGFtYWdlIHRha2VuIGluIHRoaXMgb3V0Y29tZSBpcyBpbiBjb21wbGlhbmNlIHdpdGggY3JlYXR1cmUudG9EaWVcbiAgICAgKiBGb3IgZXhhbXBsZSBpZiBjcmVhdHVyZS50b0RpZSA9IHRydWUgYW5kIGRhbWFnZSB0YWtlbiA+PSBjcmVhdHVyZS5ocCB0aGUgb3V0Y29tZSBpcyBkZXNpcmVkLlxuICAgICAqIEBwYXJhbSBjcmVhdHVyZSB7Q3JlYXR1cmVJbmZvfVxuICAgICAqIEBwYXJhbSBvdXRjb21lIHtPdXRjb21lfSBvdXRjb21lIG9iamVjdCBjb250YWluaW5nIG91dGNvbWUgYW5kIHAgdmFyaWFibGVcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc0Rlc2lyZWRPdXRjb21lKGNyZWF0dXJlOiBDcmVhdHVyZUluZm8sIG91dGNvbWU6IE91dGNvbWUpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgZG1nID0gb3V0Y29tZS52YWwucmVkdWNlKChhY2MsIHZhbCkgPT4ge1xuICAgICAgICAgICAgaWYgKHZhbCA9PT0gY3JlYXR1cmUuaWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFjYyArIDE7XG4gICAgICAgICAgICBlbHNlIHJldHVybiBhY2M7XG4gICAgICAgIH0sIDApO1xuICAgICAgICByZXR1cm4gKChjcmVhdHVyZS50b0RpZSAmJiBkbWcgPj0gY3JlYXR1cmUuaHApIHx8ICghY3JlYXR1cmUudG9EaWUgJiYgZG1nIDwgY3JlYXR1cmUuaHApKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGaWx0ZXJzIG91dGNvbWVzIHRvIG9ubHkgb3V0Y29tZXMgdGhhdCBoYXZlIGRlc2lyZWQgcmVzdWx0c1xuICAgICAqIEBwYXJhbSBjcmVhdHVyZUlucHV0cyB7UmVhZG9ubHlBcnJheTxDcmVhdHVyZUluZm8+fSBhcnJheSB3aXRoIGNyZWF0dXJlIG9iamVjdHNcbiAgICAgKiBAcGFyYW0gb3V0Y29tZXMge1JlYWRvbmx5QXJyYXk8T3V0Y29tZT59IGFycmF5IG9mIG91dGNvbWVzXG4gICAgICogQHJldHVybnMge1JlYWRvbmx5QXJyYXk8T3V0Y29tZT59XG4gICAgICovXG4gICAgZnVuY3Rpb24gZmlsdGVyT3V0Y29tZXMoY3JlYXR1cmVJbnB1dHM6IFJlYWRvbmx5QXJyYXk8Q3JlYXR1cmVJbmZvPiwgb3V0Y29tZXM6IFJlYWRvbmx5QXJyYXk8T3V0Y29tZT4pOiBSZWFkb25seUFycmF5PE91dGNvbWU+IHtcbiAgICAgICAgcmV0dXJuIGNyZWF0dXJlSW5wdXRzLnJlZHVjZSgoYWNjLCBjKSA9PlxuICAgICAgICAgICAgICAgIGFjYy5maWx0ZXIob3V0Y29tZSA9PiBpc0Rlc2lyZWRPdXRjb21lKGMsIG91dGNvbWUpKSxcbiAgICAgICAgICAgIG91dGNvbWVzKTtcbiAgICB9XG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNhbGN1bGF0ZShjcmVhdHVyZUlucHV0OiBSZWFkb25seUFycmF5PENyZWF0dXJlSW5mbz4sIHBpbmdzOiBudW1iZXIpOiBudW1iZXIge1xuICAgICAgICBjb25zdCBjcmVhdHVyZXM6IFJlYWRvbmx5QXJyYXk8Q3JlYXR1cmU+ID0gY3JlYXR1cmVJbnB1dC5tYXAoYyA9PiAoe2lkOiBjLmlkLCBocDogYy5ocH0pKSxcbiAgICAgICAgICAgIHJvb3QgPSBjcmVhdGVPdXRjb21lVHJlZShjcmVhdHVyZXMsIHBpbmdzKSxcbiAgICAgICAgICAgIG91dGNvbWVzID0gZ2V0T3V0Y29tZXMocm9vdCksXG4gICAgICAgICAgICBmaWx0ZXJlZE91dGNvbWVzID0gZmlsdGVyT3V0Y29tZXMoY3JlYXR1cmVJbnB1dCwgb3V0Y29tZXMpLFxuICAgICAgICAgICAgc3VtbWVkUHJvYmFiaWxpdHkgPSBmaWx0ZXJlZE91dGNvbWVzLnJlZHVjZSgoYWNjLCBvdXRjb21lKSA9PiBhY2MgKyBvdXRjb21lLnAsIDApO1xuICAgICAgICByZXR1cm4gc3VtbWVkUHJvYmFiaWxpdHk7XG4gICAgfVxufSIsIlwidXNlIHN0cmljdFwiO1xuaW1wb3J0ICogYXMgJCBmcm9tIFwianF1ZXJ5XCI7XG5pbXBvcnQge1VJLCBIZWxwZXJzfSBmcm9tIFwiLi9oZWxwZXJzXCJcbmltcG9ydCB7UGluZywgQ3JlYXR1cmVJbmZvfSBmcm9tIFwiLi9waW5nLWNhbGN1bGF0aW9uXCI7XG5cbi8vIFRlbXBsYXRlIGZvciBjcmVhdGluZyBjcmVhdHVyZSBjYXJkc1xuY29uc3QgYmFzZSA9ICQoXCIjYmFzZVwiKTtcblxuLyoqXG4gKiBDaGFuZ2VzIGNyZWF0dXJlIGNhcmQgY29sb3IgZGVwZW5kaW5nIG9uIGRlc2lyZWQgbGlmZSBzdGF0dXNcbiAqL1xuZnVuY3Rpb24gY2hhbmdlTGlmZVN0YXR1cyhjb250ZXh0OiBKUXVlcnk8SFRNTEVsZW1lbnQ+KTogdm9pZCB7XG4gICAgY29uc3QgbmV3VmFsOiBudW1iZXIgPSBOdW1iZXIoJChjb250ZXh0KS52YWwoKSksXG4gICAgICAgIGNyZWF0dXJlQ2FyZCA9IGNvbnRleHQuY2xvc2VzdChcIi5jYXJkXCIpO1xuICAgIGlmIChuZXdWYWwpIHtcbiAgICAgICAgY3JlYXR1cmVDYXJkLnJlbW92ZUNsYXNzKFwiY2FyZC1zdWNjZXNzXCIpO1xuICAgICAgICBpZiAoY3JlYXR1cmVDYXJkLmhhc0NsYXNzKFwiZ29kXCIpKSB7XG4gICAgICAgICAgICBjcmVhdHVyZUNhcmQuYWRkQ2xhc3MoXCJjYXJkLXByaW1hcnlcIik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjcmVhdHVyZUNhcmQuYWRkQ2xhc3MoXCJjYXJkLWluZm9cIik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGlmIChjcmVhdHVyZUNhcmQuaGFzQ2xhc3MoXCJnb2RcIikpIHtcbiAgICAgICAgICAgIGNyZWF0dXJlQ2FyZC5yZW1vdmVDbGFzcyhcImNhcmQtcHJpbWFyeVwiKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNyZWF0dXJlQ2FyZC5yZW1vdmVDbGFzcyhcImNhcmQtaW5mb1wiKTtcbiAgICAgICAgfVxuICAgICAgICBjcmVhdHVyZUNhcmQuYWRkQ2xhc3MoXCJjYXJkLXN1Y2Nlc3NcIik7XG4gICAgfVxufVxuLyoqXG4gKiBDb2xsZWN0cyB1c2VyIGNyZWF0dXJlIGlucHV0IGFuZCBjcmVhdGVzIGFuIGFycmF5IG9mIGNyZWF0dXJlIG9iamVjdHNcbiAqIEByZXR1cm5zIHtBcnJheX0gIGFycmF5IHdpdGggb2JqZWN0cyBjb250YWluaW5nIHRvRGllLCBocCwgaWQgdmFyaWFibGVzXG4gKi9cbmZ1bmN0aW9uIGdldENyZWF0dXJlSW5wdXQoKTogQXJyYXk8Q3JlYXR1cmVJbmZvPiB7XG4gICAgY29uc3QgaW5wdXRzOiBBcnJheTxIVE1MRWxlbWVudD4gPSAkLm1ha2VBcnJheSgkKFwiLmNhcmQuY3JlYXR1cmVcIikubm90KFwiI2Jhc2VcIikpO1xuICAgIHJldHVybiBpbnB1dHMubWFwKCh2YWwsIGluZGV4KSA9PiB7XG4gICAgICAgIGNvbnN0IGlucHV0ID0gJCh2YWwpLFxuICAgICAgICAgICAgaHAgPSBOdW1iZXIoJChpbnB1dCkuZmluZChcImlucHV0LmNyZWF0dXJlLWhwXCIpLnZhbCgpKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRvRGllOiBOdW1iZXIoJChpbnB1dCkuZmluZChcInNlbGVjdFwiKS52YWwoKSkgPT09IDEsXG4gICAgICAgICAgICBocDogaHAsXG4gICAgICAgICAgICBpZDogaW5kZXhcbiAgICAgICAgfVxuICAgIH0pO1xufVxuLyoqXG4gKiBSZWFkcyBwaW5nIGlucHV0IGFuZCBhZGp1c3RzIHRoZSB2YWx1ZSB0byBiZSB3aXRoaW4gdmFsaWQgcmFuZ2UuIFVwZGF0ZXMgdGhlIGlucHV0IHZhbHVlIHRvIGFkanVzdGVkIHZhbHVlXG4gKiBhbmQgdGhlbiByZXR1cm5zIGFkanVzdGVkIHZhbHVlXG4gKiBAcmV0dXJucyB7bnVtYmVyfSAgICBhZGp1c3RlZCBwaW5nIHZhbHVlXG4gKi9cbmZ1bmN0aW9uIGdldFBpbmdJbnB1dCgpOiBudW1iZXIge1xuICAgIGNvbnN0IHBpbmdJbnB1dDogSlF1ZXJ5PEhUTUxFbGVtZW50PiA9ICQoXCIjcGluZy1jYXJkXCIpLmZpbmQoXCJpbnB1dFwiKSxcbiAgICAgICAgcGluZ3M6IG51bWJlciA9IHBpbmdJbnB1dC52YWwoKSBhcyBudW1iZXIsXG4gICAgICAgIHBpbmdBZGp1c3RlZDogbnVtYmVyID0gTWF0aC5taW4oTWF0aC5tYXgocGluZ3MsIDEpLCAxMik7XG4gICAgcGluZ0lucHV0LnZhbChwaW5nQWRqdXN0ZWQpO1xuICAgIHJldHVybiBwaW5nQWRqdXN0ZWQ7XG59XG5mdW5jdGlvbiBjbGVhbnVwTG9hZEluZGljYXRvcigpIHtcbiAgICAkKFwiI2NhbGN1bGF0ZS1idG5cIikucmVtb3ZlQ2xhc3MoXCJkaXNhYmxlZFwiKTtcbiAgICAkKFwiI2NhbGN1bGF0ZS1idG4gc3BhblwiKS5oaWRlKCk7XG59XG4vKipcbiAqIERpc2FibGVzIGNhbGN1bGF0ZSBidXR0b24gYW5kIHNob3dzIGEgc3Bpbm5pbmcgbG9hZCBpY29uXG4gKi9cbmZ1bmN0aW9uIGFkZExvYWRpbmdJbmRpY2F0b3IoKTogdm9pZCB7XG4gICAgJChcIiNjYWxjdWxhdGUtYnRuXCIpLmFkZENsYXNzKFwiZGlzYWJsZWRcIik7XG4gICAgJChcIiNjaGFuY2UtdGV4dC1udW1iZXJcIikuaHRtbChcIi0tLVwiKTtcbiAgICAkKFwiI2NhbGN1bGF0ZS1idG4gc3BhblwiKS5zaG93KCk7XG59XG4vKipcbiAqIENhbGN1bGF0ZXMgcGluZyBwcm9iYWJpbGl0eSBmcm9tIHVzZXIgaW5wdXQgYW5kIGRpc3BsYXlzIHJlc3VsdC5cbiAqL1xuZnVuY3Rpb24gcnVuKCkge1xuICAgIGNvbnN0IGNyZWF0dXJlcyA9IGdldENyZWF0dXJlSW5wdXQoKSxcbiAgICAgICAgcGluZ3MgPSBnZXRQaW5nSW5wdXQoKSxcbiAgICAgICAgcHJvbWlzZSA9IEhlbHBlcnMudGltZUZ1bmN0aW9uKFBpbmcuY2FsY3VsYXRlLCBjcmVhdHVyZXMsIHBpbmdzLCB0cnVlKTtcbiAgICBwcm9taXNlLnRoZW4oKHt0LCByZXN1bHRzfSkgPT4ge1xuICAgICAgICBVSS51cGRhdGVSZXN1bHRzKCh0IC8gMTAwMCkudG9GaXhlZCgzKSwgcmVzdWx0cyk7XG4gICAgICAgIFVJLnNoYWtlU2NyZWVuKHJlc3VsdHMpO1xuICAgICAgICBjbGVhbnVwTG9hZEluZGljYXRvcigpO1xuICAgIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaW5pdCgpOiB2b2lkIHtcbiAgICAkKFwiLmNyZWF0dXJlLmdvZCBzZWxlY3RcIikuY2hhbmdlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY2hhbmdlTGlmZVN0YXR1cygkKHRoaXMpKTtcbiAgICB9KTtcbiAgICAkKFwiI2FkZC1jYXJkLWJ0blwiKS5jbGljaygoKSA9PiB7XG4gICAgICAgIGNvbnN0IG5ld0NyZWF0dXJlID0gVUkuYWRkQ2FyZExpc3RlbmVyKGJhc2UpO1xuICAgICAgICBuZXdDcmVhdHVyZS5jaGFuZ2UoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY2hhbmdlTGlmZVN0YXR1cygkKHRoaXMpLmZpbmQoXCJzZWxlY3RcIikpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICAkKFwiI2NhbGN1bGF0ZS1idG5cIikuY2xpY2soKCkgPT4ge1xuICAgICAgICBhZGRMb2FkaW5nSW5kaWNhdG9yKCk7XG4gICAgICAgIHNldFRpbWVvdXQocnVuLCAxMDApOyAgLy8gVGltZW91dCBpcyB1c2VkIHRvIGxldCBET00gdXBkYXRlIGxvYWQgaW5kaWNhdG9yIGJlZm9yZSBoZWF2eSBydW4gZnVuY3Rpb25cbiAgICB9KTtcbiAgICBVSS5pbml0KCk7XG59Il19
