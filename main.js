/*jshint esversion: 6 */
var main = {};
(function() {
    var cardInputs = [];
    var loadIcon = "glyphicon-repeat";
    var loadVizFunc;
    function getTargetAmountColumn() {
        var newInput = $("<input type='number' class='form-control' required></input>");
        var idName = "card-" + cardInputs.length;
        newInput.attr("id", idName).attr("min", 1).attr("max", 3).attr("value", 3);
        var newLabel = $("<label for=" + idName + "> Target card#" + (cardInputs.length + 1) + " amount</label>");
        var inputGroup = $("<div class='form-group'></div").append(newLabel, newInput);
        cardInputs.push({
            amount: newInput
        });
        return $("<div class='col-6'></div>").append(inputGroup);
    }

    function getTargetNeededColumn() {
        var newInput = $("<input type='number' class='form-control' required></input>");
        var idName = "needed-" + cardInputs.length;
        newInput.attr("id", idName).attr("min", 0).attr("max", 3).attr("value", 1);
        var newLabel = $("<label for=" + idName + "> Target card#" + (cardInputs.length) + " needed</label>");
        var inputGroup = $("<div class='form-group'></div").append(newLabel, newInput);
        cardInputs[cardInputs.length - 1].needed = newInput;
        return $("<div class='col-6'></div>").append(inputGroup);
    }

    function getInputRow() {
        var targetCards = $("#target-cards");
        var row = $("<div class='row'></div>");
        row.appendTo(targetCards);
        return row.append(getTargetAmountColumn(), getTargetNeededColumn());
    }

    function addCardInput() {
        var row = getInputRow();
        row.hide();
        $(row).slideToggle("fast");
    }

    function isInputValid() {
        var totalTargetCards = 0;
        $.each(cardInputs, function(index, input) {
            totalTargetCards += Number(input.amount.val());
        });
        return totalTargetCards <= monteCarlo.getDeckSize();
    }

    this.calculate = function() {
        var drawAmount = Number($("#draw-amount").val());
        var str;
        if (isInputValid()) {
            var cardInfo = [];
            var needed = [];  // For pauanyu solution
            $.each(cardInputs, function(index, input) {
                var targetAmount = Number(input.amount.val());
                var targetNeeded = Number(input.needed.val());
                cardInfo.push({
                    needed: targetNeeded,
                    amount: targetAmount,
                    value: index,
                    foundAmount: 0
                });
                needed.push({
                    deck: targetAmount,
                    draw: targetNeeded
                });
            });
            var t0 = performance.now();
            // console.log(calculateProb({drawn: drawAmount, needed}));
            // console.log("pauanyu time taken: " + ((performance.now() - t0) / 1000) + " seconds.");
            // t0 = performance.now();
            var c = monteCarlo.run(cardInfo, drawAmount);
            $("#calculate-btn span").removeClass(loadIcon);
            console.log("monteCarlo time taken: " + ((performance.now() - t0) / 1000) + " seconds.");
            t0 = performance.now();

            $("#chance-text-number").html(c.toFixed(3) * 1000);
        } else {
            // str = "Target cards are larger than deck size.";
        }
        $("#chance-text").html(str);
    };
    $(document).ready(function() {
        // Add initial target card input
        addCardInput();
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
        $("#mulligan-checkbox").change(function() {
            $(".mulligan-form").slideToggle("fast");
        });
        // Add load icon to button if form input is valid
        $("#calculate-btn").on("mousedown", function() {
            if ($('#chance-form')[0].checkValidity()) {
                $("#chance-text-number").html("---");
                $("#calculate-btn span").addClass(loadIcon);
            }
        });
    });
}).apply(main);
