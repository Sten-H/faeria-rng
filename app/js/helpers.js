let uiHelpers = {};
(function(context) {
    "use strict";
    this.init= function() {
        // Initialize rumble effect on elements
        $(".rumble").jrumble();
        // This sets the collapse arrow the right way at start for collapsible cards
        $(".card-header a").toggleClass("collapsed");
        // Initialize tooltips
        $('[data-toggle="tooltip"]').tooltip();
    };
    this.updateResults = function(time, c) {
        $("#chance-number").html((c.toFixed(3) * 1000));
        $("#time-taken").html((time / 1000).toFixed(4)).show();
    };
    /**
     * Wraps a string in span with text-highlight class
     * @param string
     * @returns {jQuery}
     */
    this.highlightWrap = function(string) {
        return $("<span>").addClass("text-highlight").html(string);
    };
    /**
     * Listener for card delete button
     */
    this.removeCard = function() {
        const card = $(this).closest(".card");
        card.slideToggle("fast", function() {
            card.remove();
        });
        uiHelpers.spinGlyphicon($("#add-card-btn").find("span"), true);
    };
    /**
     * Add a new card to be considered for probability.
     */
    this.addCard = function(base) {
        let newCard = base.clone();
        newCard.removeAttr('id');
        newCard.find(".remove-card-btn").click(this.removeCard);
        newCard.hide();
        $("#card-container").append(newCard);
        newCard.slideToggle("fast");
        // Button spin effect
        uiHelpers.spinGlyphicon($(this).find("span"));
    };
    this.spinAllGlyphicons = function() {
        $.each($("span.glyphicon"), (index, icon) => uiHelpers.spinGlyphicon($(icon), Math.random() >= 0.5, 1000));
    };
    this.addCardListener = function(base) {
        uiHelpers.addCard(base);
        uiHelpers.spinGlyphicon($("#add-card-btn").find("span"));
    };
    /**
     * Spins a glyphicon for a given duration.
     * @param span {Object} jquery object pointing to span with glyphicon class
     * @param reverse {Boolean} reverse spin direction if true
     * @param duration {Number} spin duration in milliseconds
     */
    this.spinGlyphicon = function (span, reverse=false, duration=200) {
        let spinClass = (reverse) ? "glyphicon-rev-spin" : "glyphicon-spin";
        span.addClass(spinClass);
        setTimeout(() => span.removeClass(spinClass), duration);
    };
    /**
     * Shakes the selected element(s)
     * @param  {String} selector elements to select
     * @param  {boolean} rotate   If true shakes rotation
     * @param  {int} strength the magnitude of the shakes
     * @param  {int} duration time in milliseconds before shake is stopped
     */
    this.rumbleElement = function(selector, rotate, strength, duration) {
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
    };
    /**
     * Shakes screen and some specific elements based on c
     * @param  {Number} c amount of desired hands
     */
    this.shakeScreen = function(c) {
        this.rumbleElement("#chance-number", true,c, 1200);
        if (c >= 0.700) {
            this.rumbleElement("#title", true, c / 1.5 , 1100);
        }
        if(c >= 0.950) {
            // FIXME rumbling cards bugs on draw page. It's a fun effect, try to fix it.
            // this.rumbleElement(".card", true, c / 2, 800);
            this.rumbleElement(".content", false, c / 2, 900);
        }
    }
}).apply(uiHelpers);

let helpers = {};
(function(context) {
    "use strict";
    /**
     * Returns time taken and return value of func.
     * @param  {function}    func function to time
     * @param  {Array} args  func arguments
     * @return {Array}       Array where first value is time taken in milliseconds and second value is func return value
     */
    this.timeFunction = function(func, ...args) {
        let t0 = performance.now(),
            returnValue = func(...args);
        return [performance.now() - t0, returnValue];
    }
    this.range = function(start, end) {
        return [...new Array(end - start).keys()].map((val) => val + start);
    };
    this.rangeInclusive = function(start, end) {
        return this.range(start, end + 1);
    };
    this.getRandomInt = function(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    };
    this.getRandomIntInclusive = function (min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };
}).apply(helpers);