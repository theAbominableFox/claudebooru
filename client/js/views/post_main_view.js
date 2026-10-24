"use strict";

const iosCorrectedInnerHeight = require("ios-inner-height");
const router = require("../router.js");
const views = require("../util/views.js");
const uri = require("../util/uri.js");
const keyboard = require("../util/keyboard.js");
const Touch = require("../util/touch.js");
const PostContentControl = require("../controls/post_content_control.js");
const PostNotesOverlayControl = require("../controls/post_notes_overlay_control.js");
const PostReadonlySidebarControl = require("../controls/post_readonly_sidebar_control.js");
const PostEditSidebarControl = require("../controls/post_edit_sidebar_control.js");
const CommentControl = require("../controls/comment_control.js");
const CommentListControl = require("../controls/comment_list_control.js");

const template = views.getTemplate("post-main");

class PostMainView {
    constructor(ctx) {
        this._hostNode = document.getElementById("content-holder");

        const sourceNode = template(ctx);
        const postContainerNode = sourceNode.querySelector(".post-container");
        views.replaceContent(this._hostNode, sourceNode);
        views.syncScrollPosition();

        const topNavigationNode =
            document.body.querySelector("#top-navigation");

        this._postContentControl = new PostContentControl(
            postContainerNode,
            ctx.post,
            () => {
                const postContainerRect =
                    postContainerNode.getBoundingClientRect();
                const margin = postContainerNode
                    .closest(".post-view")
                    .getBoundingClientRect().left;

                return [
                    window.innerWidth - postContainerRect.left - margin,
                    iosCorrectedInnerHeight() -
                        topNavigationNode.getBoundingClientRect().height -
                        margin * 2 -
                        this._getButtonRowHeight(postContainerRect),
                ];
            }
        );

        this._postNotesOverlayControl = new PostNotesOverlayControl(
            postContainerNode.querySelector(".post-overlay"),
            ctx.post
        );

        if (ctx.post.type === "video" || ctx.post.type === "flash") {
            this._postContentControl.disableOverlay();
        }

        this._installSidebar(ctx);
        // the details row only exists now, so fit the post again
        this._postContentControl.refit();
        this._installCommentForm();
        this._installComments(ctx.post.comments);

        const showPreviousImage = () => {
            if (ctx.prevPostId) {
                if (ctx.editMode) {
                    router.show(
                        ctx.getPostEditUrl(ctx.prevPostId, ctx.parameters)
                    );
                } else {
                    router.show(
                        ctx.getPostUrl(ctx.prevPostId, ctx.parameters)
                    );
                }
            }
        };

        const showNextImage = () => {
            if (ctx.nextPostId) {
                if (ctx.editMode) {
                    router.show(
                        ctx.getPostEditUrl(ctx.nextPostId, ctx.parameters)
                    );
                } else {
                    router.show(
                        ctx.getPostUrl(ctx.nextPostId, ctx.parameters)
                    );
                }
            }
        };

        keyboard.bind("e", () => {
            if (ctx.editMode) {
                router.show(uri.formatClientLink("post", ctx.post.id));
            } else {
                router.show(uri.formatClientLink("post", ctx.post.id, "edit"));
            }
        });
        keyboard.bind(["a", "left"], showPreviousImage);
        keyboard.bind(["d", "right"], showNextImage);
        keyboard.bind("del", (e) => {
            if (ctx.editMode) {
                this.sidebarControl._evtDeleteClick(e);
            }
        });

        new Touch(
            postContainerNode,
            () => {
                if (!ctx.editMode) {
                    showPreviousImage();
                }
            },
            () => {
                if (!ctx.editMode) {
                    showNextImage();
                }
            }
        );
    }

    // Height of the row below the post that should stay on screen: the
    // buttons, plus the details when they sit beside them (wide screens).
    // Zero when the buttons sit beside the post (edit mode).
    _getButtonRowHeight(postContainerRect) {
        const buttonsRect = this._hostNode
            .querySelector(".post-view nav.buttons")
            .getBoundingClientRect();
        if (buttonsRect.right <= postContainerRect.left) {
            return 0;
        }
        const detailsNode = this._hostNode.querySelector(
            ".readonly-sidebar > .details"
        );
        let bottom = buttonsRect.bottom;
        if (detailsNode) {
            const detailsRect = detailsNode.getBoundingClientRect();
            if (detailsRect.top < buttonsRect.bottom) {
                bottom = Math.max(bottom, detailsRect.bottom);
            }
        }
        return bottom - postContainerRect.bottom;
    }

    _installSidebar(ctx) {
        const sidebarContainerNode = document.querySelector(
            "#content-holder .sidebar-container"
        );

        if (ctx.editMode) {
            this.sidebarControl = new PostEditSidebarControl(
                sidebarContainerNode,
                ctx.post,
                this._postContentControl,
                this._postNotesOverlayControl
            );
        } else {
            this.sidebarControl = new PostReadonlySidebarControl(
                sidebarContainerNode,
                ctx.post,
                this._postContentControl
            );
        }
    }

    _installCommentForm() {
        const commentFormContainer = document.querySelector(
            "#content-holder .comment-form-container"
        );
        if (!commentFormContainer) {
            return;
        }

        this.commentControl = new CommentControl(
            commentFormContainer,
            null,
            true
        );

        const toggleNode = document.querySelector(
            "#content-holder .add-comment-toggle"
        );
        toggleNode.addEventListener("click", (e) => {
            this.toggleCommentForm();
            if (this._commentFormShown) {
                commentFormContainer.querySelector("textarea").focus();
            }
        });
    }

    get _commentFormShown() {
        const node = document.querySelector("#content-holder .post-comments");
        return !!node && node.classList.contains("adding-comment");
    }

    // the new comment form is folded away behind the "Add comment" button
    toggleCommentForm(show) {
        const node = document.querySelector("#content-holder .post-comments");
        const toggleNode = node.querySelector(".add-comment-toggle");
        if (!toggleNode) {
            return;
        }
        node.classList.toggle("adding-comment", show);
        const shown = node.classList.contains("adding-comment");
        toggleNode.setAttribute("aria-expanded", shown);
        toggleNode.querySelector("i").className =
            "fa " + (shown ? "fa-minus" : "fa-plus");
    }

    _installComments(comments) {
        const commentsContainerNode = document.querySelector(
            "#content-holder .comments-container"
        );
        if (!commentsContainerNode) {
            return;
        }

        this.commentListControl = new CommentListControl(
            commentsContainerNode,
            comments
        );
    }
}

module.exports = PostMainView;
