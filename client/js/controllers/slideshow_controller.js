"use strict";

const router = require("../router.js");
const api = require("../api.js");
const settings = require("../models/settings.js");
const uri = require("../util/uri.js");
const PostList = require("../models/post_list.js");
const topNavigation = require("../models/top_navigation.js");
const EmptyView = require("../views/empty_view.js");
const SlideshowView = require("../views/slideshow_view.js");

const fields = ["id", "type", "mimeType", "contentUrl"];

// posts are fetched lazily in pages of this size
const PAGE_SIZE = 50;
// fallback for how long an image stays on screen (in seconds) if the
// setting is invalid; videos advance when they end
const DEFAULT_SLIDE_DURATION = 5;

function getSlideDuration() {
    const seconds = parseFloat(settings.get().slideshowDuration);
    return (seconds > 0 ? seconds : DEFAULT_SLIDE_DURATION) * 1000;
}

class SlideshowController {
    constructor(ctx) {
        if (
            !api.hasPrivilege("posts:list") ||
            !api.hasPrivilege("posts:view")
        ) {
            this._view = new EmptyView();
            this._view.showError(
                "You don't have privileges to view the slideshow."
            );
            return;
        }

        topNavigation.activate("posts");
        topNavigation.setTitle("Slideshow");

        this._query = ctx.parameters.query || "";
        this._pages = new Map();
        this._total = null;
        // position in the playing order; _order maps it to a post index
        // (null means the same order as the post list)
        this._position = 0;
        this._order = null;
        this._paused = false;
        this._currentPost = null;
        this._mediaEnded = false;
        this._timeout = null;
        this._showRequest = 0;

        this._view = new SlideshowView();
        this._view.addEventListener("previous", () => this._step(-1));
        this._view.addEventListener("next", () => this._step(1));
        this._view.addEventListener("pause", () => this._togglePause());
        this._view.addEventListener("random", () => this._toggleRandom());
        this._view.addEventListener("exit", () => this._exit());
        this._view.addEventListener("mediaEnded", () => this._evtMediaEnded());
        this._view.addEventListener("close", () => this._stop());

        this._show();
    }

    _getPage(pageNumber) {
        if (!this._pages.has(pageNumber)) {
            const request = PostList.search(
                this._query,
                pageNumber * PAGE_SIZE,
                PAGE_SIZE,
                fields
            ).then(
                (response) => {
                    this._total = response.total;
                    return [...response.results];
                },
                (error) => {
                    this._pages.delete(pageNumber);
                    return Promise.reject(error);
                }
            );
            this._pages.set(pageNumber, request);
        }
        return this._pages.get(pageNumber);
    }

    _getPost(index) {
        return this._getPage(Math.floor(index / PAGE_SIZE)).then(
            (posts) => posts[index % PAGE_SIZE]
        );
    }

    _indexAt(position) {
        return this._order ? this._order[position] : position;
    }

    _show() {
        window.clearTimeout(this._timeout);
        const request = ++this._showRequest;
        this._getPost(this._indexAt(this._position)).then(
            (post) => {
                if (request !== this._showRequest) {
                    return;
                }
                if (!post) {
                    this._view.showMessage(
                        "No posts match this search." +
                            (this._query ? ` (${this._query})` : "")
                    );
                    return;
                }
                this._currentPost = post;
                this._mediaEnded = false;
                this._view.showPost(post);
                this._schedule();
                this._preload(this._position + 1);
            },
            (error) => {
                if (request === this._showRequest) {
                    this._view.showMessage(error.message);
                }
            }
        );
    }

    _schedule() {
        window.clearTimeout(this._timeout);
        if (this._paused || !this._currentPost) {
            return;
        }
        if (this._currentPost.type === "video") {
            return; // advanced by the "mediaEnded" event
        }
        this._timeout = window.setTimeout(
            () => this._step(1),
            getSlideDuration()
        );
    }

    _preload(position) {
        if (!this._total) {
            return;
        }
        this._getPost(this._indexAt(position % this._total)).then((post) => {
            if (post && post.type === "image") {
                new Image().src = post.contentUrl;
            }
        });
    }

    _step(delta) {
        if (!this._total) {
            return;
        }
        this._position =
            (this._position + delta + this._total) % this._total;
        this._show();
    }

    _evtMediaEnded() {
        this._mediaEnded = true;
        if (!this._paused) {
            this._step(1);
        }
    }

    _togglePause() {
        this._paused = !this._paused;
        this._view.setPaused(this._paused);
        if (!this._paused && this._mediaEnded) {
            // a video finished while paused
            this._step(1);
            return;
        }
        this._schedule();
    }

    _toggleRandom() {
        if (!this._total) {
            return;
        }
        const currentIndex = this._indexAt(this._position);
        if (this._order) {
            this._order = null;
            this._position = currentIndex;
        } else {
            // shuffle the remaining posts, keeping the current one first
            const order = [...Array(this._total).keys()].filter(
                (index) => index !== currentIndex
            );
            for (let i = order.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [order[i], order[j]] = [order[j], order[i]];
            }
            this._order = [currentIndex, ...order];
            this._position = 0;
        }
        this._view.setRandom(!!this._order);
        this._schedule();
        this._preload(this._position + 1);
    }

    _exit() {
        router.show(uri.formatClientLink("posts", { query: this._query }));
    }

    _stop() {
        window.clearTimeout(this._timeout);
        this._showRequest++;
    }
}

module.exports = (router) => {
    router.enter(["slides"], (ctx, next) => {
        ctx.controller = new SlideshowController(ctx);
    });
};
