/*jshint esversion: 6 */
var main = {};
(function() {
    var cardInputs = [];
    var loadIcon = "glyphicon-repeat";
    var chanceText = "Out of <span class='text-highlight'>1000</span> hands <span class='text-highlight rumble' id='chance-text-number'> --- </span> of them would be desired";
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
        $(selector).jrumble(rumble);
        $(selector).trigger('startRumble');
        setTimeout(function() {
            $(selector).trigger('stopRumble');
        }, duration);
    }
    /**
     * Creates effects on screen based on the amount of bad luck player
     * has painfully endured. A high c will create larger effects.
     * @param  {int} c the number of desired hands
     */
    function resultScreenEffects(c) {
        var strength = c / 1000;
        rumbleElement("#chance-text-number", true, strength, 1200);
        if (c >= 700) {
            rumbleElement("#title", true, strength / 1.5 , 1100);
        }
        if(c >= 950)
            rumbleElement(".content", false, strength / 2 , 900);
    }
    function createInputField(baseId, minValue, defaultValue) {
        var newInput = $("<input type='number' class='form-control' required></input>");
        var idName = baseId + "-" + cardInputs.length - 1;
        newInput.attr("id", idName).attr("min", minValue).attr("max", 3).
            attr("placeholder", "#" + cardInputs.length + " " + baseId ).
            attr("value", defaultValue);
        var inputGroup = $("<div class='form-group'></div").append(newInput);
        return $("<div class='col-5'></div>").append(inputGroup);
    }
    function updateInputRow(input, index) {
        input.deleteBtn.attr("data-index", index);
        input.needed.attr("placeholder", "#" + (index + 1) +" needed");
        input.amount.attr("placeholder", "#" + (index + 1) +" amount");
    }
    function createDeleteInputRowButton() {
        var newInput = $("<button class='btn btn-danger del-input-row-btn'><span class='glyphicon glyphicon-trash'></span></button>");
        newInput.attr("data-index", cardInputs.length - 1);
        cardInputs[cardInputs.length - 1].deleteBtn = newInput;
        // Click listener
        $(newInput).click(function(evt) {
            evt.preventDefault();
            if (cardInputs.length > 1) {
                var index = $(this).attr("data-index");
                var inputRow = cardInputs[index].amount.closest(".row");
                inputRow.slideToggle("fast", () => {
                    cardInputs.splice(index, 1);
                    cardInputs.forEach((input, index) => updateInputRow(input, index));
                    inputRow.remove();
                });
            }
        });
        return $("<div class='col-2'></div>").append(newInput);
    }
    function createCardInputRow() {
        var targetCards = $("#target-cards");
        var row = $("<div class='row'></div>");
        cardInputs.push({});
        var amount = createInputField("amount", 1, 3),
            needed = createInputField("needed", 0, 1),
            deleteBtn = createDeleteInputRowButton();
        cardInputs[cardInputs.length - 1] = {
            amount: amount.find("input"),
            needed: needed.find("input"),
            deleteBtn: deleteBtn.find("button")
        };
        row.appendTo(targetCards);
        var input = cardInputs[cardInputs.length -1];
        return row.append(amount, needed, deleteBtn);
    }

    function addCardInput() {
        var row = createCardInputRow();
        row.hide();
        $(row).slideToggle("fast");
    }

    function isInputValid(drawAmount) {
        var errorBadge = "<span class='badge badge-danger'>Error</span> ";
        var totalAmount = cardInputs.reduce((acc, input) =>
            acc + Number(input.amount.val()), 0);
        // User supposes a larger deck than is possible
        if(totalAmount > monteCarlo.getDeckSize()) {
            return {val: false, msg: errorBadge + "Card <span class='text-highlight'>amounts</span> exceed deck size."};
        }
        var totalNeeded = cardInputs.reduce((acc, input) =>
            acc + Number(input.needed.val()), 0);
        // User needs more cards than there are draws, will always fail.
        if (totalNeeded > drawAmount) {
            return {val: false, msg: errorBadge + "Fewer <span class='text-highlight'>draws</span> than <span class='text-highlight'>needed</span> cards"};
        }
        var validNeeded = cardInputs.every((input) =>
            Number(input.amount.val()) >= Number(input.needed.val()));
        // One or more needed values exceeds its amount in deck
        if (!validNeeded) {
            return {val: false, msg: errorBadge + "<span class='text-highlight'>Needed</span> cannot be larger than card <span class='text-highlight'>amount</span> in deck"};
        }
        return {val: true};
    }
    function cleanUp() {
        $("#calculate-btn span").removeClass(loadIcon);
        $("#calculate-btn").removeClass("disabled");
    }
    this.calculate = function() {
        var drawAmount = Number($("#draw-amount").val()),
            str,
            validity = isInputValid(drawAmount);
        if (validity.val) {
            var cardInfo = cardInputs.map((input, index) => {
                return {
                    needed: Number(input.needed.val()),
                    amount: Number(input.amount.val()),
                    value: index,
                    foundAmount: 0
                };
            });
            var c = monteCarlo.run(cardInfo, drawAmount).toFixed(3) * 1000;
            cleanUp();
            $("#chance-text").html(chanceText);
            $("#chance-text-number").html(c);
            resultScreenEffects(c);
        } else {
            cleanUp();
            $("#chance-text").html(validity.msg);
        }
    };
    $(document).ready(function() {
        addCardInput();  // Add initial target card input
        // Add card btn listener
        $("#add-card-btn").click(function(evt) {
            evt.preventDefault();
            addCardInput();
            this.blur();
        });
        $("#remove-card-btn").click(function(evt) {
            evt.preventDefault();
            var targetCards = $("#target-cards").children();
            if(targetCards.length > 1) {
                var input = targetCards.last();
                $(input).slideToggle("fast", function() {
                    input.remove();
                });
                cardInputs.pop();
            }
            this.blur();
        });
        // Unhides mulligan form when use mulligan is checked
        $("#mulligan-checkbox").change(function() {
            $(".mulligan-form").slideToggle("fast");
        });
        // Add load icon to button if form input is valid
        $("#calculate-btn").on("mousedown", function() {
            if ($('#chance-form')[0].checkValidity()) {
                $("#calculate-btn").addClass("disabled");
                $("#chance-text-number").html("---");
                $("#calculate-btn span").addClass(loadIcon);
            }
        });
        // Initialize rumble effect on elements
        $(".rumble").jrumble();
    });
}).apply(main);
