/*jshint esversion: 6 */
let main = {};
(function() {
    "use strict";
    let cardInputs = [],
        loadIcon = "glyphicon-repeat";
    /**
     * Prints time taken to execute function func to console, and returns taime taken and return value of func.
     * @param  {function}    func function to time
     * @param  {Array} args  func arguments
     * @return {Array}       Array where first value is time taken in milliseconds and second value is func return value
     */
    function timeFunction(func, ...args) {
        let t0 = performance.now(),
            returnValue = func(...args);
        return [performance.now() - t0, returnValue];
    }
    function spinAllGlyphicons() {
        $.each($("span.glyphicon"), (index, icon) => spinGlyphicon($(icon), Math.random() >= 0.5, 1000));
    }
    /**
     * Spins a glyphicon for a given duration.
     * @param span {Object} jquery object pointing to span with glyphicon class
     * @param reverse {Boolean} reverse spin direction if true
     * @param duration {Number} spin duration in milliseconds
     */
    function spinGlyphicon(span, reverse=false, duration=200) {
        let spinClass = (reverse) ? "glyphicon-rev-spin" : "glyphicon-spin";
        span.addClass(spinClass);
        setTimeout(() => span.removeClass(spinClass), duration);
    }
    /**
     * Shakes the selected element(s)
     * @param  {String} selector elements to select
     * @param  {boolean} rotate   If true shakes rotation
     * @param  {int} strength the magnitude of the shakes
     * @param  {int} duration time in milliseconds before shake is stopped
     */
    function rumbleElement(selector, rotate, strength, duration) {
        let rumble = {
            x: 10 * strength,
            y: 10 * strength,
            rotation: (rotate) ? 4 * strength : 0
        };
        $(selector).jrumble(rumble);
        $(selector).trigger('startRumble');
        setTimeout(function() {
            $(selector).trigger('stopRumble');
        }, duration);
    }
    /**
     * Shakes screen and some specific elements based on c
     * @param  {Number} c amount of desired hands
     */
    function shakeScreen(c) {
        let strength = c / 1000;
        rumbleElement("#chance-number", true, strength, 1200);
        if (c >= 700) {
            rumbleElement("#title", true, strength / 1.5 , 1100);
        }
        if(c >= 950)
            rumbleElement(".content", false, strength / 2 , 900);
    }
    /**
     * Creates effects on screen based on the amount of bad luck player
     * has painfully endured. A high c will create larger effects.
     * @param  {int} c the number of desired hands
     */
    function resultScreenEffects(c) {
        shakeScreen(c);
        spinAllGlyphicons(c);
        // TODO more effects can be added here
    }
    /**
     * Resets the text displaying simulation results
     */
    function updateResultText(chance, timeTaken) {
        $("#error-wrapper").hide();
        $("#results-wrapper").show();
        $("#chance-number").html(chance);
        $("#time-taken").html(timeTaken);
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
     * Updates a card row (amount field and needed field and delete button),
     * this is done when a row has been deleted and all row indexes need to be updated
     * @param  {Object} input input row object found in inputCards array
     * @param  {Number} index row index
     */
    function updateInputRow(input, index) {
        input.deleteBtn.attr("data-index", index);
        input.needed.attr("placeholder", `#${index + 1} needed`);
        input.amount.attr("placeholder", `#${index + 1} amount`);
    }
    /**
     * Deletes card input row. Listener of delete button on each row. Deletes corresponding
     * row.
     * @param  {object} event jquery click event
     */
    function deleteInputRow(event) {
        event.preventDefault();
        if (cardInputs.length > 1) {
            let index = $(this).attr("data-index"),
                inputRow = cardInputs[index].amount.closest(".row");
            inputRow.slideToggle("fast", () => {
                cardInputs.splice(index, 1);
                cardInputs.forEach((input, index) => updateInputRow(input, index));
                inputRow.remove();
            });
            spinGlyphicon($("#add-card-btn").find("span"), true);
        }
    }
    /**
     * Creates and returns a card related input field.
     * @param  {String} baseId       should either be 'amount' or 'needed'
     * @param  {Number} minValue     input field minimum value
     * @param  {Number} defaultValue input field default value
     * @return {object}              jQuery object
     */
    function createInputField(baseId, minValue, defaultValue) {
        let newInput = $("<input type='number' class='form-control' required>"),
            idName = baseId + "-" + cardInputs.length - 1;
        newInput.attr("id", idName).attr("min", minValue).attr("max", 3).
            attr("placeholder", "#" + cardInputs.length + " " + baseId ).
            attr("value", defaultValue);
        return $("<div class='form-group'>").append(newInput);
    }
    /**
     * Creates and returns card input row delete button.
     * @return {object} jquery button
     */
    function createDeleteInputRowButton() {
        let newInput = $("<button class='btn btn-danger del-input-row-btn'><span class='glyphicon glyphicon-trash'></span></button>");
        newInput.attr("data-index", cardInputs.length - 1).addClass("float-right");
        cardInputs[cardInputs.length - 1].deleteBtn = newInput;
        newInput.click(deleteInputRow);
        return $("<div class='form-group'>").append(newInput);
    }
    /**
     * Wraps an element in a div with bootstrap col class of specified width
     * @param  {Object} element  element to wrap in column
     * @param  {Number} width width of column
     * @return {Object}       jquery object
     */
    function colWrap(element, width) {
        let col = $("<div class='col-" + width + "'></div>");
        col.append(element);
        return col;
    }

    /**
     * Wraps a string in span with text-highlight class
     * @param string
     * @returns {jQuery}
     */
    function highlightWrap(string) {
        return $("<span>").addClass("text-highlight").html(string);
    }
    /**
     * Creates and adds input fields for a new card
     */
    function addCardInput() {
        cardInputs.push({});
        let amountValue = monteCarlo.getRandomIntInclusive(1,3),
            neededValue = monteCarlo.getRandomIntInclusive(1, amountValue),
            amount = createInputField("amount", 1, amountValue),
            needed = createInputField("needed", 1, neededValue),
            deleteBtn = createDeleteInputRowButton(),
            row = $("<div class='row'></div>");
        cardInputs[cardInputs.length - 1] = {
            amount: amount.find("input"),
            needed: needed.find("input"),
            deleteBtn: deleteBtn.find("button")
        };
        row.append(colWrap(amount, 5), colWrap(needed, 5), colWrap(deleteBtn, 2));
        $("#target-cards").append(row);
        row.hide();  // Hide so it can be animated to show with slideToggle
        $(row).slideToggle("fast");
    }
    /**
     * Checks all user entered input. Returns an object containing validity and optionally
     * a message to explain what is not valid.
     * @param  {int}  drawAmount    User entered card draw value
     * @return {Object}            Object containing validity and msg values
     */
    function isInputValid(drawAmount) {
        let msg = $("<span>");
        let totalAmount = cardInputs.reduce((acc, input) =>
            acc + Number(input.amount.val()), 0);
        // User supposes a larger deck than is possible
        if(totalAmount > monteCarlo.getDeckSize()) {
            msg.append("Target card ", highlightWrap("amounts"), " sum exceeds deck size");
            return {val: false, msg: msg };
        }
        let totalNeeded = cardInputs.reduce((acc, input) =>
            acc + Number(input.needed.val()), 0);
        // User needs more cards than there are draws, will always fail.
        if (totalNeeded > drawAmount) {
            msg.append("Fewer ", highlightWrap("draws "), "than ", highlightWrap("needed"), " cards");
            return {val: false, msg: msg};
        }
        let validNeeded = cardInputs.every((input) =>
            Number(input.amount.val()) >= Number(input.needed.val()));
        // One or more needed values exceeds its amount in deck
        if (!validNeeded) {
            msg.append(highlightWrap("Needed"), " cannot be larger than card ", highlightWrap("amount"), " in deck");
            return {val: false, msg: msg};
        }
        return {val: true, msg: ""};
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
    function getUserCardInput() {
        return cardInputs.map((input, index) => {
            return {
                needed: Number(input.needed.val()),
                amount: Number(input.amount.val()),
                value: index,
                foundAmount: 0
            };
        });
    }
    /**
     * Validates user input and runs simulation if input is valid.
     */
    this.run = function() {
        let smartMulligan = $("#mulligan-checkbox").is(':checked'),
            drawAmount = Number($("#draw-amount").val()),
            precision = Number($("input:radio[name='precision']:checked").val()),
            validity = isInputValid(drawAmount),
            showEffects = $("#effects-checkbox").is(':checked');
        if (validity.val) {
            let cardInfo = getUserCardInput(),
                [timeTaken, c] = timeFunction(monteCarlo.run, cardInfo, drawAmount, precision, smartMulligan);
            timeTaken = (timeTaken / 1000).toFixed(3); // convert to seconds
            // Convert to successful hands out of a thousand, show decimals if high precision was used.
            c = (precision > 500000) ? (c * 1000).toFixed(2) : (c * 1000).toFixed();
            // Clean up load time effects
            cleanupWaitEffects();
            // Update text telling user the results
            updateResultText(c, timeTaken);
            // Give user feedback dictated by how unlucky user is.
            if(showEffects)
                resultScreenEffects(c);
        } else {
            cleanupWaitEffects();
            displayError(validity.msg);
        }
        // Collapse FAQ in case it was open. Would be nice to do this before calculation but it becomes very choppy.
        $("#faq-wrapper").collapse('hide');
    };
    $(document).ready(function() {
        // Add initial target card input
        addCardInput();
        // Add button listeners
        $("#add-card-btn").click(function(evt) {
            evt.preventDefault();
            addCardInput();
            spinGlyphicon($(this).find("span"));
            this.blur();
        });
        $("#remove-card-btn").click(function(evt) {
            evt.preventDefault();
            let targetCards = $("#target-cards").children();
            if(targetCards.length > 1) {
                let input = targetCards.last();
                $(input).slideToggle("fast", function() {
                    input.remove();
                });
                cardInputs.pop();
            }
            this.blur();
        });
        /* This is used because on mouseDown triggers before the form submission, so it will
           update the DOM before time consuming simulation is called by form submission */
        $("#calculate-btn").on("mousedown", function() {
            // If user input is valid add loading effects
            if ($('#chance-form')[0].checkValidity()) {
                $("#calculate-btn").addClass("disabled");
                $("#chance-text-number").html("---");
                $("#calculate-btn span").addClass(loadIcon);
            }
        });
        $("#time-checkbox").on("change", function() {
           $("#time-taken-wrapper").slideToggle();
        });
        // Initialize rumble effect on elements
        $(".rumble").jrumble();
        // This sets the options collapse arrow the right way at start
        $(".card-header a").toggleClass('collapsed');
        // Initialize tooltips
        $('[data-toggle="tooltip"]').tooltip();
        // Set a random draw amount starting value
        $("#draw-amount").val(monteCarlo.getRandomIntInclusive(3, 20));
    });
}).apply(main);
