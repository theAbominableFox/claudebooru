"use strict";

const misc = require("../util/misc.js");
const views = require("../util/views.js");

const template = views.getTemplate("tags-page");

class TagsPageView {
    constructor(ctx) {
        views.replaceContent(
            ctx.hostNode,
            template(
                Object.assign({}, ctx, {
                    escapeSearchTerm: misc.escapeSearchTerm,
                })
            )
        );
    }
}

module.exports = TagsPageView;
