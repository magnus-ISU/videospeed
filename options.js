import {
  regStrip,
  settings,
  settings_defaults,
  objectMap
} from "./constants.js";

var keyBindings = [];

function recordKeyPress(e) {
  if (
    (e.keyCode >= 48 && e.keyCode <= 57) || // Numbers 0-9
    (e.keyCode >= 65 && e.keyCode <= 90) || // Letters A-Z
    keyCodeAliases[e.keyCode] // Other character keys
  ) {
    e.target.value = getKeyCodeName(e);
    e.target.key = e.key;
    e.target.keyCode = e.keyCode;

    e.preventDefault();
    e.stopPropagation();
  } else if (e.keyCode === 8) {
    // Clear input when backspace pressed, but keep the keycode the same
    e.target.value = "";
  } else if (e.keyCode === 27) {
    // When esc clicked, clear input and unbind the key
    e.target.value = "null";
    e.target.key = null;
    e.target.keyCode = null;
  }
}

function inputFilterNumbersOnly(e) {
  var chr = e.key;
  if (!/[\d\.]$/.test(chr) || !/^\d+(\.\d*)?$/.test(e.target.value + chr)) {
    e.preventDefault();
    e.stopPropagation();
  }
}

function inputFocus(e) {
  e.target.value = "";
}

function inputBlur(e) {
  e.target.value = getKeyCodeName(e);
}

function updateCustomShortcutInputText(inputItem, key) {
  inputItem.value = key;
  inputItem.key = key;
}

// List of custom actions for which there is no numeric argument
const customActionsNoValues = ["pause", "muted", "mark", "jump", "display"];

function add_shortcut() {
  const html = `<select class="customDo">
    <option value="slower">Decrease speed</option>
    <option value="faster">Increase speed</option>
    <option value="rewind">Rewind</option>
    <option value="advance">Advance</option>
    <option value="reset">Reset speed</option>
    <option value="fast">Preferred speed</option>
    <option value="muted">Mute</option>
    <option value="pause">Pause</option>
    <option value="mark">Set marker</option>
    <option value="jump">Jump to marker</option>
    <option value="display">Show/hide controller</option>
    </select>
    <input class="customKey" type="text" placeholder="press a key"/>
    <input class="customValue" type="text" placeholder="value (0.10)"/>
    <select class="customForce">
    <option value="false">Do not disable website key bindings</option>
    <option value="true">Disable website key bindings</option>
    </select>
    <button class="removeParent">X</button>`;
  var div = document.createElement("div");
  div.setAttribute("class", "row customs");
  div.innerHTML = html;
  var customs_element = document.getElementById("customs");
  customs_element.insertBefore(
    div,
    customs_element.children[customs_element.childElementCount - 1]
  );
}

// Takes in a div of a keybinding in the options document and returns a object with its info
function createKeyBindings(item) {
  const action = item.querySelector(".customDo").value;
  const key = item.querySelector(".customKey").key;
  const value = Number(item.querySelector(".customValue").value);
  const force = item.querySelector(".customForce").value;
  const predefined = !!item.id; //item.id ? true : false;

  return {
    action: action,
    key: key,
    value: value,
    force: force,
    predefined: predefined
  };
}

// Validates blacklist before saving
// TODO this function is hot garbage
function validate_blacklist() {
  let status = document.getElementById("status");
  document
    .getElementById("blacklist")
    .value.split("\n")
    .forEach((match) => {
      match = match.replace(regStrip, "");
      if (match.startsWith("/")) {
        try {
          var regexp = new RegExp(match);
        } catch (err) {
          status.textContent =
            "Error: Invalid blacklist regex: " + match + ". Unable to save";
          return false;
        }
      }
    });
  return true;
}

// Saves options to chrome.storage
function save_options() {
  if (!validate_blacklist()) {
    return;
  }

  let settings_values = objectMap(settings, (v, k) => {
    if (v.type === "b") {
      return document.getElementById(k).checked;
    } else if (v.type === "i") {
      return Number.parseFloat(document.getElementById(k).value);
    } else if (v.type === "s") {
      return document.getElementById(k).value;
    } else if (v.type === "d") {
      return v.default;
    } else if (v.type === "keybindings") {
      let arr = [];
      Array.from(document.querySelectorAll(".customs")).forEach((item) =>
        arr.push(createKeyBindings(item))
      );
      return arr;
    }
  });
  chrome.storage.sync.set(settings_values, () => updateStatus("Options saved"));
}

// Takes values from chrome.storage and inserts them into the document
function restore_options() {
  chrome.storage.sync.get(settings_defaults, (storage) => {
    Object.keys(storage).forEach((key) => {
      if (settings[key].type === "b") {
        document.getElementById(key).checked = storage[key];
      } else if (settings[key].type === "s" || settings[key].type === "i") {
        document.getElementById(key).value = storage[key];
      } else if (settings[key].type === "keybindings") {
        for (let item of storage[key]) {
          // do predefined ones because their value needed for overlay
          // TODO the comment implies there is a reason to seperate this functionality but I don't see it, investigate later
          if (item.predefined) {
            if (customActionsNoValues.includes(item["action"]))
              document.querySelector(
                "#" + item["action"] + " .customValue"
              ).disabled = true;

            updateCustomShortcutInputText(
              document.querySelector("#" + item["action"] + " .customKey"),
              item["key"]
            );
            document.querySelector("#" + item["action"] + " .customValue").value =
              item["value"];
            document.querySelector("#" + item["action"] + " .customForce").value =
              item["force"];
          } else {
            // new ones
            add_shortcut();
            const dom = document.querySelector(".customs:last-of-type");
            dom.querySelector(".customDo").value = item["action"];

            if (customActionsNoValues.includes(item["action"]))
              dom.querySelector(".customValue").disabled = true;

            updateCustomShortcutInputText(
              dom.querySelector(".customKey"),
              item["key"]
            );
            dom.querySelector(".customValue").value = item["value"];
            dom.querySelector(".customForce").value = item["force"];
          }
        }
      }
      });
  });
}

function restore_defaults() {
  chrome.storage.sync.clear();
  chrome.storage.sync.set(
    settings_defaults,
    () => {
      restore_options();
      // Remove buttons for non-default keybinds
      document
        .querySelectorAll(".removeParent")
        .forEach((button) => button.click());
      updateStatus("Default options restored");
    }
  );
}

function show_experimental() {
  document
    .querySelectorAll(".customForce")
    .forEach((item) => (item.style.display = "inline-block"));
}

function addSettingsToDOM() {
  Object.keys(settings).forEach(addSettingToDOM);
}
function addSettingToDOM(s) {
  if (settings[s].html) {
    document.getElementById("settings").innerHTML += settings[s].html;
  } else if (settings[s].description) {
    document.getElementById("settings").innerHTML += `\
<div class="row">
  <label for="${s}">${settings[s].description}</label>
  <input id="${s}" type="${settings[s].type === "b" ? "checkbox" : "text"}" />
</div>
`;
  }
}

document.addEventListener("DOMContentLoaded", function () {
  addSettingsToDOM();
  restore_options();

  document.getElementById("save").addEventListener("click", save_options);
  document.getElementById("add").addEventListener("click", add_shortcut);
  document
    .getElementById("restore")
    .addEventListener("click", restore_defaults);
  /*
  document
    .getElementById("experimental")
    .addEventListener("click", show_experimental);
  */

  function eventCaller(event, className, funcName) {
    if (
      !event.target.classList ||
      !event.target.classList.contains(className)
    ) {
      return;
    }
    funcName(event);
  }

  document.addEventListener("keypress", (event) => {
    eventCaller(event, "customValue", inputFilterNumbersOnly);
  });
  document.addEventListener("focus", (event) => {
    eventCaller(event, "customKey", inputFocus);
  });
  document.addEventListener("blur", (event) => {
    eventCaller(event, "customKey", inputBlur);
  });
  document.addEventListener("keydown", (event) => {
    eventCaller(event, "customKey", recordKeyPress);
  });
  document.addEventListener("click", (event) => {
    eventCaller(event, "removeParent", function () {
      event.target.parentNode.remove();
    });
  });
  document.addEventListener("change", (event) => {
    eventCaller(event, "customDo", function () {
      if (customActionsNoValues.includes(event.target.value)) {
        event.target.nextElementSibling.nextElementSibling.disabled = true;
        event.target.nextElementSibling.nextElementSibling.value = 0;
      } else {
        event.target.nextElementSibling.nextElementSibling.disabled = false;
      }
    });
  });
});

function getKeyCodeName(e) {
  // Letters A-Z may be capital or lowercase
  if (e.keyCode >= 65 && e.keyCode <= 90) {
    return e.key;
  }
  return keyCodeAliases[e.keyCode] || String.fromCharCode(e.keyCode);
}

function updateStatus(message) {
  // Update status to let user know something
  let status = document.getElementById("status");
  status.textContent = message;
  // Has a race condition, but I don't care
  setTimeout(function () {
    status.textContent = "";
  }, 2500);
}

// May be a prettier name than e.key
const keyCodeAliases = {
  0: "null",
  null: "null",
  undefined: "null",
  32: "Space",
  37: "Left",
  38: "Up",
  39: "Right",
  40: "Down",
  96: "Num 0",
  97: "Num 1",
  98: "Num 2",
  99: "Num 3",
  100: "Num 4",
  101: "Num 5",
  102: "Num 6",
  103: "Num 7",
  104: "Num 8",
  105: "Num 9",
  106: "Num *",
  107: "Num +",
  109: "Num -",
  110: "Num .",
  111: "Num /",
  112: "F1",
  113: "F2",
  114: "F3",
  115: "F4",
  116: "F5",
  117: "F6",
  118: "F7",
  119: "F8",
  120: "F9",
  121: "F10",
  122: "F11",
  123: "F12",
  186: ";",
  188: "<",
  189: "-",
  187: "+",
  190: ">",
  191: "/",
  192: "~",
  219: "[",
  220: "\\",
  221: "]",
  222: "'",
  59: ";",
  61: "+",
  173: "-"
};
