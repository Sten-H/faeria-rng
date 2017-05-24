// http://stackoverflow.com/a/6274398/449477
function shuffle(array) {
  let counter = array.length;

  // While there are elements in the array
  while (counter > 0) {
    // Pick a random index
    let index = Math.floor(Math.random() * counter);

    // Decrease counter by 1
    counter--;

    // And swap the last element with it
    let temp = array[counter];
    array[counter] = array[index];
    array[index] = temp;
  }

  return array;
}

function calculateProb(x) {
  var cards = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29];

  var length = cards.length - x.drawn;

  var success = 0;
  var failure = 0;

  next: for (var i = 0; i < 700000 / x.precision; ++i) {
    shuffle(cards);

    var index = 0;

    for (var j = 0; j < x.needed.length; ++j) {
      var need = x.needed[j];

      var drawn = 0;

      for (var h = 0; h < need.deck; ++h) {
        if (cards.indexOf(index, length) !== -1) {
          ++drawn;
        }

        ++index;
      }

      if (drawn < need.draw) {
        ++failure;
        continue next;
      }
    }

    ++success;
  }

  return (success / (success + failure));
}
