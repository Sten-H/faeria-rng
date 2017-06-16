(function() {
    "use strict";
    // Template for creature cards
    const base = $("#base-creature");

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
     * Remove a creature card
     */
    function removeCreatureListener() {
        const card = $(this).closest(".card.creature");
        card.slideToggle("fast", function() {
            card.remove();
        });
        // Button spin effect
        uiHelpers.spinGlyphicon($("#add-creature-btn span"), true);
    }

    /**
     * Add a new creature card to be considered for probability.
     */
    function addCreatureListener() {
        let newCreature = base.clone().addClass("creature");
        newCreature.removeAttr('id');
        newCreature.find(".remove-creature-btn").click(removeCreatureListener);
        newCreature.find("select").change(lifeStatusListener);
        newCreature.hide();
        $("#creature-container").append(newCreature);
        newCreature.slideToggle("fast");
        // Button spin effect
        uiHelpers.spinGlyphicon($(this).find("span"));
    }
    function updateResults(time, c) {
        $("#chance-number").html((c.toFixed(3) * 1000));
        $("#time-taken").html((time / 1000).toFixed(4)).show();
    }

    /**
     * Collects user creature input and creates an array of creature objects
     * @returns {Array}  array with objects containing toDie, hp, name variables
     */
    function getCreatureInput() {
        return [...$(".card.creature").map((index, card) => {
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
        const pingInput = $(".card.ping-card").find("input"),
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
        updateResults(time, c);
        // Screen effects
        uiHelpers.shakeScreen(c * 1000);
    }
    $(document).ready(() => {
        $("#time-taken-wrapper").show();
        $(".creature.god select").change(lifeStatusListener);
        $("#add-creature-btn").click(addCreatureListener);
        $("#calculate-ping-btn").click(calculateListener);
    });
})();
