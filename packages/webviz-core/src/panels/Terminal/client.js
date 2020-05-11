"use strict";

var _xterm = require("xterm");

var _xtermAddonAttach = require("xterm-addon-attach");

var _xtermAddonFit = require("xterm-addon-fit");

var _xtermAddonSearch = require("xterm-addon-search");

var _xtermAddonSerialize = require("xterm-addon-serialize");

var _xtermAddonWebLinks = require("xterm-addon-web-links");

var _xtermAddonWebgl = require("xterm-addon-webgl");

var _xtermAddonUnicode = require("xterm-addon-unicode11");

let term;
let protocol;
let socketURL;
let socket;
let pid;
const addons = {
  attach: {
    name: "attach",
    ctor: _xtermAddonAttach.AttachAddon,
    canChange: false,
  },
  fit: {
    name: "fit",
    ctor: _xtermAddonFit.FitAddon,
    canChange: false,
  },
  search: {
    name: "search",
    ctor: _xtermAddonSearch.SearchAddon,
    canChange: true,
  },
  serialize: {
    name: "serialize",
    ctor: _xtermAddonSerialize.SerializeAddon,
    canChange: true,
  },
  "web-links": {
    name: "web-links",
    ctor: _xtermAddonWebLinks.WebLinksAddon,
    canChange: true,
  },
  webgl: {
    name: "webgl",
    ctor: _xtermAddonWebgl.WebglAddon,
    canChange: true,
  },
  unicode11: {
    name: "unicode11",
    ctor: _xtermAddonUnicode.Unicode11Addon,
    canChange: true,
  },
};

const terminalContainer = document.getElementById("terminal-container");
const actionElements = {
  findNext: document.querySelector("#find-next"),
  findPrevious: document.querySelector("#find-previous"),
};
const paddingElement = document.getElementById("padding");

function setPadding() {
  term.element.style.padding = parseInt(paddingElement.value, 10).toString() + "px";
  term.fit();
}

function getSearchOptions(e) {
  return {
    regex: document.getElementById("regex").checked,
    wholeWord: document.getElementById("whole-word").checked,
    caseSensitive: document.getElementById("case-sensitive").checked,
    incremental: e.key !== `Enter`,
  };
}

const disposeRecreateButtonHandler = () => {
  // If the terminal exists dispose of it, otherwise recreate it
  if (term) {
    term.dispose();
    term = null;
    window.term = null;
    socket = null;
    addons.attach.instance = undefined;
    addons.fit.instance = undefined;
    addons.search.instance = undefined;
    addons.serialize.instance = undefined;
    addons.unicode11.instance = undefined;
    addons["web-links"].instance = undefined;
    addons.webgl.instance = undefined;
    document.getElementById("dispose").innerHTML = "Recreate Terminal";
  } else {
    createTerminal();
    document.getElementById("dispose").innerHTML = "Dispose terminal";
  }
};

createTerminal();
document.getElementById("dispose").addEventListener("click", disposeRecreateButtonHandler);
document.getElementById("serialize").addEventListener("click", serializeButtonHandler);

function createTerminal() {
  // Clean terminal
  while (terminalContainer.children.length) {
    terminalContainer.removeChild(terminalContainer.children[0]);
  }

  const isWindows = ["Windows", "Win16", "Win32", "WinCE"].indexOf(navigator.platform) >= 0;
  term = new _xterm.Terminal({
    windowsMode: isWindows,
  }); // Load addons

  const typedTerm = term;
  addons.search.instance = new _xtermAddonSearch.SearchAddon();
  addons.serialize.instance = new _xtermAddonSerialize.SerializeAddon();
  addons.fit.instance = new _xtermAddonFit.FitAddon();
  addons.unicode11.instance = new _xtermAddonUnicode.Unicode11Addon(); // TODO: Remove arguments when link provider API is the default

  addons["web-links"].instance = new _xtermAddonWebLinks.WebLinksAddon(undefined, undefined, true);
  typedTerm.loadAddon(addons.fit.instance);
  typedTerm.loadAddon(addons.search.instance);
  typedTerm.loadAddon(addons.serialize.instance);
  typedTerm.loadAddon(addons.unicode11.instance);
  typedTerm.loadAddon(addons["web-links"].instance);
  window.term = term; // Expose `term` to window for debugging purposes

  term.onResize((size) => {
    if (!pid) {
      return;
    }

    const cols = size.cols;
    const rows = size.rows;
    const url = "/terminals/" + pid + "/size?cols=" + cols + "&rows=" + rows;
    fetch(url, {
      method: "POST",
    });
  });
  protocol = location.protocol === "https:" ? "wss://" : "ws://";
  socketURL = protocol + location.hostname + (location.port ? ":" + location.port : "") + "/terminals/";
  term.open(terminalContainer);
  addons.fit.instance.fit();
  term.focus();
  addDomListener(paddingElement, "change", setPadding);
  addDomListener(actionElements.findNext, "keyup", (e) => {
    addons.search.instance.findNext(actionElements.findNext.value, getSearchOptions(e));
  });
  addDomListener(actionElements.findPrevious, "keyup", (e) => {
    addons.search.instance.findPrevious(actionElements.findPrevious.value, getSearchOptions(e));
  }); // fit is called within a setTimeout, cols and rows need this.

  setTimeout(() => {
    initOptions(term); // TODO: Clean this up, opt-cols/rows doesn't exist anymore

    document.getElementById(`opt-cols`).value = term.cols;
    document.getElementById(`opt-rows`).value = term.rows;
    paddingElement.value = "0"; // Set terminal size again to set the specific dimensions on the demo

    updateTerminalSize();
    fetch("/terminals?cols=" + term.cols + "&rows=" + term.rows, {
      method: "POST",
    }).then((res) => {
      res.text().then((processId) => {
        pid = processId;
        socketURL += processId;
        socket = new WebSocket(socketURL);
        socket.onopen = runRealTerminal;
        socket.onclose = runFakeTerminal;
        socket.onerror = runFakeTerminal;
      });
    });
  }, 0);
}

function runRealTerminal() {
  addons.attach.instance = new _xtermAddonAttach.AttachAddon(socket);
  term.loadAddon(addons.attach.instance);
  term._initialized = true;
  initAddons(term);
}

function runFakeTerminal() {
  if (term._initialized) {
    return;
  }

  term._initialized = true;
  initAddons(term);

  term.prompt = () => {
    term.write("\r\n$ ");
  };

  term.writeln("Welcome to xterm.js");
  term.writeln("This is a local terminal emulation, without a real terminal in the back-end.");
  term.writeln("Type some keys and commands to play around.");
  term.writeln("");
  term.prompt();
  term.onKey((e) => {
    const ev = e.domEvent;
    const printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;

    if (ev.keyCode === 13) {
      term.prompt();
    } else if (ev.keyCode === 8) {
      // Do not delete the prompt
      if (term._core.buffer.x > 2) {
        term.write("\b \b");
      }
    } else if (printable) {
      term.write(e.key);
    }
  });
}

function initOptions(term) {
  const blacklistedOptions = [
    // Internal only options
    "cancelEvents",
    "convertEol",
    "termName", // Complex option
    "theme",
    "windowOptions",
  ];
  const stringOptions = {
    bellSound: null,
    bellStyle: ["none", "sound"],
    cursorStyle: ["block", "underline", "bar"],
    fastScrollModifier: ["alt", "ctrl", "shift", undefined],
    fontFamily: null,
    fontWeight: ["normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900"],
    fontWeightBold: ["normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900"],
    logLevel: ["debug", "info", "warn", "error", "off"],
    rendererType: ["dom", "canvas"],
    wordSeparator: null,
  };
  const options = Object.keys(term._core.options);
  const booleanOptions = [];
  const numberOptions = [];
  options
    .filter((o) => blacklistedOptions.indexOf(o) === -1)
    .forEach((o) => {
      switch (typeof term.getOption(o)) {
        case "boolean":
          booleanOptions.push(o);
          break;

        case "number":
          numberOptions.push(o);
          break;

        default:
          if (Object.keys(stringOptions).indexOf(o) === -1) {
            console.warn(`Unrecognized option: "${o}"`);
          }
      }
    });
  let html = "";
  html += '<div class="option-group">';
  booleanOptions.forEach((o) => {
    html += `<div class="option"><label><input id="opt-${o}" type="checkbox" ${
      term.getOption(o) ? "checked" : ""
    }/> ${o}</label></div>`;
  });
  html += '</div><div class="option-group">';
  numberOptions.forEach((o) => {
    html += `<div class="option"><label>${o} <input id="opt-${o}" type="number" value="${term.getOption(o)}" step="${
      o === "lineHeight" || o === "scrollSensitivity" ? "0.1" : "1"
    }"/></label></div>`;
  });
  html += '</div><div class="option-group">';
  Object.keys(stringOptions).forEach((o) => {
    if (stringOptions[o]) {
      html += `<div class="option"><label>${o} <select id="opt-${o}">${stringOptions[o]
        .map((v) => `<option ${term.getOption(o) === v ? "selected" : ""}>${v}</option>`)
        .join("")}</select></label></div>`;
    } else {
      html += `<div class="option"><label>${o} <input id="opt-${o}" type="text" value="${term.getOption(
        o
      )}"/></label></div>`;
    }
  });
  html += "</div>";
  const container = document.getElementById("options-container");
  container.innerHTML = html; // Attach listeners

  booleanOptions.forEach((o) => {
    const input = document.getElementById(`opt-${o}`);
    addDomListener(input, "change", () => {
      console.log("change", o, input.checked);
      term.setOption(o, input.checked);
    });
  });
  numberOptions.forEach((o) => {
    const input = document.getElementById(`opt-${o}`);
    addDomListener(input, "change", () => {
      console.log("change", o, input.value);

      if (o === "cols" || o === "rows") {
        updateTerminalSize();
      } else if (o === "lineHeight" || o === "scrollSensitivity") {
        term.setOption(o, parseFloat(input.value));
        updateTerminalSize();
      } else {
        term.setOption(o, parseInt(input.value));
      }
    });
  });
  Object.keys(stringOptions).forEach((o) => {
    const input = document.getElementById(`opt-${o}`);
    addDomListener(input, "change", () => {
      console.log("change", o, input.value);
      term.setOption(o, input.value);
    });
  });
}

function initAddons(term) {
  const fragment = document.createDocumentFragment();
  Object.keys(addons).forEach((name) => {
    const addon = addons[name];
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !!addon.instance;

    if (!addon.canChange) {
      checkbox.disabled = true;
    }

    addDomListener(checkbox, "change", () => {
      if (checkbox.checked) {
        addon.instance = new addon.ctor();
        term.loadAddon(addon.instance);

        if (name === "webgl") {
          setTimeout(() => {
            document.body.appendChild(addon.instance.textureAtlas);
          }, 0);
        }
      } else {
        if (name === "webgl") {
          document.body.removeChild(addon.instance.textureAtlas);
        }

        addon.instance.dispose();
        addon.instance = undefined;
      }
    });
    const label = document.createElement("label");
    label.classList.add("addon");

    if (!addon.canChange) {
      label.title = "This addon is needed for the demo to operate";
    }

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(name));
    const wrapper = document.createElement("div");
    wrapper.classList.add("addon");
    wrapper.appendChild(label);
    fragment.appendChild(wrapper);
  });
  const container = document.getElementById("addons-container");
  container.innerHTML = "";
  container.appendChild(fragment);
}

function addDomListener(element, type, handler) {
  element.addEventListener(type, handler);

  term._core.register({
    dispose: () => element.removeEventListener(type, handler),
  });
}

function updateTerminalSize() {
  const cols = parseInt(document.getElementById(`opt-cols`).value, 10);
  const rows = parseInt(document.getElementById(`opt-rows`).value, 10);
  const width =
    (cols * term._core._renderService.dimensions.actualCellWidth + term._core.viewport.scrollBarWidth).toString() +
    "px";
  const height = (rows * term._core._renderService.dimensions.actualCellHeight).toString() + "px";
  terminalContainer.style.width = width;
  terminalContainer.style.height = height;
  addons.fit.instance.fit();
}

function serializeButtonHandler() {
  const output = addons.serialize.instance.serialize();
  const outputString = JSON.stringify(output);
  document.getElementById("serialize-output").innerText = outputString;

  if (document.getElementById("write-to-terminal").checked) {
    term.reset();
    term.write(output);
  }
}
