let main = {};
(function() {
    "use strict";
    let loadIcon = "glyphicon-repeat",
        base = $("#base");;
    /**
     * Creates effects on screen based on the amount of bad luck player
     * has painfully endured. A high c will create larger effects.
     * @param  {int} c the number of desired hands
     */
    function resultScreenEffects(c) {
        uiHelpers.shakeScreen(c);
    }
    /**
     * Display error text
     */
    function displayError(msg) {
        $("#error-message").html(msg);
        $("#error-wrapper").show();
        $("#results-wrapper").hide();
    }
    /**
     * Removes effects shown while loading
     */
    function cleanupWaitEffects() {
        $("#calculate-btn span").removeClass(loadIcon);
        $("#calculate-btn").removeClass("disabled");
    }
    /**
     * Collects user card related input and represents each card as an object with
     * needed, amount, value, foundAmount variables. Card objects are returned in an array.
     * @return {Array} Array of Objects representing each target card
     */
    function getCardInput() {
        return [...$(".draw").not("#base") // The spread is used to get rid of jquery object
            .map((index, input) => {
            return {
                needed: Number($(input).find(".card-need").val()),
                total: Number($(input).find(".card-deck").val()),
                value: index,
                foundtotal: 0  // FIXME Don't think I need this check.
            }
        })];
    }
    /**
     * Checks all user entered input. Returns an object containing validity and optionally
     * a message to explain what is not valid.
     * @param  {int}  drawAmount    User entered card draw value
     * @param {Array} cardInputs    array of objects containing each card input.
     * @return {Object}            Object containing validity and msg values
     */
    function isInputValid(drawAmount, cardInputs) {
        let msg = $("<span>");
        let totalAmount = cardInputs.reduce((acc, input) =>
        acc + Number(input.total), 0);
        // User supposes a larger deck than is possible
        if(totalAmount > drawSimulation.getDeckSize()) {
            msg.append("Target card ", uiHelpers.highlightWrap("amounts"), " sum exceeds deck size");
            return {val: false, msg: msg };
        }
        let totalNeeded = cardInputs.reduce((acc, input) =>
        acc + Number(input.needed), 0);
        // User needs more cards than there are draws, will always fail.
        if (totalNeeded > drawAmount) {
            msg.append("Fewer ", uiHelpers.highlightWrap("draws "), "than ", uiHelpers.highlightWrap("needed"), " cards");
            return {val: false, msg: msg};
        }
        let validNeeded = cardInputs.every((input) =>
        Number(input.total) >= Number(input.needed));
        // One or more needed values exceeds its amount in deck
        if (!validNeeded) {
            msg.append(uiHelpers.highlightWrap("Needed"), " cannot be larger than card ", uiHelpers.highlightWrap("amount"), " in deck");
            return {val: false, msg: msg};
        }
        return {val: true, msg: ""};
    }
    /**
     * Validates user input and runs drawSimulation if input is valid.
     */
    function run() {
        const smartMulligan = $("#mulligan-checkbox").is(':checked'),
            drawAmount = Number($(".draw-amount").val()),
            cardInfo = getCardInput(),
            validity = isInputValid(drawAmount, cardInfo);
        if(validity.val) {
            let timeTaken,
                c;
            if(smartMulligan) {
                [timeTaken, c] = helpers.timeFunction(drawSimulation.run, cardInfo, drawAmount);
            }
            else {
                [timeTaken, c] = helpers.timeFunction(draw.calculate, cardInfo, drawAmount);
            }
            timeTaken = (timeTaken / 1000).toFixed(3); // convert to seconds
            // Clean up load time effects
            cleanupWaitEffects();
            // Update text telling user the results
            uiHelpers.updateResults(timeTaken, c);
            // Give user feedback dictated by how unlucky user is.
            resultScreenEffects(c);
        } else {
            cleanupWaitEffects();
            displayError(validity.msg);
        }
        // Collapse FAQ in case it was open. Would be nice to do this before calculation but it becomes very choppy.
        $("#faq-wrapper").collapse('hide');
    }
    $(document).ready(function() {
        // Add initial target card input
        uiHelpers.addCard(base);
        // Add button listeners
        $("#add-card-btn").click(() => uiHelpers.addCardListener(base));
        /* This is used because on mouseDown triggers before the form submission, so it will
           update the DOM before time consuming drawSimulation is called by form submission */
        $("#calculate-btn").on("mousedown", () => {
            $("#calculate-btn").addClass("disabled");
            $("#chance-text-number").html("---");
            $("#error-wrapper").hide();
            $("#results-wrapper").show();
            $("#calculate-btn span").addClass(loadIcon);
            run();
        });
        uiHelpers.init();
        $(".draw-amount").val(helpers.getRandomIntInclusive(3, 20));
    });
}).apply(main);
