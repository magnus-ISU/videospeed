//TODO verify accuracy of and fix this comment
// Strips out whitespace before a line, I think
export const regStrip = /^[\r\t\f\v ]+|[\r\t\f\v ]+$/gm;

// The default values for each setting
export const tcDefaults = {
  // The default speed videos should play with
  speed: 1.0,
  //TODO is this value used? I don't see why it should be needed, can probably be refactored out?
  displayKey: "v",
  rememberSpeed: false,
  audioBoolean: false,
  startHidden: false,
  forceLastSavedSpeed: false,
  enabled: true,
  controllerOpacity: 0.3,
  controllerSize: "13px",
  keyBindings: [
    { action: "display", key: "v", value: 0, force: false, predefined: true },
    { action: "slower", key: "d", value: 0.25, force: false, predefined: true },
    { action: "faster", key: "e", value: 0.25, force: false, predefined: true },
    { action: "rewind", key: "s", value: 10, force: false, predefined: true },
    { action: "advance", key: "f", value: 10, force: false, predefined: true },
    { action: "reset", key: "q", value: 1, force: false, predefined: true },
    { action: "fast", key: "a", value: 2.5, force: false, predefined: true }
  ],
  blacklist: `\
www.instagram.com
twitter.com
imgur.com
teams.microsoft.com
`
};
