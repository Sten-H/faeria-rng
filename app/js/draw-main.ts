"use strict";
import * as $ from "jquery";
import {UI, Helpers} from "./helpers"
import * as Draw from "./draw-calculation";
import {CardInfo} from "./draw-calculation";

const base: JQuery<HTMLElement> = $("#base");  // base template for cards

/**
 * Creates effects on screen based on the amount of bad luck player
 * has painfully endured. A high c will create larger effects.
 * @param  {int} c the number of desired hands
 */
function resultScreenEffects(c: number): void {
    UI.shakeScreen(c);
}
/**
 * Display error text if user input is incorrect
 */
function displayError(msg: JQuery<HTMLElement>): void {
    $("#error-message").html(msg);
    $("#error-wrapper").show();
    $("#results-wrapper").hide();
}

/**
 * Collects user card related input and represents each card as an object with
 * needed, amount, value, foundAmount variables. Card objects are returned in an array.
 * @return {Array<CardInfo>} Array of Objects representing each target card
 */
function getCardInput(): Array<CardInfo> {
    const inputs: Array<HTMLElement> = $.makeArray($(".draw").not("#base"));
    return inputs.map((val, index) => {
        const input = $(val);
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
function isInputValid(drawAmount: number, cardInputs: Array<CardInfo>): {isValid: boolean, errorMsg: JQuery<HTMLElement>} {
    const totalAmount: number = cardInputs.reduce((acc, input) => acc + Number(input.total), 0);
    // User supposes a larger deck than is possible
    if (totalAmount > Draw.DECK_SIZE) {
        return {isValid: false,
            errorMsg: $("<span>").append("Target card ", UI.highlightWrap("amounts"), " sum exceeds deck size")};
    }
    const totalNeeded: number = cardInputs.reduce((acc, input) => acc + Number(input.needed), 0);
    // User needs more cards than there are draws, will always fail.
    if (totalNeeded > drawAmount) {
        return {isValid: false,
            errorMsg: $("<span>").append("Fewer ", UI.highlightWrap("draws "), "than ", UI.highlightWrap("needed"), " cards")};
    }
    const validNeeded: boolean = cardInputs.every((input) => Number(input.total) >= Number(input.needed));
    // One or more needed values exceeds its amount in deck
    if (!validNeeded) {
        return {isValid: false,
            errorMsg: $("<span>").append(UI.highlightWrap("Needed"), " cannot be larger than card ", UI.highlightWrap("amount"), " in deck")};
    }
    return {isValid: true, errorMsg: $("")};
}
/**
 * Disables calculate button and shows a spinning load icon
 */
function addLoadingIndicator(): void {
    $("#calculate-btn").addClass("disabled");
    $("#chance-text-number").html("---");
    $("#error-wrapper").hide();
    $("#results-wrapper").show();
    $("#calculate-btn span").show();
}
/**
 * Removes effects shown while loading
 */
function cleanupLoadingIndicator(): void {
    $("#calculate-btn span").hide();
    $("#calculate-btn").removeClass("disabled");
}
/**
 * Validates user input and runs drawSimulation if input is valid.
 */
function run(): void {
    const smartMulligan: boolean = $("#mulligan-checkbox").is(':checked'),
        drawAmount = $(".draw-amount").val() as number,
        cardInfo = getCardInput(),
        {isValid, errorMsg} = isInputValid(drawAmount, cardInfo);
    if (isValid) {
        const func = (smartMulligan) ? Draw.runSimulation : Draw.runCalculation,
            promise = Helpers.timeFunction(func, cardInfo, drawAmount);
        promise.then(({t, results}) => {
            cleanupLoadingIndicator();
            UI.updateResults((t / 1000).toFixed(3), results);
            resultScreenEffects(results);
        });
    }
    else {
        cleanupLoadingIndicator();
        displayError(errorMsg);
    }
    $("#faq-wrapper").collapse('hide');
}
export function init(): void {
    // Add initial target card input
    UI.addCard(base);
    // Add button listeners
    $("#add-card-btn").click(() => UI.addCardListener(base));
    $("#calculate-btn").on("mousedown", () => {
        addLoadingIndicator();
        setTimeout(run, 100);  // Need this timeout so control is given back to DOM so it can be updated.
    });
    UI.init();
    $(".draw-amount").val(Helpers.getRandomIntInclusive(3, 20));
}