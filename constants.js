//TODO verify accuracy of and fix this comment
// Strips out whitespace before a line, I think
export const regStrip = /^[\r\t\f\v ]+|[\r\t\f\v ]+$/gm;

// The default values for each setting
export const tcDefaults = {
  keyBindings: [
    { action: "display", key: "v", value: 0, force: false, predefined: true },
    { action: "slower", key: "s", value: 0.25, force: false, predefined: true },
    { action: "faster", key: "d", value: 0.25, force: false, predefined: true },
    { action: "rewind", key: "z", value: 10, force: false, predefined: true },
    { action: "advance", key: "x", value: 10, force: false, predefined: true },
    { action: "reset", key: "r", value: 1, force: false, predefined: true },
    { action: "fast", key: "g", value: 2.5, force: false, predefined: true }
  ],
  blacklist: `\
www.instagram.com
twitter.com
imgur.com
teams.microsoft.com
`
};

export const settings = {
  // types are "b"oolean, "i"nt, "s"tring
  enabled: { type: "b", default: true, description: "Enable" },
  startHidden: {
    type: "b",
    default: false,
    description: "Hide controller by default"
  },
  rememberSpeed: {
    type: "b",
    default: false,
    description: "Remember playback speed"
  },
  enforceDefaultSpeed: {
    type: "b",
    default: false,
    description: "Enforce default speed"
  },
  affectAudio: { type: "b", default: false, description: "Work on Audio" },
  scrollDisabled: {
    type: "b",
    default: false,
    description: "Disable Ctrl+Shift+Scroll"
  },
  controllerOpacity: {
    type: "i",
    default: 0.3,
    description: "Controller Opacity"
  },
  controllerSize: {
    type: "i",
    default: 14,
    description: "Controller Size (px)"
  },
  defaultSpeed: { type: "i", default: 1.0, description: "Default speed" }
};

// https://stackoverflow.com/questions/14810506/map-function-for-objects-instead-of-arrays
export const objectMap = (obj, fn) =>
  Object.fromEntries(
    Object.entries(obj).map(
      ([k, v], i) => [k, fn(v, k, i)]
    )
  );

export const settings_defaults = objectMap(settings, (v) => v.default);
