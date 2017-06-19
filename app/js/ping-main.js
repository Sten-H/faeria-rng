(function() {
    "use strict";
    // Template for creature cards
    const base = $("#base");

    /**
     * Changes creature card color depending on desired life status
     */
    function lifeStatusListener() {
        const newVal = Number($(this).val()),
            creatureCard = $(this).closest(".creature");
        if (newVal) {
            creatureCard.removeClass("card-success");
            if(creatureCard.hasClass("god")) {
                creatureCard.addClass("card-primary");
            }
            else {
                creatureCard.addClass("card-info");
            }
        }
        else {
            if(creatureCard.hasClass("god")) {
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
     * @returns {Array}  array with objects containing toDie, hp, name variables
     */
    function getCreatureInput() {
        return [...$(".card.creature").not("#base")  // The spread is used to get rid of jquery object
            .map((index, card) => {
            const toDie = Number($(card).find("select").val()) === 1,
                hp = Number($(card).find("input.creature-hp").val());
            return {toDie: toDie, hp: hp, name: index};
        })];
    }

    /**
     * Reads ping input and adjusts the value to be within valid range. Updates the input value to adjusted value
     * and then returns adjusted value
     * @returns {number}    adjusted ping value
     */
    function getPingInput() {
        const pingInput = $("#ping-card").find("input"),
            pingAdjusted = Math.min(Math.max(pingInput.val(), 1), 12);
        pingInput.val(pingAdjusted);
        return pingAdjusted;
    }

    /**
     * Calculates ping probability from user input and displays result.
     */
    function calculateListener() {
        const creatures = getCreatureInput(),
            pings = getPingInput(),
            [time, c] = helpers.timeFunction(ping.calculate, creatures, pings);
        // Update results
        uiHelpers.updateResults(time, c);
        // Screen effects
        uiHelpers.shakeScreen(c);
    }
    $(document).ready(() => {
        $(".creature.god select").change(lifeStatusListener);
        $("#add-card-btn").click(() => uiHelpers.addCardListener(base));
        $("#calculate-btn").click(calculateListener);
        uiHelpers.init();
    });
})();
