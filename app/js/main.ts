"use strict";
import * as $ from "jquery";
import * as Tether from "tether";
/*
This is depressing but for bootstrap to find these thing when bundled I need to declare them in global namespace
like this. It worked without when I bundled everything into one bundle not divided in libs and src. What would most
likely work is bundling jquery and tether in their own bundle that I explicitly src first in html files
 */
declare global {
    interface Window { jQuery: any, $: any, Tether: any}
}
window.jQuery = window.$ = $;
window.Tether = Tether;
import "bootstrap";
import * as draw from "./draw-main";
import * as ping from "./ping-main";

declare global {
    interface JQuery {
        jrumble(arg?: object): JQuery;
        html(obj:JQuery): JQuery;  // Allow html input with JQuery objects
    }
}
/**
 * This is the entry point for both draw and ping sites
 */
$(() => {
    const location = $("#location").data("location");
    if (location == "draw") {
        draw.init();
    }
    else if (location == "ping") {
        ping.init();
    }
});
