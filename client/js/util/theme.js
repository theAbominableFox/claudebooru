"use strict";

const settings = require("../models/settings.js");

// keep in sync with $default-main-color in css/colors.styl
const defaultAccentColor = "#24AADD";

const accentColors = [
    { name: "Blue", value: defaultAccentColor },
    { name: "Purple", value: "#8E5BD9" },
    { name: "Pink", value: "#E0569B" },
    { name: "Red", value: "#E05555" },
    { name: "Orange", value: "#EE8A2E" },
    { name: "Green", value: "#3DB46D" },
    { name: "Teal", value: "#1FA9A0" },
    { name: "Slate", value: "#6B7A8F" },
];

function getAccentColor() {
    return settings.get().accentColor || defaultAccentColor;
}

function isDarkTheme() {
    return !!settings.get().darkTheme;
}

function apply() {
    const accentColor = getAccentColor();
    document.body.classList.toggle("darktheme", isDarkTheme());
    document.documentElement.style.setProperty("--accent-color", accentColor);
    const themeColorNode = document.querySelector("meta[name=theme-color]");
    if (themeColorNode) {
        themeColorNode.setAttribute("content", accentColor);
    }
}

function setDarkTheme(darkTheme) {
    settings.save({ darkTheme: darkTheme }, true);
    apply();
}

// pass save=false for live previews (e.g. while dragging a color picker)
function setAccentColor(accentColor, save) {
    if (save === false) {
        document.documentElement.style.setProperty(
            "--accent-color",
            accentColor
        );
        return;
    }
    settings.save({ accentColor: accentColor }, true);
    apply();
}

module.exports = {
    accentColors: accentColors,
    getAccentColor: getAccentColor,
    isDarkTheme: isDarkTheme,
    apply: apply,
    setDarkTheme: setDarkTheme,
    setAccentColor: setAccentColor,
};
