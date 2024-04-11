//TODO verify accuracy of and fix this comment
// Strips out whitespace before a line, I think
export const regStrip = /^[\r\t\f\v ]+|[\r\t\f\v ]+$/gm;

export const settings = {
	// types we can easily add are "b"oolean, "i"nt, "s"tring, "d"ummy
	// type, default are the only required fields
	// If either html or description is defined, will have an entry inserted into options.html
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
	forceVideospeed: {
		type: "b",
		default: false,
		description: "Don't allow websites to change video speed"
	},
	affectAudio: { type: "b", default: false, description: "Work on Audio" },
	scrollDisabled: {
		type: "b",
		default: false,
		description: "Disable Shift+Scroll to change speed"
	},
	allow0x: {
		type: "b",
		default: false,
		description: "Allow 0.00x speed"
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
	lastSpeed: { type: "d", default: 1.0 },
	keybindings: {
		type: "keybindings",
		default: [
			{ action: "display", key: "v", value: 0, force: false, predefined: true },
			{ action: "slower", key: "s", value: 0.25, force: false, predefined: true },
			{ action: "faster", key: "d", value: 0.25, force: false, predefined: true },
			{ action: "rewind", key: "z", value: 10, force: false, predefined: true },
			{ action: "advance", key: "x", value: 10, force: false, predefined: true },
			{ action: "reset", key: "r", value: 1, force: false, predefined: true },
			{ action: "fast", key: "g", value: 2.5, force: false, predefined: true }
		]
	},
	blacklist: {
		type: "s",
		default: `\
teams.microsoft.com
hangouts.google.com
meet.google.com
`,
		html: `\
<label for="blacklist"
	>Sites on which extension is disabled<br />
	(one per line)<br />
	<br />
	<em>
		<a href="https://www.regexpal.com/">Regex</a> is supported.<br />
		Be sure to use the literal notation.<br />
		e.g. /(.+)youtube\\.com(\\/.*)$/gi
	</em>
</label>
<textarea
	id="blacklist"
	rows="10"
	cols="50"
	spellcheck="false"
></textarea>
`
	},
	customCSS: {
		type: "s",
		default: "",
		html: `\
<label for="customCSS"
	>Custom CSS to style the controller<br />
</label>
<textarea
	id="customCSS"
	rows="10"
	cols="50"
	spellcheck="false"
></textarea>
`
	}
};

// https://stackoverflow.com/questions/14810506/map-function-for-objects-instead-of-arrays
export const objectMap = (obj, fn) =>
	Object.fromEntries(Object.entries(obj).map(([k, v], i) => [k, fn(v, k, i)]));

export const settings_defaults = objectMap(settings, (v) => v.default);
