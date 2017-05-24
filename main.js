var DECK_SIZE = 30;
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
        return totalTargetCards <= DECK_SIZE;
    }
    // this.calculate = function() {
    //     var drawAmount = Number($("#drawAmount").val());
    //     var str;
    //     if (isInputValid()) {
    //         var cardInfo = [];
    //         $.each(cardInputs, function(index, input) {
    //             var targetAmount = Number(input.amount.val());
    //             var targetNeeded = Number(input.needed.val());
    //             cardInfo.push({
    //                 needed: targetNeeded,
    //                 amount: targetAmount
    //             });
    //         });
    //         var c = chance.chanceToDraw(cardInfo, drawAmount, DECK_SIZE);
    //
    //         str = "Out of <span class='text-highlight'>1000</span> hands <span class='text-highlight'>" + (c * 1000).toFixed(2) + "</span> of them would be desired";
    //     } else {
    //         str = "Target cards are larger than deck size.";
    //     }
    //     $("#chance-text").html(str);
    // };
    this.calculate = function() {

    };
    $(document).ready(function() {
        // Add initial target card input
        addCardInput();
        // Add card listener
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
            // would like to append loading icon, but it doesn't update until calc is done
            // $(this).append();
        });
        console.log(calculateProb({
            drawn: 20,
            needed: [{
                    draw: 1,
                    deck: 3
                },
                {
                    draw: 1,
                    deck: 3
                }
            ]
        }));
    });
}).apply(main);
