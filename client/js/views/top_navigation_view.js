"use strict";

const views = require("../util/views.js");
const theme = require("../util/theme.js");

const template = views.getTemplate("top-navigation");

class TopNavigationView {
    constructor() {
        this._hostNode = document.getElementById("top-navigation-holder");

        // bound once here since render() replaces the nav on login/logout
        document.addEventListener("click", (e) => {
            for (let menuNode of this._menuNodes) {
                if (!menuNode.contains(e.target)) {
                    this._toggleMenu(menuNode, false);
                }
            }
        });
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                this._closeMenus();
            }
        });
    }

    get _menuNodes() {
        return this._hostNode.querySelectorAll("li.menu");
    }

    get _themeMenuNode() {
        return this._hostNode.querySelector("li.theme-menu");
    }

    get _mobileNavigationToggleNode() {
        return this._hostNode.querySelector("#mobile-navigation-toggle");
    }

    get _navigationListNode() {
        return this._hostNode.querySelector("nav > ul");
    }

    get _navigationLinkNodes() {
        return this._navigationListNode.querySelectorAll("li > a");
    }

    render(ctx) {
        views.replaceContent(this._hostNode, template(ctx));

        this._bindMobileNavigationEvents();
        this._bindMenuEvents();
        this._bindThemeEvents();
        this._syncThemeOptions();
    }

    activate(key) {
        for (let itemNode of this._hostNode.querySelectorAll("[data-name]")) {
            itemNode.classList.toggle(
                "active",
                itemNode.getAttribute("data-name") === key
            );
        }
        for (let menuNode of this._menuNodes) {
            menuNode
                .querySelector(".menu-toggle")
                .classList.toggle(
                    "active",
                    !!menuNode.querySelector("li.active")
                );
        }
    }

    _toggleMenu(menuNode, open) {
        menuNode.classList.toggle("opened", open);
        menuNode
            .querySelector(".menu-toggle")
            .setAttribute("aria-expanded", menuNode.classList.contains("opened"));
    }

    _closeMenus() {
        for (let menuNode of this._menuNodes) {
            this._toggleMenu(menuNode, false);
        }
    }

    _bindMenuEvents() {
        for (let menuNode of this._menuNodes) {
            menuNode
                .querySelector(".menu-toggle")
                .addEventListener("click", (e) => {
                    for (let otherNode of this._menuNodes) {
                        if (otherNode !== menuNode) {
                            this._toggleMenu(otherNode, false);
                        }
                    }
                    this._toggleMenu(menuNode);
                });
        }
    }

    _bindThemeEvents() {
        const themeMenuNode = this._themeMenuNode;
        if (!themeMenuNode) {
            return;
        }
        for (let node of themeMenuNode.querySelectorAll(".theme-mode")) {
            node.addEventListener("click", (e) => {
                theme.setDarkTheme(node.getAttribute("data-dark-theme") === "1");
                this._syncThemeOptions();
            });
        }
        for (let node of themeMenuNode.querySelectorAll(".accent-color")) {
            node.addEventListener("click", (e) => {
                theme.setAccentColor(node.getAttribute("data-color"));
                this._syncThemeOptions();
            });
        }
        const customColorNode = themeMenuNode.querySelector(
            ".accent-custom input"
        );
        customColorNode.addEventListener("input", (e) => {
            theme.setAccentColor(customColorNode.value, false);
        });
        customColorNode.addEventListener("change", (e) => {
            theme.setAccentColor(customColorNode.value);
            this._syncThemeOptions();
        });
    }

    _syncThemeOptions() {
        const themeMenuNode = this._themeMenuNode;
        if (!themeMenuNode) {
            return;
        }
        const darkTheme = theme.isDarkTheme();
        for (let node of themeMenuNode.querySelectorAll(".theme-mode")) {
            const selected =
                (node.getAttribute("data-dark-theme") === "1") === darkTheme;
            node.classList.toggle("selected", selected);
            node.setAttribute("aria-pressed", selected);
        }
        const accentColor = theme.getAccentColor().toLowerCase();
        let isPreset = false;
        for (let node of themeMenuNode.querySelectorAll(".accent-color")) {
            const selected =
                node.getAttribute("data-color").toLowerCase() === accentColor;
            isPreset = isPreset || selected;
            node.classList.toggle("selected", selected);
            node.setAttribute("aria-pressed", selected);
        }
        const customNode = themeMenuNode.querySelector(".accent-custom");
        customNode.classList.toggle("selected", !isPreset);
        customNode.querySelector("input").value = accentColor;
    }

    _bindMobileNavigationEvents() {
        this._mobileNavigationToggleNode.addEventListener("click", (e) =>
            this._mobileNavigationToggleClick(e)
        );

        for (let navigationLinkNode of this._navigationLinkNodes) {
            navigationLinkNode.addEventListener("click", (e) =>
                this._navigationLinkClick(e)
            );
        }
    }

    _mobileNavigationToggleClick(e) {
        this._navigationListNode.classList.toggle("opened");
    }

    _navigationLinkClick(e) {
        this._navigationListNode.classList.remove("opened");
        this._closeMenus();
    }
}

module.exports = TopNavigationView;
