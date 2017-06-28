"use strict";
import * as $ from "jquery";
import "bootstrap";
import * as draw from "./draw-main";
import * as ping from "./ping-main";

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