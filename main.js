/*jshint esversion: 6 */
var main = {};
(function() {
    var cardInputs = [];

    function getTargetAmountColumn() {
        var newInput = $("<input type='number' class='form-control' required></input>");
        var idName = "card-" + cardInputs.length;
        newInput.attr("id", idName).attr("min", 1).attr("max", 3);
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
        newInput.attr("id", idName).attr("min", 1).attr("max", 3);
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
        return totalTargetCards <= chance.getDeckSize();
    }
    this.calculate = function() {
        var drawAmount = Number($("#drawAmount").val());
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
                    value: index
                });
                needed.push({
                    deck: targetAmount,
                    draw: targetNeeded
                });
            });
            // var c = chance.chanceToDraw(cardInfo, drawAmount);
            var c = 0
            var t0 = performance.now();
            console.log(monteCarlo.simulate(cardInfo, drawAmount));
            console.log("monteCarlo time taken: " + ((performance.now() - t0) / 1000) + " seconds.");
            t0 = performance.now();
            console.log(calculateProb({drawn: drawAmount, needed}));
            console.log("pauanyu time taken: " + ((performance.now() - t0) / 1000) + " seconds.");

            str = "Out of <span class='text-highlight'>1000</span> hands <span class='text-highlight'>" + (c * 1000).toFixed(2) + "</span> of them would be desired";
        } else {
            str = "Target cards are larger than deck size.";
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
            var input = $("#target-cards").children().last();
            $(input).slideToggle("fast", function() {
                input.remove();
            });
            cardInputs.pop();
            this.blur();
        });
        $("#calculate-btn").click(function(evt) {
            evt.preventDefault();
            main.calculate();
        });
    });
}).apply(main);
