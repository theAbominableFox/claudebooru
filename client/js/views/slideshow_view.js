"use strict";

const events = require("../events.js");
const keyboard = require("../util/keyboard.js");
const settings = require("../models/settings.js");
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
        this._controlsNode
            .querySelector(".mute")
            .addEventListener("click", (e) => {
                e.stopPropagation();
                this._showControls();
                this._toggleMute();
            });
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
        keyboard.bind("m", (e) => {
            e.preventDefault();
            this._toggleMute();
        });
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
            node.muted = settings.get().slideshowMuteVideos;
            node.playsInline = true;
            node.addEventListener("ended", () =>
                this.dispatchEvent(new CustomEvent("mediaEnded"))
            );
            node.addEventListener("error", () =>
                this.dispatchEvent(new CustomEvent("mediaEnded"))
            );
            // also catches the browser forcing it muted, see below
            node.addEventListener("volumechange", () =>
                this._updateMuteButton()
            );
        } else if (post.type === "flash") {
            this.showMessage("Flash posts can't be shown in the slideshow.");
            views.emptyContent(this._stageNode);
            this._updateMuteButton();
            return;
        } else {
            node = document.createElement("img");
            node.alt = "";
        }
        node.src = post.contentUrl;
        views.replaceContent(this._stageNode, node);
        this._updateMuteButton();
        if (post.type === "video") {
            // browsers may refuse to autoplay with sound (e.g. when the
            // slideshow is opened directly by its URL), so play it muted then
            node.play()
                .catch(() => {
                    node.muted = true;
                    return node.play();
                })
                .catch(() => {}); // load errors are handled by "error"
        }
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

    get _videoNode() {
        return this._stageNode.querySelector("video");
    }

    // changes the setting too, so the following videos keep the choice
    _toggleMute() {
        const video = this._videoNode;
        if (!video) {
            return;
        }
        video.muted = !video.muted;
        settings.save({ slideshowMuteVideos: video.muted });
    }

    _updateMuteButton() {
        const node = this._controlsNode.querySelector(".mute");
        const video = this._videoNode;
        node.hidden = !video;
        const muted = video ? video.muted : false;
        node.querySelector("i").className =
            "fa " + (muted ? "fa-volume-off" : "fa-volume-up");
        node.title = muted ? "Unmute (M)" : "Mute (M)";
        node.setAttribute("aria-label", muted ? "Unmute" : "Mute");
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
