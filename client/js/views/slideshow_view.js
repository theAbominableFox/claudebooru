"use strict";

const events = require("../events.js");
const keyboard = require("../util/keyboard.js");
const views = require("../util/views.js");

const template = views.getTemplate("slideshow");

// how long the controls stay visible after the last click on them
const CONTROLS_HIDE_DELAY = 4000;

class SlideshowView extends events.EventTarget {
    constructor() {
        super();

        this._hostNode = document.getElementById("content-holder");
        views.replaceContent(this._hostNode, template());
        this._hideControlsTimeout = null;

        document.body.classList.add("slideshow-active");

        for (let name of ["previous", "next", "pause", "random", "exit"]) {
            this._controlsNode
                .querySelector("." + name)
                .addEventListener("click", (e) => {
                    e.stopPropagation();
                    this._showControls();
                    this.dispatchEvent(new CustomEvent(name));
                });
        }
        this._controlsNode.addEventListener("click", (e) =>
            e.stopPropagation()
        );
        this._slideshowNode.addEventListener("click", (e) =>
            this._toggleControls()
        );

        const bindKey = (key, name) =>
            keyboard.bind(key, (e) => {
                e.preventDefault();
                this.dispatchEvent(new CustomEvent(name));
            });
        bindKey("left", "previous");
        bindKey("right", "next");
        bindKey("space", "pause");
        bindKey("r", "random");
        bindKey("esc", "exit");

        // the view lives in #content-holder, so the next page replaces it
        views.monitorNodeRemoval(this._slideshowNode, () => {
            document.body.classList.remove("slideshow-active");
            window.clearTimeout(this._hideControlsTimeout);
            this.dispatchEvent(new CustomEvent("close"));
        });
    }

    get _slideshowNode() {
        return this._hostNode.querySelector(".slideshow");
    }

    get _stageNode() {
        return this._hostNode.querySelector(".slideshow-stage");
    }

    get _messageNode() {
        return this._hostNode.querySelector(".slideshow-message");
    }

    get _controlsNode() {
        return this._hostNode.querySelector(".slideshow-controls");
    }

    showPost(post) {
        this._messageNode.textContent = "";
        let node;
        if (post.type === "video") {
            node = document.createElement("video");
            node.autoplay = true;
            node.muted = true;
            node.playsInline = true;
            node.addEventListener("ended", () =>
                this.dispatchEvent(new CustomEvent("mediaEnded"))
            );
            node.addEventListener("error", () =>
                this.dispatchEvent(new CustomEvent("mediaEnded"))
            );
        } else if (post.type === "flash") {
            this.showMessage("Flash posts can't be shown in the slideshow.");
            views.emptyContent(this._stageNode);
            return;
        } else {
            node = document.createElement("img");
            node.alt = "";
        }
        node.src = post.contentUrl;
        views.replaceContent(this._stageNode, node);
    }

    showMessage(text) {
        this._messageNode.textContent = text;
    }

    setPaused(paused) {
        const node = this._controlsNode.querySelector(".pause");
        node.querySelector("i").className =
            "fa " + (paused ? "fa-play" : "fa-pause");
        node.title = paused ? "Play (Space)" : "Pause (Space)";
        node.setAttribute("aria-label", paused ? "Play" : "Pause");
    }

    setRandom(random) {
        const node = this._controlsNode.querySelector(".random");
        node.classList.toggle("active", random);
        node.setAttribute("aria-pressed", random);
    }

    _showControls() {
        this._controlsNode.classList.add("shown");
        window.clearTimeout(this._hideControlsTimeout);
        this._hideControlsTimeout = window.setTimeout(
            () => this._controlsNode.classList.remove("shown"),
            CONTROLS_HIDE_DELAY
        );
    }

    _toggleControls() {
        if (this._controlsNode.classList.contains("shown")) {
            window.clearTimeout(this._hideControlsTimeout);
            this._controlsNode.classList.remove("shown");
        } else {
            this._showControls();
        }
    }
}

module.exports = SlideshowView;
