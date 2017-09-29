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
var R = require("ramda");
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
    // Add initial target card input
    helpers_1.UI.addCard(base);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhcHAvanMvZHJhdy1jYWxjdWxhdGlvbi50cyIsImFwcC9qcy9kcmF3LW1haW4udHMiLCJhcHAvanMvaGVscGVycy50cyIsImFwcC9qcy9tYWluLnRzIiwiYXBwL2pzL3BpbmctY2FsY3VsYXRpb24udHMiLCJhcHAvanMvcGluZy1tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUEsWUFBWSxDQUFDOztBQUNiLHFDQUFrQztBQUVyQixRQUFBLFNBQVMsR0FBRyxFQUFFLENBQUM7QUFFNUI7OztHQUdHO0FBQ0gsSUFBVSxXQUFXLENBbUZwQjtBQW5GRCxXQUFVLFdBQVc7SUFHakI7Ozs7O09BS0c7SUFDSCxnQkFBZ0IsQ0FBUyxFQUFFLENBQVM7UUFDaEMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqQixNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDZCxDQUFDO1FBQ0QsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDVixNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ2IsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMxQyxDQUFDO0lBQ0wsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCwwQkFBMEIsWUFBZ0M7UUFDdEQsTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsVUFBQyxHQUFHLEVBQUUsS0FBSztZQUNsQyxJQUFNLFlBQVksR0FBVyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQUMsT0FBTyxFQUFFLElBQUk7Z0JBQ3BELE1BQU0sQ0FBQyxPQUFPLEdBQUcsTUFB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QyxZQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2pCLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUM3QixnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUM5QixDQUFDLENBQUMsQ0FBQztJQUNILENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDckIsSUFBTSxXQUFXLEdBQUcsWUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QyxXQUFXLENBQUMsTUFBTSxDQUFDO1lBQ2YsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQzdDLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQyxDQUFDLENBQUM7SUFDSCxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDdEIsbUJBQW1CLEVBQUUsQ0FBQztRQUN0QixVQUFVLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUUsNkVBQTZFO0lBQ3hHLENBQUMsQ0FBQyxDQUFDO0lBQ0gsWUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ2QsQ0FBQztBQWpCRCxvQkFpQkMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXCJ1c2Ugc3RyaWN0XCI7XG5pbXBvcnQge0hlbHBlcnN9IGZyb20gXCIuL2hlbHBlcnNcIjtcblxuZXhwb3J0IGNvbnN0IERFQ0tfU0laRSA9IDMwO1xuZXhwb3J0IHR5cGUgQ2FyZEluZm8gPSB7IG5lZWRlZDogbnVtYmVyLCB0b3RhbDogbnVtYmVyLCB2YWx1ZTogbnVtYmVyfTtcbi8qKlxuICogQ2FsY3VsYXRpb24gbmFtZXNwYWNlIGNhbGN1bGF0ZXMgcHJvYmFiaWxpdHkgdG8gZHJhdyBkZXNpcmVkIGNhcmRzIHVzaW5nIGNvbWJpbmF0b3JpY3MuIEl0cyBkaXNhZHZhbnRhZ2UgaXMgdGhhdFxuICogaXQgZG9lcyBub3QgYWNjb3VudCBmb3Igc3RhcnRpbmcgaGFuZCBtdWxsaWdhbnMgYnV0IGlzIG11Y2ggZmFzdGVyIHRoYXQgc2ltdWxhdGlvbi5cbiAqL1xubmFtZXNwYWNlIENhbGN1bGF0aW9uIHtcbiAgICB0eXBlIENhcmQgPSB7IGRyYXduOiBudW1iZXIsIHRvdGFsOiBudW1iZXJ9O1xuICAgIHR5cGUgQ29tYmluYXRpb24gPSBBcnJheTxDYXJkPjtcbiAgICAvKipcbiAgICAgKiBSZWN1cnNpdmUgaW1wbGVtZW50YXRpb24gb2YgbiBjaG9vc2Ugay5cbiAgICAgKiBAcGFyYW0gIHtpbnR9IG4gVG90YWwgYW1vdW50IHRvIGNob29zZSBmcm9tXG4gICAgICogQHBhcmFtICB7aW50fSBrIEhvdyBtYW55IHRvIGNob29zZVxuICAgICAqIEByZXR1cm4ge2ludH0gICBSZXR1cm5zIGhvdyBtYW55IHBvc3NpYmxlIGNvbWJpbmF0aW9ucyBjYW4gYmUgZHJhd24gZGlzcmVnYXJkaW5nIG9yZGVyIGRyYXduXG4gICAgICovXG4gICAgZnVuY3Rpb24gY2hvb3NlKG46IG51bWJlciwgazogbnVtYmVyKTogbnVtYmVyIHtcbiAgICAgICAgaWYgKG4gPCAwIHx8IGsgPCAwKSB7XG4gICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGsgPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIChuICogY2hvb3NlKG4gLSAxLCBrIC0gMSkpIC8gaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIG51bWJlciBvZiBjb21iaW5hdGlvbnMgdGhlIGNhcmRzIGNhbiBtYWtlLiBGSVhNRSBleHBsYWluIGJldHRlci5cbiAgICAgKiBAcGFyYW0gY29tYmluYXRpb25zXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZnVuY3Rpb24gY29tYmluYXRpb25Db3VudChjb21iaW5hdGlvbnM6IEFycmF5PENvbWJpbmF0aW9uPik6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBjb21iaW5hdGlvbnMucmVkdWNlKChzdW0sIGNvbWJvKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjb21ib1Byb2R1Y3Q6IG51bWJlciA9IGNvbWJvLnJlZHVjZSgocHJvZHVjdCwgY2FyZCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBwcm9kdWN0ICogY2hvb3NlKGNhcmQudG90YWwsIGNhcmQuZHJhd24pO1xuICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgICAgICByZXR1cm4gY29tYm9Qcm9kdWN0ICsgc3VtO1xuICAgICAgICB9LCAwKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGaWxscyBhIGNvbWJpbmF0aW9ucyBvZiB0YXJnZXQgY2FyZHMgd2l0aCByZW1haW5pbmcgZHJhd3MgZnJvbSBub24gdGFyZ2V0IGNhcmRzIGFuZCByZXR1cm5zIHRoYXQgdXBkYXRlZFxuICAgICAqIGFycmF5IG9mIGNvbWJpbmF0aW9ucy5cbiAgICAgKiBAcGFyYW0gdGFyZ2V0Q29tYmluYXRpb25zXG4gICAgICogQHBhcmFtIGRyYXdzXG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZpbGxDb21iaW5hdGlvbnModGFyZ2V0Q29tYmluYXRpb25zOiBBcnJheTxDb21iaW5hdGlvbj4sIGRyYXdzOiBudW1iZXIpOiBBcnJheTxDb21iaW5hdGlvbj4ge1xuICAgICAgICBjb25zdCBub25UYXJnZXRBbW91bnQ6IG51bWJlciA9IERFQ0tfU0laRSAtIHRhcmdldENvbWJpbmF0aW9uc1swXS5yZWR1Y2UoKGFjYywgY2FyZCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBhY2MgKyBjYXJkLnRvdGFsO1xuICAgICAgICAgICAgfSwgMCk7XG4gICAgICAgIC8vIEFkZCB0aGUgcmVtYWluaW5nIGRyYXdzIChhZnRlciBjb21iaW5hdGlvbiBoYXMgYmVlbiBkcmF3bikgZnJvbSBub24gdGFyZ2V0IGNhcmRzXG4gICAgICAgIHJldHVybiB0YXJnZXRDb21iaW5hdGlvbnMubWFwKChjb21ibykgPT4ge1xuICAgICAgICAgICAgY29uc3QgZHJhd246IG51bWJlciA9IGNvbWJvLnJlZHVjZSgoZHJhd0FjYywgY2FyZCkgPT4gZHJhd0FjYyArIGNhcmQuZHJhd24sIDApLFxuICAgICAgICAgICAgICAgIGRyYXdzTGVmdDogbnVtYmVyID0gTWF0aC5tYXgoZHJhd3MgLSBkcmF3biwgMCk7XG4gICAgICAgICAgICByZXR1cm4gY29tYm8uY29uY2F0KHt0b3RhbDogbm9uVGFyZ2V0QW1vdW50LCBkcmF3bjogZHJhd3NMZWZ0fSlcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbGwgdmFsaWQgY29tYmluYXRpb24gb2YgdGFyZ2V0IGNhcmQgZHJhd3MuIERyYXdzIG9ubHkgZnJvbSB0YXJnZXQgY2FyZHMsIHRoZSBkZWNrIGlzIG5vdCBjb25zaWRlcmVkLlxuICAgICAqIEV2ZXJ5IHZhbGlkIGNhcmQgZHJhdyBpcyByZXByZXNlbnRlZCBhcyBhbiBhcnJheSB3aXRoIHR3byB2YWx1ZXMgW3RvdGFsLCBkcmF3bl0sIGZvciBhIHRhcmdldENhcmQge25lZWRlZDogMiwgYW1vdW50OiAzfVxuICAgICAqIHR3byBhcnJheSB3aWxsIGJlIGNyZWF0ZWQgc2luY2UgdGhlcmUgYXJlIHR2byB2YWxpZCBjb21iaW5hdGlvbnMgb2YgdGhhdCBjYXJkIChkcmF3biA9IDIgYW5kIGRyYXduID0gMyksXG4gICAgICogZWFjaCBzZXBhcmF0ZSBjb21iaW5hdGlvbiBvZiBhIGNhcmQgd2lsbCB0aGVuIGJlIGNvbWJpbmVkIHdpdGggYWxsIG90aGVyIGNhcmRzIHZhbGlkIGNvbWJpbmF0aW9ucyB0byBjcmVhdGVcbiAgICAgKiBhbGwgdmFsaWQgY29tYmluYXRpb25zIG9mIHRhcmdldCBjYXJkIGRyYXdzLlxuICAgICAqIEBwYXJhbSB0YXJnZXRDYXJkcyB7Q2FyZEluZm99XG4gICAgICogQHBhcmFtIGFjdGl2ZUNvbWJvIHtDb21iaW5hdGlvbn1cbiAgICAgKiBAcmV0dXJucyB7QXJyYXk8Q29tYmluYXRpb24+fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHRhcmdldENvbWJpbmF0aW9ucyh0YXJnZXRDYXJkczogQXJyYXk8Q2FyZEluZm8+LCBhY3RpdmVDb21ibzogQ29tYmluYXRpb24gPSBbXSk6IEFycmF5PENvbWJpbmF0aW9uPiB7XG4gICAgICAgIGlmICh0YXJnZXRDYXJkcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBbYWN0aXZlQ29tYm9dOyAgLy8gTm90IGVudGlyZWx5IHN1cmUgd2h5IEkgbmVlZCB0byB3cmFwIHRoaXNcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBbY2FyZCwgLi4uY2FyZHNMZWZ0XSA9IHRhcmdldENhcmRzO1xuICAgICAgICByZXR1cm4gSGVscGVycy5yYW5nZUluY2x1c2l2ZShjYXJkLm5lZWRlZCwgY2FyZC50b3RhbCkucmVkdWNlKChyZXN1bHRzLCBjdXJyZW50TmVlZGVkKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0cy5jb25jYXQodGFyZ2V0Q29tYmluYXRpb25zKGNhcmRzTGVmdCwgYWN0aXZlQ29tYm8uY29uY2F0KHt0b3RhbDogY2FyZC50b3RhbCwgZHJhd246IGN1cnJlbnROZWVkZWR9KSkpO1xuICAgICAgICB9LCBbXSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGNhcmRzIHtBcnJheTxDYXJkSW5mbz59ICAgICBBcnJheSBjb250YWluaW5nIE9iamVjdHMgd2l0aCBpbmZvcm1hdGlvbiBhYm91dCB0YXJnZXQgY2FyZHMgKGFtb3VudCwgbmVlZGVkKVxuICAgICAqIEBwYXJhbSBkcmF3cyB7bnVtYmVyfSAgICBBbW91bnQgb2YgZHJhd3NcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSAgICAgICAgQ2hhbmNlIHRvIGRyYXcgZGVzaXJlZCBoYW5kXG4gICAgICovXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNhbGN1bGF0ZShjYXJkczogQXJyYXk8Q2FyZEluZm8+LCBkcmF3czogbnVtYmVyKTogbnVtYmVyIHtcbiAgICAgICAgY29uc3QgdmFsaWRUYXJnZXRDb21iaW5hdGlvbnMgPSB0YXJnZXRDb21iaW5hdGlvbnMoY2FyZHMpLFxuICAgICAgICAgICAgYWxsVmFsaWRDb21iaW5hdGlvbnMgPSBmaWxsQ29tYmluYXRpb25zKHZhbGlkVGFyZ2V0Q29tYmluYXRpb25zLCBkcmF3cyk7XG4gICAgICAgIHJldHVybiBjb21iaW5hdGlvbkNvdW50KGFsbFZhbGlkQ29tYmluYXRpb25zKSAvIGNob29zZShERUNLX1NJWkUsIGRyYXdzKTtcbiAgICB9XG59XG5cbi8qKlxuICogU2ltdWxhdGlvbiBuYW1lc3BhY2UgY2FsY3VsYXRlcyBkcmF3IHByb2JhYmlsaXR5IGJ5IHNpbXVsYXRpbmcgbWFueSBoYW5kcyBkcmF3biBhbmQgbG9va2luZyBhdCB0aGUgbnVtYmVyIG9mIGRlc2lyZWQgaGFuZHNcbiAqIGZvdW5kIGluIHJlbGF0aW9uIHRvIGFsbCBoYW5kcyBkcmF3bi4gSXQgYWxzbyBzaW11bGF0ZXMgaW50ZWxsaWdlbnQgbXVsbGlnYW5zIHdoaWNoIGlzIGl0cyBvbmx5IGFkdmFudGFnZSBvdmVyXG4gKiBDYWxjdWxhdGlvbiBuYW1lc3BhY2Ugc29sdXRpb24uXG4gKiBUaGlzIG5hbWVzcGFjZSB1c2VzIHNpZGUgZWZmZWN0cyBoZWF2aWx5LCBoYXZpbmcgcHVyZSBmdW5jdGlvbnMgYWZmZWN0ZWQgcGVyZm9ybWFuY2UgaW4gYSB2ZXJ5IGJhZCB3YXkgSSBmb3VuZC5cbiAqL1xubmFtZXNwYWNlIFNpbXVsYXRpb24ge1xuICAgIC8qKlxuICAgICAqIEluIHBsYWNlIHN3YXBzIHZhbHVlcyBvZiBpIGFuZCBqIGluZGV4ZXMgaW4gYXJyYXkuXG4gICAgICogQHBhcmFtICB7QXJyYXl9IGEgW2Rlc2NyaXB0aW9uXVxuICAgICAqIEBwYXJhbSAge2ludH0gaSBpbmRleCAxXG4gICAgICogQHBhcmFtICB7aW50fSBqIGluZGV4IDJcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzd2FwKGE6IEFycmF5PGFueT4sIGk6IG51bWJlciwgajogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGxldCB0ZW1wID0gYVtpXTtcbiAgICAgICAgYVtpXSA9IGFbal07XG4gICAgICAgIGFbal0gPSB0ZW1wO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBTaHVmZmxlcyBhcnJheSBpbiBwbGFjZS4gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9hLzYyNzQzODFcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBhIEFycmF5IHRvIGJlIHNodWZmbGVkLlxuICAgICAqIEByZXR1cm4ge0FycmF5fSAgcmV0dXJucyBzaHVmZmxlZCBhcnJheVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNodWZmbGUoYTogQXJyYXk8YW55Pik6IEFycmF5PGFueT4ge1xuICAgICAgICBmb3IgKGxldCBpID0gYS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgbGV0IGogPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBpKTtcbiAgICAgICAgICAgIHN3YXAoYSwgaSwgaik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGE7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gYXJyYXkgb2YgaW50ZWdlcnMgcmVwcmVzZW50aW5nIHRoZSBkZWNrLiBDYXJkcyBvZiBubyBpbnRlcmVzdCBhcmUgYWRkZWQgYXMgLTEsIHRhcmdldCBjYXJkc1xuICAgICAqIGFyZSBhZGRlZCB3aXRoIHZhbHVlIGNvbnRhaW5lZCBpbiBjYXJkIE9iamVjdCBpbiB0YXJnZXRDYXJkcyBhcnJheS5cbiAgICAgKiBAcGFyYW0gIHtBcnJheX0gdGFyZ2V0Q2FyZHMgQXJyYXkgY29udGFpbmluZyBjYXJkIE9iamVjdHNcbiAgICAgKiBAcmV0dXJuIHtBcnJheX0gICAgICAgICAgUmV0dXJucyBhcnJheSByZXByZXNlbnRpbmcgdGhlIHBvcHVsYXRlZCBkZWNrLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNyZWF0ZURlY2sodGFyZ2V0Q2FyZHM6IEFycmF5PENhcmRJbmZvPik6IEFycmF5PG51bWJlcj4ge1xuICAgICAgICBjb25zdCB0YXJnZXRzID0gdGFyZ2V0Q2FyZHMubWFwKGNhcmQgPT4gQXJyYXk8bnVtYmVyPihjYXJkLnRvdGFsKS5maWxsKGNhcmQudmFsdWUpKSxcbiAgICAgICAgICAgIG5vblRhcmdldHMgPSBBcnJheSgzMCkuZmlsbCgtMSk7XG4gICAgICAgIHJldHVybiBbXS5jb25jYXQoLi4udGFyZ2V0cywgbm9uVGFyZ2V0cykuc2xpY2UoMCwgMzApO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgZGVjayBjb250YWlucyBjYXJkIGluIHRoZSBuZWVkZWQgYW1vdW50LlxuICAgICAqIEBwYXJhbSAge0FycmF5fSBkZWNrICBEZWNrIHJlcHJlc2VudGVkIGFzIGludGVnZXIgYXJyYXlcbiAgICAgKiBAcGFyYW0gIHtDYXJkSW5mb30gY2FyZCBTb3VnaHQgYWZ0ZXIgY2FyZCBvYmplY3RcbiAgICAgKiBAcmV0dXJuIHtib29sZWFufSAgICAgIFRydWUgaWYgZGVjayBjb250YWlucyBjYXJkLnZhbHVlIGF0bGVhc3QgY2FyZC5uZWVkZWQgYW1vdW50IG9mIHRpbWVzXG4gICAgICovXG4gICAgZnVuY3Rpb24gY29udGFpbnMoZGVjazogQXJyYXk8bnVtYmVyPiwgY2FyZDogQ2FyZEluZm8pOiBib29sZWFuIHtcbiAgICAgICAgaWYgKGNhcmQubmVlZGVkIDw9IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkZWNrLnJlZHVjZSgoYWNjLCBjYXJkVmFsKSA9PlxuICAgICAgICAgICAgICAgIChjYXJkVmFsID09PSBjYXJkLnZhbHVlKSA/IGFjYyArIDEgOiBhY2MsIDApID49IGNhcmQubmVlZGVkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVzZWQgYWZ0ZXIgc3RhcnRpbmcgaGFuZCBpcyBtdWxsaWdhbmVkIHRvIHB1dCBub24gdGFyZ2V0IGNhcmRzIGJhY2sgaW4gZGVjay5cbiAgICAgKiBAcGFyYW0ge0FycmF5PG51bWJlcj59IGRlY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiByZXBsYWNlTm9uVGFyZ2V0KGRlY2s6IEFycmF5PG51bWJlcj4pIHtcbiAgICAgICAgZGVjay5wdXNoKC0xKTtcbiAgICAgICAgY29uc3QgbmV3SW5kZXggPSBIZWxwZXJzLmdldFJhbmRvbUludCgwLCBkZWNrLmxlbmd0aCk7XG4gICAgICAgIHN3YXAoZGVjaywgZGVjay5sZW5ndGggLSAxLCBuZXdJbmRleCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRocm93cyBhd2F5IGFsbCBub24gdGFyZ2V0IGNhcmRzIGluIHN0YXJ0aW5nIGhhbmQuXG4gICAgICogQHBhcmFtICB7QXJyYXl9IGRlY2sgICAgICAgICAgIERlY2sgcmVwcmVzZW50ZWQgYXMgaW50ZWdlciBhcnJheVxuICAgICAqIEByZXR1cm4ge0FycmF5fSAgICAgICAgICAgICAgICBBbiBhcnJheSB3aGVyZSB0aGUgZmlyc3Qgb2JqZWN0IGlzIGFjdGl2ZSBoYW5kIGFuZCBzZWNvbmQgaXMgYWN0aXZlIGRlY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBtdWxsaWdhbihkZWNrOiBBcnJheTxudW1iZXI+KTogQXJyYXk8QXJyYXk8bnVtYmVyPj4ge1xuICAgICAgICBjb25zdCBzdGFydGluZ0hhbmQgPSBkZWNrLnNsaWNlKDAsIDMpLFxuICAgICAgICAgICAgYWN0aXZlRGVjayA9IGRlY2suc2xpY2UoMyksXG4gICAgICAgICAgICBoYW5kQWZ0ZXJNdWxsaWdhbiA9IHN0YXJ0aW5nSGFuZC5maWx0ZXIoKHZhbCkgPT4gdmFsID49IDApLFxuICAgICAgICAgICAgbXVsbGlnYW5Db3VudCA9IDMgLSBoYW5kQWZ0ZXJNdWxsaWdhbi5sZW5ndGg7XG4gICAgICAgIC8qIFB1dCBtdWxsaWdhbmVkIGNhcmRzIGJhY2sgaW4gZGVjay4gQWxsIG11bGxpZ2FuZWQgY2FyZHMgYXJlIG9mIG5vIGludGVyZXN0ICgtMSkgKi9cbiAgICAgICAgSGVscGVycy5yYW5nZSgwLCBtdWxsaWdhbkNvdW50KS5mb3JFYWNoKChfKSA9PiByZXBsYWNlTm9uVGFyZ2V0KGFjdGl2ZURlY2spKTtcbiAgICAgICAgcmV0dXJuIFtoYW5kQWZ0ZXJNdWxsaWdhbiwgYWN0aXZlRGVja107XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFBlcmZvcm1zIGEgbXVsbGlnYW4sIHNodWZmbGVzIGFnYWluLCBkcmF3cyByZW1haW5pbmcgY2FyZHMgYW5kIGNoZWNrcyBpZiBhbGwgY2FyZHMgYXJlIHJlcHJlc2VudGVkXG4gICAgICogYXQgbGVhc3QgdGhlIG5lZWRlZCBhbW91bnQgb2YgdGltZXMuXG4gICAgICogQHBhcmFtICB7QXJyYXl9IGRlY2sgICAgIERlY2sgcmVwcmVzZW50ZWQgYXMgaW50ZWdlciBhcnJheSwgc2hvdWxkIGJlIHNodWZmbGVkIGJlZm9yZWhhbmRcbiAgICAgKiBAcGFyYW0gIHtBcnJheX0gdGFyZ2V0Q2FyZHMgICAgIEFycmF5IGNvbnRhaW5pbmcgZGVzaXJlZCBjYXJkcyB3aXRoIGluZm9ybWF0aW9uXG4gICAgICogQHBhcmFtICB7TnVtYmVyfSBkcmF3QW1vdW50IGFtb3VudCBvZiBjYXJkcyBkcmF3blxuICAgICAqIEByZXR1cm4ge2Jvb2xlYW59ICAgICAgICAgIFJldHVybnMgdHJ1ZSBpZiBkcmF3biBjYXJkcyBjb250YWluIGFsbCByZXF1aXJlZCBjYXJkcy5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiB0cmlhbChkZWNrOiBBcnJheTxudW1iZXI+LCB0YXJnZXRDYXJkczogQXJyYXk8Q2FyZEluZm8+LCBkcmF3QW1vdW50OiBudW1iZXIpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgW2hhbmRBZnRlck11bGxpZ2FuLCBkZWNrQWZ0ZXJNdWxsaWdhbl0gPSBtdWxsaWdhbihkZWNrKSxcbiAgICAgICAgICAgIHJlbWFpbmluZ0RyYXdzID0gZHJhd0Ftb3VudCAtIGhhbmRBZnRlck11bGxpZ2FuLmxlbmd0aCwgIC8vIDMgaXMgc3RhcnRpbmcgaGFuZCBzaXplIGJlZm9yZSBtdWxsaWdhblxuICAgICAgICAgICAgaGFuZEFmdGVyRHJhd3MgPSBoYW5kQWZ0ZXJNdWxsaWdhbi5jb25jYXQoIC4uLmRlY2tBZnRlck11bGxpZ2FuLnNsaWNlKDAsIHJlbWFpbmluZ0RyYXdzKSk7XG4gICAgICAgIC8vIFJldHVybiB0cnVlIGlmIGV2ZXJ5IG5lZWRlZCBjYXJkIGlzIGNvbnRhaW5lZCBpbiBkcmF3biBjYXJkc1xuICAgICAgICByZXR1cm4gdGFyZ2V0Q2FyZHMuZXZlcnkoKGNhcmQpID0+IGNvbnRhaW5zKGhhbmRBZnRlckRyYXdzLCBjYXJkKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFNpbXVsYXRlcyBzZXZlcmFsIHNlcGFyYXRlIGluc3RhbmNlcyBvZiBkZWNrcyB3aXRoXG4gICAgICogZHJhd0Ftb3VudCBvZiBkcmF3cyBhbmQgY2hlY2tzIGlmIHJlcXVpcmVkIGNhcmRzIGFyZSBjb250YWluZWQgaW4gaGFuZC5cbiAgICAgKiBAcGFyYW0gIHtBcnJheX0gdGFyZ2V0Q2FyZHMgICAgIEFycmF5IGNvbnRhaW5pbmcgZGVzaXJlZCBjYXJkcyB3aXRoIGluZm9ybWF0aW9uXG4gICAgICogQHBhcmFtICB7bnVtYmVyfSBkcmF3QW1vdW50IGFtb3VudCBvZiBjYXJkcyBkcmF3blxuICAgICAqIEBwYXJhbSAge251bWJlcn0gdHJpZXMgSG93IG1hbnkgdGltZXMgZHJhd1NpbXVsYXRpb24gc2hvdWxkIGJlIHJ1blxuICAgICAqIEByZXR1cm4ge251bWJlcn0gICAgICAgICAgICByYXRpbyBvZiBzdWNjZXNzZnVsIGRyYXdzIHRvIHRvdGFsIGRyYXdzXG4gICAgICovXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNpbXVsYXRlKHRhcmdldENhcmRzOiBBcnJheTxDYXJkSW5mbz4sIGRyYXdBbW91bnQ6IG51bWJlciwgdHJpZXM6IG51bWJlcj0yMDAwMDApOiBudW1iZXIge1xuICAgICAgICBjb25zdCBkZWNrID0gY3JlYXRlRGVjayh0YXJnZXRDYXJkcyksXG4gICAgICAgICAgICBkZXNpcmVkT3V0Y29tZXMgPSBIZWxwZXJzLnJhbmdlKDAsIHRyaWVzKVxuICAgICAgICAgICAgICAgIC5tYXAoIF8gPT4gdHJpYWwoc2h1ZmZsZShkZWNrKSwgdGFyZ2V0Q2FyZHMsIGRyYXdBbW91bnQpKVxuICAgICAgICAgICAgICAgIC5maWx0ZXIodiA9PiB2KS5sZW5ndGg7XG4gICAgICAgIHJldHVybiBkZXNpcmVkT3V0Y29tZXMgLyB0cmllcztcbiAgICB9XG59XG5leHBvcnQgY29uc3QgcnVuU2ltdWxhdGlvbiA9IFNpbXVsYXRpb24uc2ltdWxhdGU7XG5leHBvcnQgY29uc3QgcnVuQ2FsY3VsYXRpb24gPSBDYWxjdWxhdGlvbi5jYWxjdWxhdGU7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5pbXBvcnQgKiBhcyAkIGZyb20gXCJqcXVlcnlcIjtcbmltcG9ydCB7VUksIEhlbHBlcnN9IGZyb20gXCIuL2hlbHBlcnNcIlxuaW1wb3J0ICogYXMgRHJhdyBmcm9tIFwiLi9kcmF3LWNhbGN1bGF0aW9uXCI7XG5pbXBvcnQge0NhcmRJbmZvfSBmcm9tIFwiLi9kcmF3LWNhbGN1bGF0aW9uXCI7XG5cbmNvbnN0IGJhc2U6IEpRdWVyeTxIVE1MRWxlbWVudD4gPSAkKFwiI2Jhc2VcIik7ICAvLyBiYXNlIHRlbXBsYXRlIGZvciBjYXJkc1xuXG4vKipcbiAqIENyZWF0ZXMgZWZmZWN0cyBvbiBzY3JlZW4gYmFzZWQgb24gdGhlIGFtb3VudCBvZiBiYWQgbHVjayBwbGF5ZXJcbiAqIGhhcyBwYWluZnVsbHkgZW5kdXJlZC4gQSBoaWdoIGMgd2lsbCBjcmVhdGUgbGFyZ2VyIGVmZmVjdHMuXG4gKiBAcGFyYW0gIHtpbnR9IGMgdGhlIG51bWJlciBvZiBkZXNpcmVkIGhhbmRzXG4gKi9cbmZ1bmN0aW9uIHJlc3VsdFNjcmVlbkVmZmVjdHMoYzogbnVtYmVyKTogdm9pZCB7XG4gICAgVUkuc2hha2VTY3JlZW4oYyk7XG59XG4vKipcbiAqIERpc3BsYXkgZXJyb3IgdGV4dCBpZiB1c2VyIGlucHV0IGlzIGluY29ycmVjdFxuICovXG5mdW5jdGlvbiBkaXNwbGF5RXJyb3IobXNnOiBKUXVlcnk8SFRNTEVsZW1lbnQ+KTogdm9pZCB7XG4gICAgJChcIiNlcnJvci1tZXNzYWdlXCIpLmh0bWwobXNnKTtcbiAgICAkKFwiI2Vycm9yLXdyYXBwZXJcIikuc2hvdygpO1xuICAgICQoXCIjcmVzdWx0cy13cmFwcGVyXCIpLmhpZGUoKTtcbn1cblxuLyoqXG4gKiBDb2xsZWN0cyB1c2VyIGNhcmQgcmVsYXRlZCBpbnB1dCBhbmQgcmVwcmVzZW50cyBlYWNoIGNhcmQgYXMgYW4gb2JqZWN0IHdpdGhcbiAqIG5lZWRlZCwgYW1vdW50LCB2YWx1ZSwgZm91bmRBbW91bnQgdmFyaWFibGVzLiBDYXJkIG9iamVjdHMgYXJlIHJldHVybmVkIGluIGFuIGFycmF5LlxuICogQHJldHVybiB7QXJyYXk8Q2FyZEluZm8+fSBBcnJheSBvZiBPYmplY3RzIHJlcHJlc2VudGluZyBlYWNoIHRhcmdldCBjYXJkXG4gKi9cbmZ1bmN0aW9uIGdldENhcmRJbnB1dCgpOiBBcnJheTxDYXJkSW5mbz4ge1xuICAgIGNvbnN0IGlucHV0czogQXJyYXk8SFRNTEVsZW1lbnQ+ID0gJC5tYWtlQXJyYXkoJChcIi5kcmF3XCIpLm5vdChcIiNiYXNlXCIpKTtcbiAgICByZXR1cm4gaW5wdXRzLm1hcCgodmFsLCBpbmRleCkgPT4ge1xuICAgICAgICBjb25zdCBpbnB1dCA9ICQodmFsKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG5lZWRlZDogTnVtYmVyKGlucHV0LmZpbmQoXCIuY2FyZC1uZWVkXCIpLnZhbCgpKSxcbiAgICAgICAgICAgIHRvdGFsOiBOdW1iZXIoaW5wdXQuZmluZChcIi5jYXJkLWRlY2tcIikudmFsKCkpLFxuICAgICAgICAgICAgdmFsdWU6IGluZGV4XG4gICAgICAgIH07XG4gICAgfSk7XG59XG5cbi8qKlxuICogQ2hlY2tzIGFsbCB1c2VyIGVudGVyZWQgaW5wdXQuIFJldHVybnMgYW4gb2JqZWN0IGNvbnRhaW5pbmcgdmFsaWRpdHkgYW5kIG9wdGlvbmFsbHlcbiAqIGEgbWVzc2FnZSB0byBleHBsYWluIHdoYXQgaXMgbm90IHZhbGlkLlxuICogQHBhcmFtICB7aW50fSAgZHJhd0Ftb3VudCAgICBVc2VyIGVudGVyZWQgY2FyZCBkcmF3IHZhbHVlXG4gKiBAcGFyYW0ge0FycmF5PENhcmRJbmZvPn0gICAgY2FyZElucHV0cyAgICBhcnJheSBvZiBvYmplY3RzIGNvbnRhaW5pbmcgZWFjaCBjYXJkIGlucHV0LlxuICogQHJldHVybiB7T2JqZWN0fSAgICAgICAgICAgICBPYmplY3QgY29udGFpbmluZyB2YWxpZGl0eSBhbmQgbXNnIHZhbHVlc1xuICovXG5mdW5jdGlvbiBpc0lucHV0VmFsaWQoZHJhd0Ftb3VudDogbnVtYmVyLCBjYXJkSW5wdXRzOiBBcnJheTxDYXJkSW5mbz4pOiB7aXNWYWxpZDogYm9vbGVhbiwgZXJyb3JNc2c6IEpRdWVyeTxIVE1MRWxlbWVudD59IHtcbiAgICBjb25zdCB0b3RhbEFtb3VudDogbnVtYmVyID0gY2FyZElucHV0cy5yZWR1Y2UoKGFjYywgaW5wdXQpID0+IGFjYyArIE51bWJlcihpbnB1dC50b3RhbCksIDApO1xuICAgIC8vIFVzZXIgc3VwcG9zZXMgYSBsYXJnZXIgZGVjayB0aGFuIGlzIHBvc3NpYmxlXG4gICAgaWYgKHRvdGFsQW1vdW50ID4gRHJhdy5ERUNLX1NJWkUpIHtcbiAgICAgICAgcmV0dXJuIHtpc1ZhbGlkOiBmYWxzZSxcbiAgICAgICAgICAgIGVycm9yTXNnOiAkKFwiPHNwYW4+XCIpLmFwcGVuZChcIlRhcmdldCBjYXJkIFwiLCBVSS5oaWdobGlnaHRXcmFwKFwiYW1vdW50c1wiKSwgXCIgc3VtIGV4Y2VlZHMgZGVjayBzaXplXCIpfTtcbiAgICB9XG4gICAgY29uc3QgdG90YWxOZWVkZWQ6IG51bWJlciA9IGNhcmRJbnB1dHMucmVkdWNlKChhY2MsIGlucHV0KSA9PiBhY2MgKyBOdW1iZXIoaW5wdXQubmVlZGVkKSwgMCk7XG4gICAgLy8gVXNlciBuZWVkcyBtb3JlIGNhcmRzIHRoYW4gdGhlcmUgYXJlIGRyYXdzLCB3aWxsIGFsd2F5cyBmYWlsLlxuICAgIGlmICh0b3RhbE5lZWRlZCA+IGRyYXdBbW91bnQpIHtcbiAgICAgICAgcmV0dXJuIHtpc1ZhbGlkOiBmYWxzZSxcbiAgICAgICAgICAgIGVycm9yTXNnOiAkKFwiPHNwYW4+XCIpLmFwcGVuZChcIkZld2VyIFwiLCBVSS5oaWdobGlnaHRXcmFwKFwiZHJhd3MgXCIpLCBcInRoYW4gXCIsIFVJLmhpZ2hsaWdodFdyYXAoXCJuZWVkZWRcIiksIFwiIGNhcmRzXCIpfTtcbiAgICB9XG4gICAgY29uc3QgdmFsaWROZWVkZWQ6IGJvb2xlYW4gPSBjYXJkSW5wdXRzLmV2ZXJ5KChpbnB1dCkgPT4gTnVtYmVyKGlucHV0LnRvdGFsKSA+PSBOdW1iZXIoaW5wdXQubmVlZGVkKSk7XG4gICAgLy8gT25lIG9yIG1vcmUgbmVlZGVkIHZhbHVlcyBleGNlZWRzIGl0cyBhbW91bnQgaW4gZGVja1xuICAgIGlmICghdmFsaWROZWVkZWQpIHtcbiAgICAgICAgcmV0dXJuIHtpc1ZhbGlkOiBmYWxzZSxcbiAgICAgICAgICAgIGVycm9yTXNnOiAkKFwiPHNwYW4+XCIpLmFwcGVuZChVSS5oaWdobGlnaHRXcmFwKFwiTmVlZGVkXCIpLCBcIiBjYW5ub3QgYmUgbGFyZ2VyIHRoYW4gY2FyZCBcIiwgVUkuaGlnaGxpZ2h0V3JhcChcImFtb3VudFwiKSwgXCIgaW4gZGVja1wiKX07XG4gICAgfVxuICAgIHJldHVybiB7aXNWYWxpZDogdHJ1ZSwgZXJyb3JNc2c6ICQoXCJcIil9O1xufVxuLyoqXG4gKiBEaXNhYmxlcyBjYWxjdWxhdGUgYnV0dG9uIGFuZCBzaG93cyBhIHNwaW5uaW5nIGxvYWQgaWNvblxuICovXG5mdW5jdGlvbiBhZGRMb2FkaW5nSW5kaWNhdG9yKCk6IHZvaWQge1xuICAgICQoXCIjY2FsY3VsYXRlLWJ0blwiKS5hZGRDbGFzcyhcImRpc2FibGVkXCIpO1xuICAgICQoXCIjY2hhbmNlLXRleHQtbnVtYmVyXCIpLmh0bWwoXCItLS1cIik7XG4gICAgJChcIiNlcnJvci13cmFwcGVyXCIpLmhpZGUoKTtcbiAgICAkKFwiI3Jlc3VsdHMtd3JhcHBlclwiKS5zaG93KCk7XG4gICAgJChcIiNjYWxjdWxhdGUtYnRuIHNwYW5cIikuc2hvdygpO1xufVxuLyoqXG4gKiBSZW1vdmVzIGVmZmVjdHMgc2hvd24gd2hpbGUgbG9hZGluZ1xuICovXG5mdW5jdGlvbiBjbGVhbnVwTG9hZGluZ0luZGljYXRvcigpOiB2b2lkIHtcbiAgICAkKFwiI2NhbGN1bGF0ZS1idG4gc3BhblwiKS5oaWRlKCk7XG4gICAgJChcIiNjYWxjdWxhdGUtYnRuXCIpLnJlbW92ZUNsYXNzKFwiZGlzYWJsZWRcIik7XG59XG4vKipcbiAqIFZhbGlkYXRlcyB1c2VyIGlucHV0IGFuZCBydW5zIGRyYXdTaW11bGF0aW9uIGlmIGlucHV0IGlzIHZhbGlkLlxuICovXG5mdW5jdGlvbiBydW4oKTogdm9pZCB7XG4gICAgY29uc3Qgc21hcnRNdWxsaWdhbjogYm9vbGVhbiA9ICQoXCIjbXVsbGlnYW4tY2hlY2tib3hcIikuaXMoJzpjaGVja2VkJyksXG4gICAgICAgIGRyYXdBbW91bnQgPSAkKFwiLmRyYXctYW1vdW50XCIpLnZhbCgpIGFzIG51bWJlcixcbiAgICAgICAgY2FyZEluZm8gPSBnZXRDYXJkSW5wdXQoKSxcbiAgICAgICAge2lzVmFsaWQsIGVycm9yTXNnfSA9IGlzSW5wdXRWYWxpZChkcmF3QW1vdW50LCBjYXJkSW5mbyk7XG4gICAgaWYgKGlzVmFsaWQpIHtcbiAgICAgICAgY29uc3QgZnVuYyA9IChzbWFydE11bGxpZ2FuKSA/IERyYXcucnVuU2ltdWxhdGlvbiA6IERyYXcucnVuQ2FsY3VsYXRpb24sXG4gICAgICAgICAgICBwcm9taXNlID0gSGVscGVycy50aW1lRnVuY3Rpb24oZnVuYywgY2FyZEluZm8sIGRyYXdBbW91bnQpO1xuICAgICAgICBwcm9taXNlLnRoZW4oKHt0LCByZXN1bHRzfSkgPT4ge1xuICAgICAgICAgICAgY2xlYW51cExvYWRpbmdJbmRpY2F0b3IoKTtcbiAgICAgICAgICAgIFVJLnVwZGF0ZVJlc3VsdHMoKHQgLyAxMDAwKS50b0ZpeGVkKDMpLCByZXN1bHRzKTtcbiAgICAgICAgICAgIHJlc3VsdFNjcmVlbkVmZmVjdHMocmVzdWx0cyk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgY2xlYW51cExvYWRpbmdJbmRpY2F0b3IoKTtcbiAgICAgICAgZGlzcGxheUVycm9yKGVycm9yTXNnKTtcbiAgICB9XG4gICAgJChcIiNmYXEtd3JhcHBlclwiKS5jb2xsYXBzZSgnaGlkZScpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGluaXQoKTogdm9pZCB7XG4gICAgLy8gQWRkIGluaXRpYWwgdGFyZ2V0IGNhcmQgaW5wdXRcbiAgICBVSS5hZGRDYXJkKGJhc2UpO1xuICAgIC8vIEFkZCBidXR0b24gbGlzdGVuZXJzXG4gICAgJChcIiNhZGQtY2FyZC1idG5cIikuY2xpY2soKCkgPT4gVUkuYWRkQ2FyZExpc3RlbmVyKGJhc2UpKTtcbiAgICAkKFwiI2NhbGN1bGF0ZS1idG5cIikub24oXCJtb3VzZWRvd25cIiwgKCkgPT4ge1xuICAgICAgICBhZGRMb2FkaW5nSW5kaWNhdG9yKCk7XG4gICAgICAgIHNldFRpbWVvdXQocnVuLCAxMDApOyAgLy8gTmVlZCB0aGlzIHRpbWVvdXQgc28gY29udHJvbCBpcyBnaXZlbiBiYWNrIHRvIERPTSBzbyBpdCBjYW4gYmUgdXBkYXRlZC5cbiAgICB9KTtcbiAgICBVSS5pbml0KCk7XG4gICAgJChcIi5kcmF3LWFtb3VudFwiKS52YWwoSGVscGVycy5nZXRSYW5kb21JbnRJbmNsdXNpdmUoMywgMjApKTtcbn0iLCJcInVzZSBzdHJpY3RcIjtcbmltcG9ydCAqIGFzICQgZnJvbSBcImpxdWVyeVwiO1xuaW1wb3J0IFwianJ1bWJsZVwiO1xuaW1wb3J0ICogYXMgUiBmcm9tIFwicmFtZGFcIjtcblxuXG5leHBvcnQgbmFtZXNwYWNlIFVJIHtcbiAgICBleHBvcnQgZnVuY3Rpb24gaW5pdCgpOiB2b2lkIHsgLy8gRklYTUUgcmVuYW1lIHRvIGluaXRVSVxuICAgICAgICAvLyBJbml0aWFsaXplIHJ1bWJsZSBlZmZlY3Qgb24gZWxlbWVudHNcbiAgICAgICAgJChcIi5ydW1ibGVcIikuanJ1bWJsZSgpOyAvLyBGSVhNRVxuICAgICAgICAvLyBUaGlzIHNldHMgdGhlIGNvbGxhcHNlIGFycm93IHRoZSByaWdodCB3YXkgYXQgc3RhcnQgZm9yIGNvbGxhcHNpYmxlIGNhcmRzXG4gICAgICAgICQoXCIuY2FyZC1oZWFkZXIgYVwiKS50b2dnbGVDbGFzcyhcImNvbGxhcHNlZFwiKTtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICAkKCdbZGF0YS10b2dnbGU9XCJ0b29sdGlwXCJdJykudG9vbHRpcCgpO1xuICAgICAgICAvLyBIaWRlIGxvYWQgaWNvbiwgc2V0dGluZyBkaXNwbGF5IG5vbmUgaW4gY3NzIGlzIGJ1Z2d5IGZvciBzb21lIHJlYXNvbi5cbiAgICAgICAgJChcIiNjYWxjdWxhdGUtYnRuIHNwYW5cIikuaGlkZSgpO1xuICAgIH1cbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlUmVzdWx0cyh0aW1lOiBzdHJpbmcsIGM6IG51bWJlciwgZGVjaW1hbHM6IG51bWJlciA9IDApIHtcbiAgICAgICAgJChcIiNjaGFuY2UtbnVtYmVyXCIpLmh0bWwoKGMgKiAxMDAwKS50b0ZpeGVkKGRlY2ltYWxzKSk7XG4gICAgICAgICQoXCIjdGltZS10YWtlblwiKS5odG1sKHRpbWUpLnNob3coKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogV3JhcHMgYSBzdHJpbmcgaW4gc3BhbiB3aXRoIHRleHQtaGlnaGxpZ2h0IGNsYXNzXG4gICAgICogQHBhcmFtIHN0cmluZ1xuICAgICAqIEByZXR1cm5zIHtqUXVlcnl9XG4gICAgICovXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGhpZ2hsaWdodFdyYXAoc3RyaW5nOiBzdHJpbmcpOiBKUXVlcnk8SFRNTEVsZW1lbnQ+IHtcbiAgICAgICAgcmV0dXJuICQoXCI8c3Bhbj5cIikuYWRkQ2xhc3MoXCJ0ZXh0LWhpZ2hsaWdodFwiKS5odG1sKHN0cmluZyk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIExpc3RlbmVyIGZvciBjYXJkIGRlbGV0ZSBidXR0b25cbiAgICAgKi9cbiAgICBleHBvcnQgZnVuY3Rpb24gcmVtb3ZlQ2FyZCgpOiB2b2lkIHtcbiAgICAgICAgJCh0aGlzKS5jbG9zZXN0KFwiLmNhcmRcIilcbiAgICAgICAgICAgIC5zbGlkZVRvZ2dsZShcImZhc3RcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW1vdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICBzcGluR2x5cGhpY29uKCQoXCIjYWRkLWNhcmQtYnRuXCIpLmZpbmQoXCJzcGFuXCIpLCB0cnVlKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQWRkIGEgbmV3IGNhcmQgdG8gYmUgY29uc2lkZXJlZCBmb3IgcHJvYmFiaWxpdHkuXG4gICAgICovXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGFkZENhcmQoYmFzZTogSlF1ZXJ5PEhUTUxFbGVtZW50Pik6IEpRdWVyeTxIVE1MRWxlbWVudD4ge1xuICAgICAgICBjb25zdCBuZXdDYXJkID0gYmFzZS5jbG9uZSgpO1xuICAgICAgICAkKFwiI2NhcmQtY29udGFpbmVyXCIpLmFwcGVuZChuZXdDYXJkKTtcbiAgICAgICAgbmV3Q2FyZC5yZW1vdmVBdHRyKCdpZCcpXG4gICAgICAgICAgICAuaGlkZSgpXG4gICAgICAgICAgICAuc2xpZGVUb2dnbGUoXCJmYXN0XCIpXG4gICAgICAgICAgICAuZmluZChcIi5yZW1vdmUtY2FyZC1idG5cIilcbiAgICAgICAgICAgIC5jbGljayhyZW1vdmVDYXJkKVxuICAgICAgICBzcGluR2x5cGhpY29uKCQodGhpcykuZmluZChcInNwYW5cIikpO1xuICAgICAgICByZXR1cm4gbmV3Q2FyZDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU3BpbnMgYSBnbHlwaGljb24gZm9yIGEgZ2l2ZW4gZHVyYXRpb24uXG4gICAgICogQHBhcmFtIHNwYW4ge09iamVjdH0ganF1ZXJ5IG9iamVjdCBwb2ludGluZyB0byBzcGFuIHdpdGggZ2x5cGhpY29uIGNsYXNzXG4gICAgICogQHBhcmFtIHJldmVyc2Uge0Jvb2xlYW59IHJldmVyc2Ugc3BpbiBkaXJlY3Rpb24gaWYgdHJ1ZVxuICAgICAqIEBwYXJhbSBkdXJhdGlvbiB7TnVtYmVyfSBzcGluIGR1cmF0aW9uIGluIG1pbGxpc2Vjb25kc1xuICAgICAqL1xuICAgIGV4cG9ydCBmdW5jdGlvbiBzcGluR2x5cGhpY29uKHNwYW46IEpRdWVyeTxIVE1MRWxlbWVudD4sIHJldmVyc2U9ZmFsc2UsIGR1cmF0aW9uPTIwMCk6IHZvaWQge1xuICAgICAgICBjb25zdCBzcGluQ2xhc3MgPSAocmV2ZXJzZSkgPyBcImdseXBoaWNvbi1yZXYtc3BpblwiIDogXCJnbHlwaGljb24tc3BpblwiO1xuICAgICAgICBzcGFuLmFkZENsYXNzKHNwaW5DbGFzcyk7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gc3Bhbi5yZW1vdmVDbGFzcyhzcGluQ2xhc3MpLCBkdXJhdGlvbik7XG4gICAgfVxuXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGFkZENhcmRMaXN0ZW5lcihiYXNlOiBKUXVlcnk8SFRNTEVsZW1lbnQ+KTogSlF1ZXJ5PEhUTUxFbGVtZW50PiB7XG4gICAgICAgIHNwaW5HbHlwaGljb24oJChcIiNhZGQtY2FyZC1idG5cIikuZmluZChcInNwYW5cIikpO1xuICAgICAgICByZXR1cm4gYWRkQ2FyZChiYXNlKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU2hha2VzIHRoZSBzZWxlY3RlZCBlbGVtZW50KHMpXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSBzZWxlY3RvciBlbGVtZW50cyB0byBzZWxlY3RcbiAgICAgKiBAcGFyYW0gIHtib29sZWFufSByb3RhdGUgICBJZiB0cnVlIHNoYWtlcyByb3RhdGlvblxuICAgICAqIEBwYXJhbSAge2ludH0gc3RyZW5ndGggdGhlIG1hZ25pdHVkZSBvZiB0aGUgc2hha2VzXG4gICAgICogQHBhcmFtICB7aW50fSBkdXJhdGlvbiB0aW1lIGluIG1pbGxpc2Vjb25kcyBiZWZvcmUgc2hha2UgaXMgc3RvcHBlZFxuICAgICAqL1xuICAgIGV4cG9ydCBmdW5jdGlvbiBydW1ibGVFbGVtZW50KHNlbGVjdG9yOiBzdHJpbmcsIHJvdGF0ZTogYm9vbGVhbiwgc3RyZW5ndGg6IG51bWJlciwgZHVyYXRpb246IG51bWJlcik6IHZvaWQge1xuICAgICAgICBjb25zdCBydW1ibGUgPSB7XG4gICAgICAgICAgICB4OiAxMCAqIHN0cmVuZ3RoLFxuICAgICAgICAgICAgeTogMTAgKiBzdHJlbmd0aCxcbiAgICAgICAgICAgIHJvdGF0aW9uOiAocm90YXRlKSA/IDQgKiBzdHJlbmd0aCA6IDBcbiAgICAgICAgfTtcbiAgICAgICAgJChzZWxlY3RvcikuanJ1bWJsZShydW1ibGUpXG4gICAgICAgICAgICAudHJpZ2dlcignc3RhcnRSdW1ibGUnKTtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICQoc2VsZWN0b3IpLnRyaWdnZXIoJ3N0b3BSdW1ibGUnKTtcbiAgICAgICAgfSwgZHVyYXRpb24pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBTaGFrZXMgc2NyZWVuIGFuZCBzb21lIHNwZWNpZmljIGVsZW1lbnRzIGJhc2VkIG9uIGNcbiAgICAgKiBAcGFyYW0gIHtOdW1iZXJ9IGMgY2hhbmNlIG9mIHJlYWNoaW5nIGRlc2lyZWQgb3V0Y29tZSAocHJvYmFiaWxpdHkpXG4gICAgICovXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNoYWtlU2NyZWVuKGM6IG51bWJlcik6IHZvaWQge1xuICAgICAgICAvKiBUaGUgYyB2YWx1ZSBpcyBmbG9vcmVkIGJlY2F1c2Ugd2hlbiBpdCBpcyB0b28gc21hbGwsIHRoZSBydW1ibGVzIHdpbGwgbW92ZSB0aGUgZWxlbWVudHMgYnkgc3VicGl4ZWxzIGFuZFxuICAgICAgICAgaXQgY3JlYXRlcyBhIGphZ2dlZCBlZmZlY3QgKi9cbiAgICAgICAgY29uc3QgZmxvb3JWYWwgPSAwLjAwOSxcbiAgICAgICAgICAgIGZsb29yZWRDID0gTWF0aC5tYXgoZmxvb3JWYWwsIGMpO1xuICAgICAgICBydW1ibGVFbGVtZW50KFwiI2NoYW5jZS1udW1iZXJcIiwgdHJ1ZSwgZmxvb3JlZEMsIDEyMDApO1xuICAgICAgICBpZihmbG9vcmVkQyA+IGZsb29yVmFsKSB7ICAvLyBJZiBjIHZhbHVlIHdhcyBub3QgZmxvb3JlZCBydW1ibGUgYWxsIGVsZW1lbnRzXG4gICAgICAgICAgICBydW1ibGVFbGVtZW50KFwiI3RpdGxlXCIsIHRydWUsIGZsb29yZWRDIC8gNCAsIDExMDApO1xuICAgICAgICAgICAgcnVtYmxlRWxlbWVudChcIi5jYXJkXCIsIHRydWUsIGZsb29yZWRDIC8gMiwgODAwKTtcbiAgICAgICAgICAgIHJ1bWJsZUVsZW1lbnQoXCIuY29udGVudFwiLCBmYWxzZSwgZmxvb3JlZEMgLyAyLCA5MDApO1xuICAgICAgICB9XG4gICAgfVxufVxuZXhwb3J0IG5hbWVzcGFjZSBIZWxwZXJzIHtcbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgcHJvbWlzZSB3aGljaCByZXNvbHZlcyB0byBhbiBvYmplY3Qgd2l0aCBuZWVkZWQgaW5mb3JtYXRpb25cbiAgICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gICAgZnVuYyBmdW5jdGlvbiB0byB0aW1lXG4gICAgICogQHBhcmFtICB7QXJyYXl9IGFyZ3MgIGZ1bmMgYXJndW1lbnRzXG4gICAgICogQHJldHVybiB7UHJvbWlzZX0gICAgIFJldHVybnMgYSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gYW4gb2JqZWN0IHdpdGggdCBhbmQgcmVzdWx0cyB2YWx1ZXNcbiAgICAgKi9cbiAgICBleHBvcnQgZnVuY3Rpb24gdGltZUZ1bmN0aW9uIChmdW5jOiBGdW5jdGlvbiwgLi4uYXJnczogQXJyYXk8YW55Pik6IFByb21pc2U8e3Q6IG51bWJlciwgcmVzdWx0czogYW55fT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdDA6IG51bWJlciA9IHBlcmZvcm1hbmNlLm5vdygpLFxuICAgICAgICAgICAgICAgIHJldHVyblZhbHVlOiBhbnkgPSBmdW5jKC4uLmFyZ3MpLFxuICAgICAgICAgICAgICAgIGRlbHRhVGltZTogbnVtYmVyID0gcGVyZm9ybWFuY2Uubm93KCkgLSB0MDtcbiAgICAgICAgICAgIHJlc29sdmUoe3Q6IGRlbHRhVGltZSwgcmVzdWx0czogcmV0dXJuVmFsdWV9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGV4cG9ydCBmdW5jdGlvbiByYW5nZShzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlcik6IFJlYWRvbmx5QXJyYXk8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiBSLnJhbmdlKHN0YXJ0LCBlbmQpO1xuICAgIH1cbiAgICBleHBvcnQgZnVuY3Rpb24gcmFuZ2VJbmNsdXNpdmUoc3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIpOiBSZWFkb25seUFycmF5PG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gcmFuZ2Uoc3RhcnQsIGVuZCArIDEpO1xuICAgIH1cbiAgICBleHBvcnQgZnVuY3Rpb24gZ2V0UmFuZG9tSW50KG1pbjogbnVtYmVyLCBtYXg6IG51bWJlcik6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSkgKyBtaW47XG4gICAgfVxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXRSYW5kb21JbnRJbmNsdXNpdmUobWluOiBudW1iZXIsIG1heDogbnVtYmVyKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIGdldFJhbmRvbUludChtaW4sIG1heCArIDEpO1xuICAgIH1cbn0iLCJcInVzZSBzdHJpY3RcIjtcbmltcG9ydCAqIGFzICQgZnJvbSBcImpxdWVyeVwiO1xuaW1wb3J0ICogYXMgVGV0aGVyIGZyb20gXCJ0ZXRoZXJcIjtcbi8qXG5UaGlzIGlzIGRlcHJlc3NpbmcgYnV0IGZvciBib290c3RyYXAgdG8gZmluZCB0aGVzZSB0aGluZyB3aGVuIGJ1bmRsZWQgSSBuZWVkIHRvIGRlY2xhcmUgdGhlbSBpbiBnbG9iYWwgbmFtZXNwYWNlXG5saWtlIHRoaXMuIEl0IHdvcmtlZCB3aXRob3V0IHdoZW4gSSBidW5kbGVkIGV2ZXJ5dGhpbmcgaW50byBvbmUgYnVuZGxlIG5vdCBkaXZpZGVkIGluIGxpYnMgYW5kIHNyYy4gV2hhdCB3b3VsZCBtb3N0XG5saWtlbHkgd29yayBpcyBidW5kbGluZyBqcXVlcnkgYW5kIHRldGhlciBpbiB0aGVpciBvd24gYnVuZGxlIHRoYXQgSSBleHBsaWNpdGx5IHNyYyBmaXJzdCBpbiBodG1sIGZpbGVzXG4gKi9cbmRlY2xhcmUgZ2xvYmFsIHtcbiAgICBpbnRlcmZhY2UgV2luZG93IHsgalF1ZXJ5OiBhbnksICQ6IGFueSwgVGV0aGVyOiBhbnl9XG59XG53aW5kb3cualF1ZXJ5ID0gd2luZG93LiQgPSAkO1xud2luZG93LlRldGhlciA9IFRldGhlcjtcbmltcG9ydCBcImJvb3RzdHJhcFwiO1xuaW1wb3J0ICogYXMgZHJhdyBmcm9tIFwiLi9kcmF3LW1haW5cIjtcbmltcG9ydCAqIGFzIHBpbmcgZnJvbSBcIi4vcGluZy1tYWluXCI7XG5cbmRlY2xhcmUgZ2xvYmFsIHtcbiAgICBpbnRlcmZhY2UgSlF1ZXJ5IHtcbiAgICAgICAganJ1bWJsZShhcmc/OiBvYmplY3QpOiBKUXVlcnk7XG4gICAgICAgIGh0bWwob2JqOkpRdWVyeSk6IEpRdWVyeTsgIC8vIEFsbG93IGh0bWwgaW5wdXQgd2l0aCBKUXVlcnkgb2JqZWN0c1xuICAgIH1cbn1cbi8qKlxuICogVGhpcyBpcyB0aGUgZW50cnkgcG9pbnQgZm9yIGJvdGggZHJhdyBhbmQgcGluZyBzaXRlc1xuICovXG4kKCgpID0+IHtcbiAgICBjb25zdCBsb2NhdGlvbiA9ICQoXCIjbG9jYXRpb25cIikuZGF0YShcImxvY2F0aW9uXCIpO1xuICAgIGlmIChsb2NhdGlvbiA9PSBcImRyYXdcIikge1xuICAgICAgICBkcmF3LmluaXQoKTtcbiAgICB9XG4gICAgZWxzZSBpZiAobG9jYXRpb24gPT0gXCJwaW5nXCIpIHtcbiAgICAgICAgcGluZy5pbml0KCk7XG4gICAgfVxufSk7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuZXhwb3J0IHR5cGUgQ3JlYXR1cmVJbmZvID0ge3RvRGllOiBib29sZWFuLCBocDogbnVtYmVyLCBpZDogbnVtYmVyfTtcbmV4cG9ydCBuYW1lc3BhY2UgUGluZyB7XG4gICAgdHlwZSBDcmVhdHVyZSA9IHtpZDogbnVtYmVyLCBocDogbnVtYmVyfTtcbiAgICAvLyBFYWNoIGVudHJ5IGluIHZhbCBhcnJheSBpcyAnaWQnIG9mIHRhcmdldGVkIGNyZWF0dXJlXG4gICAgdHlwZSBPdXRjb21lID0gIHt2YWw6IFJlYWRvbmx5QXJyYXk8bnVtYmVyPiwgcDogbnVtYmVyfVxuICAgIC8vIE5vZGUgaXMgYSBub2RlIGluIHByb2JhYmlsaXR5IHRyZWVcbiAgICB0eXBlIE5vZGUgPSB7cDogbnVtYmVyLCB0YXJnZXQ6IG51bWJlciwgY2hpbGRyZW46IFJlYWRvbmx5QXJyYXk8Tm9kZT59XG5cbiAgICBmdW5jdGlvbiBwaW5nQ3JlYXR1cmUoY3JlYXR1cmU6IENyZWF0dXJlKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBpZDogY3JlYXR1cmUuaWQsXG4gICAgICAgICAgICBocDogY3JlYXR1cmUuaHAgLSAxXG4gICAgICAgIH07XG4gICAgfVxuICAgIGZ1bmN0aW9uIF9jcmVhdGVPdXRjb21lVHJlZShjcmVhdHVyZXM6IFJlYWRvbmx5QXJyYXk8Q3JlYXR1cmU+LCBwaW5nczogbnVtYmVyKTogQXJyYXk8Tm9kZT4ge1xuICAgICAgICBpZiAocGluZ3MgPD0gMCB8fCBjcmVhdHVyZXMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY3JlYXR1cmVzLm1hcCgodGFyZ2V0Q3JlYXR1cmUsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwcm9iYWJpbGl0eSA9IDEgLyBjcmVhdHVyZXMubGVuZ3RoLFxuICAgICAgICAgICAgICAgIHRhcmdldElkOiBudW1iZXIgPSB0YXJnZXRDcmVhdHVyZS5pZCxcbiAgICAgICAgICAgICAgICBjcmVhdHVyZXNBZnRlclBpbmcgPSBjcmVhdHVyZXNcbiAgICAgICAgICAgICAgICAgICAgLm1hcCgoY3JlYXR1cmUsIGkpID0+IChpID09PSBpbmRleCkgPyBwaW5nQ3JlYXR1cmUoY3JlYXR1cmUpIDogY3JlYXR1cmUpXG4gICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoY3JlYXR1cmUgPT4gY3JlYXR1cmUuaHAgIT09IDApOyAgLy8gRmlsdGVyIG91dCB0cmVlIHJvb3QgdmFsdWUgKC0xKSBmcm9tIG91dGNvbWVzXG4gICAgICAgICAgICByZXR1cm4ge3A6IHByb2JhYmlsaXR5LCB0YXJnZXQ6IHRhcmdldElkLCBjaGlsZHJlbjogX2NyZWF0ZU91dGNvbWVUcmVlKGNyZWF0dXJlc0FmdGVyUGluZywgcGluZ3MgLSAxKX1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBwcm9iYWJpbGl0eSB0cmVlLiBFYWNoIG5vZGUgaGFzIGEgcHJvYmFiaWxpdHkgdmFsdWUsIHRvIGdldCB0aGUgcHJvYmFiaWxpdHkgdG8gYXJyaXZlIGF0XG4gICAgICogYSBub2RlIHlvdSBtdWx0aXBseSBhbGwgcHJvYmFiaWxpdGllcyBmcm9tIHRoYXQgbm9kZSB1cCB0byB0aGUgcm9vdCBub2RlLiBUaGUgb3V0Y29tZSBjYW4gYmUgZm91bmQgaW4gdGhlIHNhbWVcbiAgICAgKiB3YXkgYnkgdHJhdmVsaW5nIHRvIHRoZSByb290IHdoaWxlIGNvbGxlY3RpbmcgYWxsIHRhcmdldCB2YWx1ZXNcbiAgICAgKiBAcGFyYW0gY3JlYXR1cmVzIHtSZWFkb25seUFycmF5PENyZWF0dXJlPn1cbiAgICAgKiBAcGFyYW0gcGluZ3Mge251bWJlcn1cbiAgICAgKiBAcGFyYW0gcGFyZW50Tm9kZSB7Tm9kZX1cbiAgICAgKiBAcmV0dXJuIHtOb2RlfSByZXR1cm5zIHRoZSByb290IG5vZGUgb2YgdGhlIHRyZWVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjcmVhdGVPdXRjb21lVHJlZShjcmVhdHVyZXM6IFJlYWRvbmx5QXJyYXk8Q3JlYXR1cmU+LCBwaW5nczogbnVtYmVyKTogTm9kZSB7XG4gICAgICAgIHJldHVybiB7dGFyZ2V0OiAtMSwgcDogMSwgY2hpbGRyZW46IF9jcmVhdGVPdXRjb21lVHJlZShjcmVhdHVyZXMsIHBpbmdzKX07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVHJhdmVyc2VzIHRyZWUgZG93biB0byBsZWFmIG5vZGVzIGFuZCBjb2xsZWN0cyBhbGwgb3V0Y29tZXMgYW5kIHJldHVybnMgdGhlbSBhcyBhbiBhcnJheSBvZiBvdXRjb21lc1xuICAgICAqIEBwYXJhbSBjdXJyZW50Tm9kZSB7Tm9kZX0gICAgY3VycmVudCBub2RlIGJlaW5nIHRyYXZlcnNlZFxuICAgICAqIEBwYXJhbSB0YXJnZXQge1JlYWRvbmx5QXJyYXk8bnVtYmVyPn0gYWNjdW11bGF0ZWQgdGFyZ2V0cyBoaXQgd2hpbGUgdHJhdmVyc2luZyBkb3duIHRyZWVcbiAgICAgKiBAcGFyYW0gcCB7bnVtYmVyfSAgICBhY2N1bXVsYXRlZCBwcm9iYWJpbGl0eSB3aGlsZSB0cmF2ZXJzaW5nIGRvd24gdHJlZVxuICAgICAqIEByZXR1cm5zIHtSZWFkb25seUFycmF5PE91dGNvbWU+fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldE91dGNvbWVzKGN1cnJlbnROb2RlOiBOb2RlLCB0YXJnZXQ6IFJlYWRvbmx5QXJyYXk8bnVtYmVyPj1bXSwgcDogbnVtYmVyPTEpOiBSZWFkb25seUFycmF5PE91dGNvbWU+IHtcbiAgICAgICAgaWYoY3VycmVudE5vZGUuY2hpbGRyZW4ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gW3t2YWw6IHRhcmdldC5jb25jYXQoY3VycmVudE5vZGUudGFyZ2V0KVxuICAgICAgICAgICAgICAgIC5maWx0ZXIodGFyZ2V0VmFsID0+IHRhcmdldFZhbCAhPT0gLTEpLCBwOiBwICogY3VycmVudE5vZGUucH1dO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBbXS5jb25jYXQoIC4uLmN1cnJlbnROb2RlLmNoaWxkcmVuLm1hcChjaGlsZCA9PiB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0T3V0Y29tZXMoY2hpbGQsIHRhcmdldC5jb25jYXQoY3VycmVudE5vZGUudGFyZ2V0KSwgcCAqIGN1cnJlbnROb2RlLnApO1xuICAgICAgICB9KSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdHJ1ZSBpZiBjcmVhdHVyZSdzIGRhbWFnZSB0YWtlbiBpbiB0aGlzIG91dGNvbWUgaXMgaW4gY29tcGxpYW5jZSB3aXRoIGNyZWF0dXJlLnRvRGllXG4gICAgICogRm9yIGV4YW1wbGUgaWYgY3JlYXR1cmUudG9EaWUgPSB0cnVlIGFuZCBkYW1hZ2UgdGFrZW4gPj0gY3JlYXR1cmUuaHAgdGhlIG91dGNvbWUgaXMgZGVzaXJlZC5cbiAgICAgKiBAcGFyYW0gY3JlYXR1cmUge0NyZWF0dXJlSW5mb31cbiAgICAgKiBAcGFyYW0gb3V0Y29tZSB7T3V0Y29tZX0gb3V0Y29tZSBvYmplY3QgY29udGFpbmluZyBvdXRjb21lIGFuZCBwIHZhcmlhYmxlXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNEZXNpcmVkT3V0Y29tZShjcmVhdHVyZTogQ3JlYXR1cmVJbmZvLCBvdXRjb21lOiBPdXRjb21lKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IGRtZyA9IG91dGNvbWUudmFsLnJlZHVjZSgoYWNjLCB2YWwpID0+IHtcbiAgICAgICAgICAgIGlmICh2YWwgPT09IGNyZWF0dXJlLmlkKVxuICAgICAgICAgICAgICAgIHJldHVybiBhY2MgKyAxO1xuICAgICAgICAgICAgZWxzZSByZXR1cm4gYWNjO1xuICAgICAgICB9LCAwKTtcbiAgICAgICAgcmV0dXJuICgoY3JlYXR1cmUudG9EaWUgJiYgZG1nID49IGNyZWF0dXJlLmhwKSB8fCAoIWNyZWF0dXJlLnRvRGllICYmIGRtZyA8IGNyZWF0dXJlLmhwKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmlsdGVycyBvdXRjb21lcyB0byBvbmx5IG91dGNvbWVzIHRoYXQgaGF2ZSBkZXNpcmVkIHJlc3VsdHNcbiAgICAgKiBAcGFyYW0gY3JlYXR1cmVJbnB1dHMge1JlYWRvbmx5QXJyYXk8Q3JlYXR1cmVJbmZvPn0gYXJyYXkgd2l0aCBjcmVhdHVyZSBvYmplY3RzXG4gICAgICogQHBhcmFtIG91dGNvbWVzIHtSZWFkb25seUFycmF5PE91dGNvbWU+fSBhcnJheSBvZiBvdXRjb21lc1xuICAgICAqIEByZXR1cm5zIHtSZWFkb25seUFycmF5PE91dGNvbWU+fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZpbHRlck91dGNvbWVzKGNyZWF0dXJlSW5wdXRzOiBSZWFkb25seUFycmF5PENyZWF0dXJlSW5mbz4sIG91dGNvbWVzOiBSZWFkb25seUFycmF5PE91dGNvbWU+KTogUmVhZG9ubHlBcnJheTxPdXRjb21lPiB7XG4gICAgICAgIHJldHVybiBjcmVhdHVyZUlucHV0cy5yZWR1Y2UoKGFjYywgYykgPT5cbiAgICAgICAgICAgICAgICBhY2MuZmlsdGVyKG91dGNvbWUgPT4gaXNEZXNpcmVkT3V0Y29tZShjLCBvdXRjb21lKSksXG4gICAgICAgICAgICBvdXRjb21lcyk7XG4gICAgfVxuICAgIGV4cG9ydCBmdW5jdGlvbiBjYWxjdWxhdGUoY3JlYXR1cmVJbnB1dDogUmVhZG9ubHlBcnJheTxDcmVhdHVyZUluZm8+LCBwaW5nczogbnVtYmVyKTogbnVtYmVyIHtcbiAgICAgICAgY29uc3QgY3JlYXR1cmVzOiBSZWFkb25seUFycmF5PENyZWF0dXJlPiA9IGNyZWF0dXJlSW5wdXQubWFwKGMgPT4gKHtpZDogYy5pZCwgaHA6IGMuaHB9KSksXG4gICAgICAgICAgICByb290ID0gY3JlYXRlT3V0Y29tZVRyZWUoY3JlYXR1cmVzLCBwaW5ncyksXG4gICAgICAgICAgICBvdXRjb21lcyA9IGdldE91dGNvbWVzKHJvb3QpLFxuICAgICAgICAgICAgZmlsdGVyZWRPdXRjb21lcyA9IGZpbHRlck91dGNvbWVzKGNyZWF0dXJlSW5wdXQsIG91dGNvbWVzKSxcbiAgICAgICAgICAgIHN1bW1lZFByb2JhYmlsaXR5ID0gZmlsdGVyZWRPdXRjb21lcy5yZWR1Y2UoKGFjYywgb3V0Y29tZSkgPT4gYWNjICsgb3V0Y29tZS5wLCAwKTtcbiAgICAgICAgcmV0dXJuIHN1bW1lZFByb2JhYmlsaXR5O1xuICAgIH1cbn0iLCJcInVzZSBzdHJpY3RcIjtcbmltcG9ydCAqIGFzICQgZnJvbSBcImpxdWVyeVwiO1xuaW1wb3J0IHtVSSwgSGVscGVyc30gZnJvbSBcIi4vaGVscGVyc1wiXG5pbXBvcnQge1BpbmcsIENyZWF0dXJlSW5mb30gZnJvbSBcIi4vcGluZy1jYWxjdWxhdGlvblwiO1xuXG4vLyBUZW1wbGF0ZSBmb3IgY3JlYXRpbmcgY3JlYXR1cmUgY2FyZHNcbmNvbnN0IGJhc2UgPSAkKFwiI2Jhc2VcIik7XG5cbi8qKlxuICogQ2hhbmdlcyBjcmVhdHVyZSBjYXJkIGNvbG9yIGRlcGVuZGluZyBvbiBkZXNpcmVkIGxpZmUgc3RhdHVzXG4gKi9cbmZ1bmN0aW9uIGNoYW5nZUxpZmVTdGF0dXMoY29udGV4dDogSlF1ZXJ5PEhUTUxFbGVtZW50Pik6IHZvaWQge1xuICAgIGNvbnN0IG5ld1ZhbDogbnVtYmVyID0gTnVtYmVyKCQoY29udGV4dCkudmFsKCkpLFxuICAgICAgICBjcmVhdHVyZUNhcmQgPSBjb250ZXh0LmNsb3Nlc3QoXCIuY2FyZFwiKTtcbiAgICBpZiAobmV3VmFsKSB7XG4gICAgICAgIGNyZWF0dXJlQ2FyZC5yZW1vdmVDbGFzcyhcImNhcmQtc3VjY2Vzc1wiKTtcbiAgICAgICAgaWYgKGNyZWF0dXJlQ2FyZC5oYXNDbGFzcyhcImdvZFwiKSkge1xuICAgICAgICAgICAgY3JlYXR1cmVDYXJkLmFkZENsYXNzKFwiY2FyZC1wcmltYXJ5XCIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY3JlYXR1cmVDYXJkLmFkZENsYXNzKFwiY2FyZC1pbmZvXCIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBpZiAoY3JlYXR1cmVDYXJkLmhhc0NsYXNzKFwiZ29kXCIpKSB7XG4gICAgICAgICAgICBjcmVhdHVyZUNhcmQucmVtb3ZlQ2xhc3MoXCJjYXJkLXByaW1hcnlcIik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjcmVhdHVyZUNhcmQucmVtb3ZlQ2xhc3MoXCJjYXJkLWluZm9cIik7XG4gICAgICAgIH1cbiAgICAgICAgY3JlYXR1cmVDYXJkLmFkZENsYXNzKFwiY2FyZC1zdWNjZXNzXCIpO1xuICAgIH1cbn1cbi8qKlxuICogQ29sbGVjdHMgdXNlciBjcmVhdHVyZSBpbnB1dCBhbmQgY3JlYXRlcyBhbiBhcnJheSBvZiBjcmVhdHVyZSBvYmplY3RzXG4gKiBAcmV0dXJucyB7QXJyYXl9ICBhcnJheSB3aXRoIG9iamVjdHMgY29udGFpbmluZyB0b0RpZSwgaHAsIGlkIHZhcmlhYmxlc1xuICovXG5mdW5jdGlvbiBnZXRDcmVhdHVyZUlucHV0KCk6IEFycmF5PENyZWF0dXJlSW5mbz4ge1xuICAgIGNvbnN0IGlucHV0czogQXJyYXk8SFRNTEVsZW1lbnQ+ID0gJC5tYWtlQXJyYXkoJChcIi5jYXJkLmNyZWF0dXJlXCIpLm5vdChcIiNiYXNlXCIpKTtcbiAgICByZXR1cm4gaW5wdXRzLm1hcCgodmFsLCBpbmRleCkgPT4ge1xuICAgICAgICBjb25zdCBpbnB1dCA9ICQodmFsKSxcbiAgICAgICAgICAgIGhwID0gTnVtYmVyKCQoaW5wdXQpLmZpbmQoXCJpbnB1dC5jcmVhdHVyZS1ocFwiKS52YWwoKSk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0b0RpZTogTnVtYmVyKCQoaW5wdXQpLmZpbmQoXCJzZWxlY3RcIikudmFsKCkpID09PSAxLFxuICAgICAgICAgICAgaHA6IGhwLFxuICAgICAgICAgICAgaWQ6IGluZGV4XG4gICAgICAgIH1cbiAgICB9KTtcbn1cbi8qKlxuICogUmVhZHMgcGluZyBpbnB1dCBhbmQgYWRqdXN0cyB0aGUgdmFsdWUgdG8gYmUgd2l0aGluIHZhbGlkIHJhbmdlLiBVcGRhdGVzIHRoZSBpbnB1dCB2YWx1ZSB0byBhZGp1c3RlZCB2YWx1ZVxuICogYW5kIHRoZW4gcmV0dXJucyBhZGp1c3RlZCB2YWx1ZVxuICogQHJldHVybnMge251bWJlcn0gICAgYWRqdXN0ZWQgcGluZyB2YWx1ZVxuICovXG5mdW5jdGlvbiBnZXRQaW5nSW5wdXQoKTogbnVtYmVyIHtcbiAgICBjb25zdCBwaW5nSW5wdXQ6IEpRdWVyeTxIVE1MRWxlbWVudD4gPSAkKFwiI3BpbmctY2FyZFwiKS5maW5kKFwiaW5wdXRcIiksXG4gICAgICAgIHBpbmdzOiBudW1iZXIgPSBwaW5nSW5wdXQudmFsKCkgYXMgbnVtYmVyLFxuICAgICAgICBwaW5nQWRqdXN0ZWQ6IG51bWJlciA9IE1hdGgubWluKE1hdGgubWF4KHBpbmdzLCAxKSwgMTIpO1xuICAgIHBpbmdJbnB1dC52YWwocGluZ0FkanVzdGVkKTtcbiAgICByZXR1cm4gcGluZ0FkanVzdGVkO1xufVxuZnVuY3Rpb24gY2xlYW51cExvYWRJbmRpY2F0b3IoKSB7XG4gICAgJChcIiNjYWxjdWxhdGUtYnRuXCIpLnJlbW92ZUNsYXNzKFwiZGlzYWJsZWRcIik7XG4gICAgJChcIiNjYWxjdWxhdGUtYnRuIHNwYW5cIikuaGlkZSgpO1xufVxuLyoqXG4gKiBEaXNhYmxlcyBjYWxjdWxhdGUgYnV0dG9uIGFuZCBzaG93cyBhIHNwaW5uaW5nIGxvYWQgaWNvblxuICovXG5mdW5jdGlvbiBhZGRMb2FkaW5nSW5kaWNhdG9yKCk6IHZvaWQge1xuICAgICQoXCIjY2FsY3VsYXRlLWJ0blwiKS5hZGRDbGFzcyhcImRpc2FibGVkXCIpO1xuICAgICQoXCIjY2hhbmNlLXRleHQtbnVtYmVyXCIpLmh0bWwoXCItLS1cIik7XG4gICAgJChcIiNjYWxjdWxhdGUtYnRuIHNwYW5cIikuc2hvdygpO1xufVxuLyoqXG4gKiBDYWxjdWxhdGVzIHBpbmcgcHJvYmFiaWxpdHkgZnJvbSB1c2VyIGlucHV0IGFuZCBkaXNwbGF5cyByZXN1bHQuXG4gKi9cbmZ1bmN0aW9uIHJ1bigpIHtcbiAgICBjb25zdCBjcmVhdHVyZXMgPSBnZXRDcmVhdHVyZUlucHV0KCksXG4gICAgICAgIHBpbmdzID0gZ2V0UGluZ0lucHV0KCksXG4gICAgICAgIHByb21pc2UgPSBIZWxwZXJzLnRpbWVGdW5jdGlvbihQaW5nLmNhbGN1bGF0ZSwgY3JlYXR1cmVzLCBwaW5ncywgdHJ1ZSk7XG4gICAgcHJvbWlzZS50aGVuKCh7dCwgcmVzdWx0c30pID0+IHtcbiAgICAgICAgVUkudXBkYXRlUmVzdWx0cygodCAvIDEwMDApLnRvRml4ZWQoMyksIHJlc3VsdHMpO1xuICAgICAgICBVSS5zaGFrZVNjcmVlbihyZXN1bHRzKTtcbiAgICAgICAgY2xlYW51cExvYWRJbmRpY2F0b3IoKTtcbiAgICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGluaXQoKTogdm9pZCB7XG4gICAgLy8gQWRkIGluaXRpYWwgdGFyZ2V0IGNhcmQgaW5wdXRcbiAgICBVSS5hZGRDYXJkKGJhc2UpO1xuICAgICQoXCIuY3JlYXR1cmUuZ29kIHNlbGVjdFwiKS5jaGFuZ2UoZnVuY3Rpb24gKCkge1xuICAgICAgICBjaGFuZ2VMaWZlU3RhdHVzKCQodGhpcykpO1xuICAgIH0pO1xuICAgICQoXCIjYWRkLWNhcmQtYnRuXCIpLmNsaWNrKCgpID0+IHtcbiAgICAgICAgY29uc3QgbmV3Q3JlYXR1cmUgPSBVSS5hZGRDYXJkTGlzdGVuZXIoYmFzZSk7XG4gICAgICAgIG5ld0NyZWF0dXJlLmNoYW5nZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjaGFuZ2VMaWZlU3RhdHVzKCQodGhpcykuZmluZChcInNlbGVjdFwiKSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgICQoXCIjY2FsY3VsYXRlLWJ0blwiKS5jbGljaygoKSA9PiB7XG4gICAgICAgIGFkZExvYWRpbmdJbmRpY2F0b3IoKTtcbiAgICAgICAgc2V0VGltZW91dChydW4sIDEwMCk7ICAvLyBUaW1lb3V0IGlzIHVzZWQgdG8gbGV0IERPTSB1cGRhdGUgbG9hZCBpbmRpY2F0b3IgYmVmb3JlIGhlYXZ5IHJ1biBmdW5jdGlvblxuICAgIH0pO1xuICAgIFVJLmluaXQoKTtcbn0iXX0=
