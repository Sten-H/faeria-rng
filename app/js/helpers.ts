"use strict";
import * as $ from "jquery";
import "jrumble";
import * as R from "ramda";  // All I want is basically to use a lazy seq once :/


export namespace UI {
    export function init(): void { // FIXME rename to initUI
        // Initialize rumble effect on elements
        $(".rumble").jrumble(); // FIXME
        // This sets the collapse arrow the right way at start for collapsible cards
        $(".card-header a").toggleClass("collapsed");
        // Initialize tooltips
        $('[data-toggle="tooltip"]').tooltip();
        // Hide load icon, setting display none in css is buggy for some reason.
        $("#calculate-btn span").hide();
    }
    export function updateResults(time: string, c: number, decimals: number = 0) {
        $("#chance-number").html((c * 1000).toFixed(decimals));
        $("#time-taken").html(time).show();
    }
    /**
     * Wraps a string in span with text-highlight class
     * @param string
     * @returns {jQuery}
     */
    export function highlightWrap(string: string): JQuery<HTMLElement> {
        return $("<span>").addClass("text-highlight").html(string);
    }
    /**
     * Listener for card delete button
     */
    export function removeCard(): void {
        $(this).closest(".card")
            .slideToggle("fast", function() {
                this.remove();
            });
        spinGlyphicon($("#add-card-btn").find("span"), true);
    }
    /**
     * Add a new card to be considered for probability.
     */
    export function addCard(base: JQuery<HTMLElement>): JQuery<HTMLElement> {
        const newCard = base.clone();
        $("#card-container").append(newCard);
        newCard.removeAttr('id')
            .hide()
            .slideToggle("fast")
            .find(".remove-card-btn")
            .click(removeCard)
        spinGlyphicon($(this).find("span"));
        return newCard;
    }
    /**
     * Spins a glyphicon for a given duration.
     * @param span {Object} jquery object pointing to span with glyphicon class
     * @param reverse {Boolean} reverse spin direction if true
     * @param duration {Number} spin duration in milliseconds
     */
    export function spinGlyphicon(span: JQuery<HTMLElement>, reverse=false, duration=200): void {
        const spinClass = (reverse) ? "glyphicon-rev-spin" : "glyphicon-spin";
        span.addClass(spinClass);
        setTimeout(() => span.removeClass(spinClass), duration);
    }

    export function addCardListener(base: JQuery<HTMLElement>): JQuery<HTMLElement> {
        spinGlyphicon($("#add-card-btn").find("span"));
        return addCard(base);
    }
    /**
     * Shakes the selected element(s)
     * @param  {String} selector elements to select
     * @param  {boolean} rotate   If true shakes rotation
     * @param  {int} strength the magnitude of the shakes
     * @param  {int} duration time in milliseconds before shake is stopped
     */
    export function rumbleElement(selector: string, rotate: boolean, strength: number, duration: number): void {
        const rumble = {
            x: 10 * strength,
            y: 10 * strength,
            rotation: (rotate) ? 4 * strength : 0
        };
        $(selector).jrumble(rumble)
            .trigger('startRumble');
        setTimeout(function() {
            $(selector).trigger('stopRumble');
        }, duration);
    }
    /**
     * Shakes screen and some specific elements based on c
     * @param  {Number} c chance of reaching desired outcome (probability)
     */
    export function shakeScreen(c: number): void {
        /* The c value is floored because when it is too small, the rumbles will move the elements by subpixels and
         it creates a jagged effect */
        const floorVal = 0.009,
            flooredC = Math.max(floorVal, c);
        rumbleElement("#chance-number", true, flooredC, 1200);
        if(flooredC > floorVal) {  // If c value was not floored rumble all elements
            rumbleElement("#title", true, flooredC / 4 , 1100);
            rumbleElement(".card", true, flooredC / 2, 800);
            rumbleElement(".content", false, flooredC / 2, 900);
        }
    }
}
export namespace Helpers {
    /**
     * Returns a promise which resolves to an object with needed information
     * @param  {Function}    func function to time
     * @param  {Array} args  func arguments
     * @return {Promise}     Returns a promise that resolves to an object with t and results values
     */
    export function timeFunction (func: Function, ...args: Array<any>): Promise<{t: number, results: any}> {
        return new Promise((resolve, reject) => {
            const t0: number = performance.now(),
                returnValue: any = func(...args),
                deltaTime: number = performance.now() - t0;
            resolve({t: deltaTime, results: returnValue});
        });
    }
    export function range(start: number, end: number): ReadonlyArray<number> {
        return R.range(start, end);
    }
    export function rangeInclusive(start: number, end: number): ReadonlyArray<number> {
        return range(start, end + 1);
    }
    export function getRandomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min)) + min;
    }
    export function getRandomIntInclusive(min: number, max: number): number {
        return getRandomInt(min, max + 1);
    }
}