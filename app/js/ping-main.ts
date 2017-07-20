"use strict";
import * as $ from "jquery";
import {UI, Helpers} from "./helpers"
import {Ping, CreatureInfo} from "./ping-calculation";

// Template for creating creature cards
const base = $("#base");

/**
 * Changes creature card color depending on desired life status
 */
function changeLifeStatus(context: JQuery<HTMLElement>): void {
    const newVal: number = Number($(context).val()),
        creatureCard = context.closest(".card");
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
function getCreatureInput(): Array<CreatureInfo> {
    const inputs: Array<HTMLElement> = $.makeArray($(".card.creature").not("#base"));
    return inputs.map((val, index) => {
        const input = $(val),
            hp = Number($(input).find("input.creature-hp").val());
        return {
            toDie: Number($(input).find("select").val()) === 1,
            hp: hp,
            id: index
        }
    });
}
/**
 * Reads ping input and adjusts the value to be within valid range. Updates the input value to adjusted value
 * and then returns adjusted value
 * @returns {number}    adjusted ping value
 */
function getPingInput(): number {
    const pingInput: JQuery<HTMLElement> = $("#ping-card").find("input"),
        pings: number = pingInput.val() as number,
        pingAdjusted: number = Math.min(Math.max(pings, 1), 12);
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
function addLoadingIndicator(): void {
    $("#calculate-btn").addClass("disabled");
    $("#chance-text-number").html("---");
    $("#calculate-btn span").show();
}
/**
 * Calculates ping probability from user input and displays result.
 */
function run() {
    const creatures = getCreatureInput(),
        pings = getPingInput(),
        promise = Helpers.timeFunction(Ping.calculate, creatures, pings, true);
    promise.then(({t, results}) => {
        UI.updateResults((t / 1000).toFixed(3), results);
        UI.shakeScreen(results);
        cleanupLoadIndicator();
    });
}

export function init(): void {
    $(".creature.god select").change(function () {
        changeLifeStatus($(this));
    });
    $("#add-card-btn").click(() => {
        const newCreature = UI.addCardListener(base);
        newCreature.change(function () {
            changeLifeStatus($(this).find("select"));
        });
    });
    $("#calculate-btn").click(() => {
        addLoadingIndicator();
        setTimeout(run, 100);  // Timeout is used to let DOM update load indicator before heavy run function
    });
    UI.init();
}