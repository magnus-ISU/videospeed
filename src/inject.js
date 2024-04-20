// Sadly, this import statement is not possible so we duplicate the contents of constants.js
//import {regStrip, tcDefaults} from "./constants.js";
const regStrip = /^[\r\t\f\v ]+|[\r\t\f\v ]+$/gm

// Define this explicitely since it is more efficient
const settings_defaults = {
	enabled: true,
	startHidden: false,
	rememberSpeed: false,
	enforceDefaultSpeed: false,
	affectAudio: false,
	scrollDisabled: false,
	controllerOpacity: 0.3,
	controllerSize: 14,
	lastSpeed: 1.0,
	keybindings: [
		{ action: "display", key: "v", value: 0, force: false, predefined: true },
		{ action: "slower", key: "s", value: 0.25, force: false, predefined: true },
		{ action: "faster", key: "d", value: 0.25, force: false, predefined: true },
		{ action: "rewind", key: "z", value: 10, force: false, predefined: true },
		{ action: "advance", key: "x", value: 10, force: false, predefined: true },
		{ action: "reset", key: "r", value: 1, force: false, predefined: true },
		{ action: "fast", key: "g", value: 2.5, force: false, predefined: true }
	],
	blacklist: `\
teams.microsoft.com
hangouts.google.com
meet.google.com
`,
	customCSS: ""
}

//////////////////////// BEGIN INJECT.JS /////////////////////////
// Chromium max speed is 16: https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/html/media/html_media_element.cc?gsn=kMinRate&l=166
// Chromium min speed is 0.0625: https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/html/media/html_media_element.cc?gsn=kMinRate&l=165
const MAX_SPEED = 16.0
const MIN_SPEED = 0.07
const AUDIBLE_SPEED = 4.0
const SCROLL_MULTIPLIER = -0.001

const EVENT_IDENTIFIER = "videospeed"

var pageState = {
	// Holds speed for each source
	speeds: {},
	// Holds a reference to all of the AUDIO/VIDEO DOM elements we've attached to
	mediaElements: []
}
var cached_settings = settings_defaults

chrome.storage.onChanged.addListener((callback) => {
	Object.keys(callback).forEach((key) => {
		cached_settings[key] = callback[key].newValue
	})
})

chrome.storage.sync.get(cached_settings, (storage) => {
	cached_settings = storage
	initializeWhenReady(document)
})

function getKeyBindings(action, what = "value") {
	try {
		return cached_settings.keybindings.find((item) => item.action === action)[
			what
		]
	} catch (e) {
		return false
	}
}

function defineVideoController() {
	// Data structures
	// ---------------
	// videoController (JS object) instances:
	//	 video = AUDIO/VIDEO DOM element
	//	 parent = A/V DOM element's parentElement OR
	//						(A/V elements discovered from the Mutation Observer)
	//						A/V element's parentNode OR the node whose children changed.
	//	 div = Controller's DOM element (which happens to be a DIV)
	//	 speedIndicator = DOM element in the Controller of the speed indicator

	// added to AUDIO / VIDEO DOM elements
	//		vsc = reference to the videoController
	pageState.videoController = function (target, parent) {
		if (target.vsc) {
			return target.vsc
		}

		pageState.mediaElements.push(target)

		this.video = target
		this.parent = target.parentElement || parent
		storedSpeed = pageState.speeds[target.currentSrc]
		// If we don't have a stored speed, set the speed to our configured default speed
		if (!storedSpeed) {
			storedSpeed = cached_settings.rememberSpeed
				? cached_settings.lastSpeed
				: 1.0
		}
		// TODO setKeyBindings("reset", getKeyBindings("fast")); // resetSpeed = fastSpeed

		log("Explicitly setting playbackRate to: " + storedSpeed, 5)
		target.playbackRate = storedSpeed

		this.div = this.initializeControls()

		var mediaEventAction = function (event) {
			storedSpeed = pageState.speeds[event.target.currentSrc]
			if (!storedSpeed) {
				storedSpeed = cached_settings.rememberSpeed
					? cached_settings.lastSpeed
					: 1.0
			}
			// TODO setKeyBindings("reset", getKeyBindings("fast")); // resetSpeed = fastSpeed

			log("Explicitly setting playbackRate to: " + storedSpeed, 4)
			// TODO: Check if explicitly setting the playback rate to 1.0 is
			// necessary when rememberSpeed is disabled (this may accidentally
			// override a website's intentional initial speed setting,
			// interfering with the site's default behavior)
			// Magnus addendum: by checking if it is not 1, I think we resolve this problem; if teh user has a default speed, it is used, but if not, we leave the website alone
			if (storedSpeed != 1.0) {
				setSpeed(event.target, storedSpeed)
			}
		}

		target.addEventListener(
			"play",
			(this.handlePlay = mediaEventAction.bind(this))
		)

		target.addEventListener(
			"seeked",
			(this.handleSeek = mediaEventAction.bind(this))
		)

		var observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (
					mutation.type === "attributes" &&
					(mutation.attributeName === "src" ||
						mutation.attributeName === "currentSrc")
				) {
					log("mutation of A/V element", 5)
					let controller = this.div
					if (!mutation.target.src && !mutation.target.currentSrc) {
						controller.classList.add("vsc-nosource")
					} else {
						controller.classList.remove("vsc-nosource")
					}
				}
			})
		})
		observer.observe(target, {
			attributeFilter: ["src", "currentSrc"]
		})
	}

	pageState.videoController.prototype.remove = function () {
		this.div.remove()
		this.video.removeEventListener("play", this.handlePlay)
		this.video.removeEventListener("seek", this.handleSeek)
		delete this.video.vsc
		let idx = pageState.mediaElements.indexOf(this.video)
		if (idx != -1) {
			pageState.mediaElements.splice(idx, 1)
		}
	}

	pageState.videoController.prototype.initializeControls = function () {
		log("initializeControls Begin", 5)
		const document = this.video.ownerDocument
		const speed = this.video.playbackRate.toFixed(2)
		// TODO this works, but is different from chromium upstream, and seems it shouldn't work, so watch it
		const top = "0px",
			left = "0px"

		log("Speed variable set to: " + speed, 5)

		var wrapper = document.createElement("div")
		wrapper.classList.add("vsc-controller")

		if (!this.video.src && !this.video.currentSrc) {
			wrapper.classList.add("vsc-nosource")
		}

		if (cached_settings.startHidden) {
			wrapper.classList.add("vsc-hidden")
		}

		var shadow = wrapper.attachShadow({ mode: "open" })
		var shadowTemplate = `
				<style>
					@import "${chrome.runtime.getURL("shadow.css")}";
					${cached_settings.customCSS}
					* {
						font-size:${cached_settings.controllerSize}px;
					}
				</style>

				<div id="controller" style="top:${top}; left:${left}; opacity:${
					cached_settings.controllerOpacity
				};">
					<span data-action="drag" class="draggable">${speed}</span>
					<span id="controls">
						<button data-action="rewind" class="rw">«</button>
						<button data-action="slower">&minus;</button>
						<button data-action="faster">&plus;</button>
						<button data-action="advance" class="rw">»</button>
						<button data-action="display" class="hideButton">&times;</button>
					</span>
				</div>
			`
		shadow.innerHTML = shadowTemplate
		shadow.querySelector(".draggable").addEventListener(
			"mousedown",
			(e) => {
				runAction(e.target.dataset["action"], false, e)
				e.stopPropagation()
			},
			true
		)

		shadow.querySelectorAll("button").forEach(function (button) {
			button.addEventListener(
				"click",
				(e) => {
					runAction(
						e.target.dataset["action"],
						getKeyBindings(e.target.dataset["action"]),
						e
					)
					e.stopPropagation()
				},
				true
			)
		})

		shadow
			.querySelector("#controller")
			.addEventListener("click", (e) => e.stopPropagation(), false)
		shadow
			.querySelector("#controller")
			.addEventListener("mousedown", (e) => e.stopPropagation(), false)

		this.speedIndicator = shadow.querySelector("span")
		let fragment = document.createDocumentFragment()
		fragment.appendChild(wrapper)

		let p = this.parent
		// This seemed strange at first, but switching on true here allows matching regexes
		switch (true) {
			// Insert before parent to bypass overlay
			case location.hostname === "www.amazon.com":
			case /\.*.reddit.com/.test(location.hostname):
			case /hbogo\./.test(location.hostname):
			case location.hostname === "www.youtube.com":
			// insert after parent for correct stacking context
			case location.hostname === "tv.apple.com":
				p = p.parentElement
				break
			case location.hostname === "www.facebook.com":
				// This is a monstrosity but new FB design does not have *any*
				// semantic handles for us to traverse the tree, and deep nesting
				// that we need to bubble up from to get controller to stack correctly
				p =
					p.parentElement.parentElement.parentElement.parentElement
						.parentElement.parentElement.parentElement
				break
			case location.hostname === "www.netflix.com":
				p = p.parentElement.parentElement.parentElement
				break
			default:
			// Note: When triggered via a MutationRecord, it's possible that the
			// target is not the immediate parent. This appends the controller as
			// the first element of the target, which may not be the parent.
		}
		p.insertBefore(fragment, p.firstChild)
		return wrapper
	}
}

function escapeStringRegExp(str) {
	const matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g
	return str.replace(matchOperatorsRe, "\\$&")
}

function isBlacklisted() {
	var is_blacklisted = false
	cached_settings.blacklist.split("\n").forEach((match) => {
		if (is_blacklisted) {
			return
		}
		match = match.replace(regStrip, "")
		if (match.length == 0) {
			return
		}

		if (match.startsWith("/")) {
			try {
				let parts = match.split("/")
				let flags = ""
				var regex = match
				if (/\/(?!.*(.).*\1)[gimsuy]*$/.test(match)) {
					flags = parts.pop()
					regex = parts.slice(1).join("/")
				}
				regexp = new RegExp(regex, flags)
			} catch (err) {
				// happens if somehow a bad regex is supplied by user and not sanitized
				return
			}
		} else {
			var regexp = new RegExp(escapeStringRegExp(match))
		}

		if (regexp.test(location.href)) {
			is_blacklisted = true
		}
	})
	return is_blacklisted
}

function setupListener() {
	/**
	 * This function is called whenever a video speed rate change occurs.
	 * It's used to update the speed that shows up in the display as
	 * well as save that latest speed into local storage.
	 *
	 * @param {*} video = The video element for which to update the speed indicators
	 */
	function updateSpeedFromEvent(video) {
		// It's possible to get a rate change on a VIDEO/AUDIO that doesn't have
		// a video controller attached to it.	If we do, ignore it.
		if (!video.vsc) return
		let speedIndicator = video.vsc.speedIndicator
		var src = video.currentSrc
		var speed = Number(video.playbackRate.toFixed(2))

		log("Playback rate changed to " + speed, 4)

		log("Updating controller with new speed", 5)
		speedIndicator.textContent = speed.toFixed(2)
		pageState.speeds[src] = speed
		log("Storing lastSpeed in settings for the rememberSpeed feature", 5)
		if (cached_settings.rememberSpeed || cached_settings.forceVideospeed) {
			cached_settings.lastSpeed = speed
			log("Syncing chrome settings for lastSpeed", 5)
			chrome.storage.sync.set({ lastSpeed: speed }, function () {
				log("Speed setting saved: " + speed, 5)
			})
		}
		runAction("blink", null, null)
	}

	document.addEventListener(
		"ratechange",
		function (event) {
			let video = event.target

			/**
			 * If the last speed is forced, only update the speed based on events created by
			 * video speed instead of all video speed change events.
			 */
			if (cached_settings.forceVideospeed) {
				if (event.detail && event.detail.origin === EVENT_IDENTIFIER) {
					video.playbackRate = event.detail.speed
					updateSpeedFromEvent(video)
				} else {
					video.playbackRate = cached_settings.lastSpeed
				}
				event.stopImmediatePropagation()
			} else {
				updateSpeedFromEvent(video)
			}
		},
		true
	)
}

function initializeWhenReady(document) {
	log("Begin initializeWhenReady", 5)
	if (isBlacklisted()) {
		return
	}
	window.addEventListener("load", () => {
		initializeNow(window.document)
	})
	if (document) {
		if (document.readyState === "complete") {
			initializeNow(document)
		} else {
			document.onreadystatechange = () => {
				if (document.readyState === "complete") {
					initializeNow(document)
				}
			}
		}
	}
	log("End initializeWhenReady", 5)
}

function inIframe() {
	try {
		return window.self !== window.top
	} catch (e) {
		return true
	}
}

function getShadow(parent) {
	let result = []
	function getChild(parent) {
		if (parent.firstElementChild) {
			var child = parent.firstElementChild
			do {
				result.push(child)
				getChild(child)
				if (child.shadowRoot) {
					result.push(getShadow(child.shadowRoot))
				}
				child = child.nextElementSibling
			} while (child)
		}
	}
	getChild(parent)
	return result.flat(Infinity)
}

function initializeNow(document) {
	log("Begin initializeNow", 5)
	if (!cached_settings.enabled) return
	// enforce init-once due to redundant callers
	if (!document.body || document.body.classList.contains("vsc-initialized")) {
		return
	}
	try {
		setupListener()
	} catch {
		// no operation
		// TODO why?
	}
	document.body.classList.add("vsc-initialized")
	log("initializeNow: vsc-initialized added to document body", 5)

	if (document === window.document) {
		defineVideoController()
	} else {
		var link = document.createElement("link")
		link.href = chrome.runtime.getURL("inject.css")
		link.type = "text/css"
		link.rel = "stylesheet"
		document.head.appendChild(link)
	}
	var docs = Array(document)
	try {
		if (inIframe()) docs.push(window.top.document)
	} catch (e) {}

	docs.forEach((doc) => {
		doc.addEventListener(
			"keydown",
			(event) => {
				if (!cached_settings.enabled) return
				log("Processing keydown event: " + event.key, 6)

				// Ignore if following modifier is active
				if (
					!event.getModifierState ||
					event.getModifierState("Alt") ||
					event.getModifierState("Control") ||
					event.getModifierState("Fn") ||
					event.getModifierState("Meta") ||
					event.getModifierState("Hyper") ||
					event.getModifierState("OS")
				) {
					log("Keydown event ignored due to active modifier: " + event.key, 5)
					return
				}

				// Ignore keydown event if typing in an input box
				if (
					event.target.nodeName === "INPUT" ||
					event.target.nodeName === "TEXTAREA" ||
					event.target.isContentEditable
				) {
					return false
				}

				// Ignore keydown event if typing in a page without VSC
				if (!pageState.mediaElements.length) {
					return false
				}

				// TODO make keybindings a map so we can make this O(1)
				let item = cached_settings.keybindings.find(
					(item) => item.key === event.key
				)
				if (item) {
					runAction(item.action, item.value)
					if (item.force === "true") {
						// Disable websites key bindings
						event.preventDefault()
						event.stopPropagation()
					}
				}

				return false
			},
			true
		)

		if (!cached_settings.scrollDisabled) {
			doc.addEventListener(
				"wheel",
				(event) => {
					if (cached_settings.scrollDisabled) {
						return
					}
					if (!event.shiftKey) {
						return
					}
					event.preventDefault()
					event.stopPropagation()
					runAction("faster", event.deltaY * SCROLL_MULTIPLIER)
				},
				{ passive: false }
			)
		}
	})

	function checkForVideo(node, parent, added) {
		// Only proceed with supposed removal if node is missing from DOM
		if (!added && document.body?.contains(node)) {
			return
		}
		if (
			node.nodeName === "VIDEO" ||
			(cached_settings.affectAudio && node.nodeName === "AUDIO")
		) {
			if (added) {
				node.vsc = new pageState.videoController(node, parent)
			} else {
				if (node.vsc) {
					node.vsc.remove()
				}
			}
		} else if (node.children != undefined) {
			for (var i = 0; i < node.children.length; i++) {
				const child = node.children[i]
				checkForVideo(child, child.parentNode || parent, added)
			}
		}
	}

	var observer = new MutationObserver(function (mutations) {
		// Process the DOM nodes lazily
		requestIdleCallback(
			(_) => {
				mutations.forEach(function (mutation) {
					switch (mutation.type) {
						case "childList":
							mutation.addedNodes.forEach(function (node) {
								if (typeof node === "function") return
								if (node === document.documentElement) {
									// This happens on sites that use document.write, e.g. watch.sling.com
									// When the document gets replaced, we lose all event handlers, so we need to reinitialize
									log("Document was replaced, reinitializing", 5);
									initializeWhenReady(document);
									return;
								  }
								checkForVideo(node, node.parentNode || mutation.target, true)
							})
							mutation.removedNodes.forEach(function (node) {
								if (typeof node === "function") return
								checkForVideo(node, node.parentNode || mutation.target, false)
							})
							break
						case "attributes":
							if (
								mutation.target.attributes["aria-hidden"] &&
								mutation.target.attributes["aria-hidden"].value == "false"
							) {
								var flattenedNodes = getShadow(document.body)
								var node = flattenedNodes.filter((x) => x.tagName == "VIDEO")[0]
								if (node) {
									if (node.vsc) node.vsc.remove()
									checkForVideo(node, node.parentNode || mutation.target, true)
								}
							}
							break
					}
				})
			},
			{ timeout: 1000 }
		)
	})
	observer.observe(document, {
		attributeFilter: ["aria-hidden"],
		childList: true,
		subtree: true
	})

	let mediaTags = null
	if (cached_settings.affectAudio) {
		mediaTags = document.querySelectorAll("video,audio")
	} else {
		mediaTags = document.querySelectorAll("video")
	}

	mediaTags.forEach((video) => {
		video.vsc = new pageState.videoController(video)
	})

	var frameTags = document.getElementsByTagName("iframe")
	Array.prototype.forEach.call(frameTags, function (frame) {
		// Ignore frames we don't have permission to access (different origin)
		try {
			var childDocument = frame.contentDocument
		} catch (e) {
			return
		}
		initializeWhenReady(childDocument)
	})
	log("End initializeNow", 5)
}

var speed_locked = false
function addSpeed(v, speed_difference) {
	if (speed_locked) {
		return
	}
	log("Changing speed", 5)

	let orig_speed = v.playbackRate
	let new_speed = orig_speed + speed_difference

	// Skip range from 0 to MIN_SPEED
	if (0 < new_speed && new_speed < MIN_SPEED) {
		if (speed_difference > 0) {
			new_speed = MIN_SPEED
		} else {
			new_speed = 0
		}
	}

	// Clamp to MAX_SPEED
	new_speed = Math.min(new_speed, MAX_SPEED)

	// If speed ends up within 0.9 to 1.1, predict the user wants to set it to 1 and clamp to that. Then disable changing speed for a quarter-second.
	// But only if the user is moving towards 1
	if (new_speed < 1.0 && new_speed > 0.9) {
		if (speed_difference > 0) {
			lockSpeed()
			new_speed = 1.0
		}
	} else if (new_speed > 1.0 && new_speed < 1.1) {
		if (speed_difference < 0) {
			lockSpeed()
			new_speed = 1.0
		}
	} else if (new_speed < AUDIBLE_SPEED && new_speed > AUDIBLE_SPEED - 0.1) {
		// Same, but for speeds moving up to max audio (and not down from it)
		if (speed_difference > 0) {
			lockSpeed()
			new_speed = AUDIBLE_SPEED
		}
	}

	setSpeed(v, new_speed)
}
// Helper functions to run
function unlockSpeed() {
	speed_locked = false
}
function lockSpeed() {
	setTimeout(unlockSpeed, 250)
	speed_locked = true
}

function setSpeed(video, speed) {
	log("setSpeed started: " + speed, 5)
	var speedvalue = speed.toFixed(2)
	if (cached_settings.forceLastSavedSpeed) {
		video.dispatchEvent(
			new CustomEvent("ratechange", {
				detail: { origin: EVENT_IDENTIFIER, speed: speedvalue }
			})
		)
	} else {
		video.playbackRate = Number(speedvalue)
	}
	let speedIndicator = video.vsc.speedIndicator
	speedIndicator.textContent = speedvalue
	cached_settings.lastSpeed = speed
	log("setSpeed finished: " + speed, 5)
}

function runAction(action, value, e) {
	log("runAction Begin", 5)

	pageState.mediaElements.forEach(function (v) {
		const controller = v.vsc.div

		// Don't change video speed if the video has a different controller and e exists
		// Magnus says: I think this means it has a different iframe but not absolutely sure, and I think e means its from a button press but again unsure
		if (e && !(e.target.getRootNode().host == controller)) {
			return
		}

		showController(controller)

		// TODO Refactor action into a function pointer and just call the function
		if (!v.classList.contains("vsc-cancelled")) {
			if (action === "rewind") {
				log("Rewind", 5)
				v.currentTime -= value
			} else if (action === "advance") {
				log("Fast forward", 5)
				v.currentTime += value
			} else if (action === "faster") {
				console.log(v)
				addSpeed(v, value)
			} else if (action === "slower") {
				addSpeed(v, -value)
			} else if (action === "reset") {
				log("Reset speed", 5)
				resetSpeed(v, 1.0)
			} else if (action === "display") {
				log("Showing controller", 5)
				controller.classList.add("vsc-manual")
				controller.classList.toggle("vsc-hidden")
			} else if (action === "blink") {
				log("Showing controller momentarily", 5)
				// If VSC is hidden, show it briefly to give the user visual feedback that the action was excuted
				if (
					controller.classList.contains("vsc-hidden") ||
					controller.blinkTimeOut !== undefined
				) {
					clearTimeout(controller.blinkTimeOut)
					controller.classList.remove("vsc-hidden")
					controller.blinkTimeOut = setTimeout(
						() => {
							controller.classList.add("vsc-hidden")
							controller.blinkTimeOut = undefined
						},
						value ? value : 1000
					)
				}
			} else if (action === "drag") {
				handleDrag(v, e)
			} else if (action === "fast") {
				resetSpeed(v, value)
			} else if (action === "pause") {
				pause(v)
			} else if (action === "muted") {
				muted(v)
			} else if (action === "mark") {
				setMark(v)
			} else if (action === "jump") {
				jumpToMark(v)
			}
		}
	})
	log("runAction End", 5)
}

function pause(v) {
	if (v.paused) {
		log("Resuming video", 5)
		v.play()
	} else {
		log("Pausing video", 5)
		v.pause()
	}
}

var reset_speed
function resetSpeed(v, target) {
	if (v.playbackRate === target) {
		// Get the other value we will toggle to
		if (reset_speed === undefined) {
			reset_speed = getKeyBindings("fast")
		} else if (reset_speed === target) {
			reset_speed = getKeyBindings("fast")
		}
		// if we are still equal to the target, our cache was the fast speed, so set it to 1
		if (reset_speed === target) {
			reset_speed = 1.0
		}
		log("Toggling playback speed back to " + reset_speed, 4)
		setSpeed(v, reset_speed)
		reset_speed = target
	} else {
		log('Toggling playback speed to "reset" speed', 4)
		reset_speed = v.playbackRate
		setSpeed(v, target)
	}
}

function muted(v) {
	v.muted = v.muted !== true
}

function setMark(v) {
	log("Adding marker", 5)
	v.vsc.mark = v.currentTime
}

function jumpToMark(v) {
	log("Recalling marker", 5)
	if (v.vsc.mark && typeof v.vsc.mark === "number") {
		v.currentTime = v.vsc.mark
	}
}

function handleDrag(video, e) {
	const controller = video.vsc.div
	const shadowController = controller.shadowRoot.querySelector("#controller")

	// Find nearest parent of same size as video parent
	var parentElement = controller.parentElement
	while (
		parentElement.parentNode &&
		parentElement.parentNode.offsetHeight === parentElement.offsetHeight &&
		parentElement.parentNode.offsetWidth === parentElement.offsetWidth
	) {
		parentElement = parentElement.parentNode
	}

	video.classList.add("vcs-dragging")
	shadowController.classList.add("dragging")

	const initialMouseXY = [e.clientX, e.clientY]
	const initialControllerXY = [
		parseInt(shadowController.style.left),
		parseInt(shadowController.style.top)
	]

	const startDragging = (e) => {
		let style = shadowController.style
		let dx = e.clientX - initialMouseXY[0]
		let dy = e.clientY - initialMouseXY[1]
		style.left = initialControllerXY[0] + dx + "px"
		style.top = initialControllerXY[1] + dy + "px"
	}

	const stopDragging = () => {
		parentElement.removeEventListener("mousemove", startDragging)
		parentElement.removeEventListener("mouseup", stopDragging)
		parentElement.removeEventListener("mouseleave", stopDragging)

		shadowController.classList.remove("dragging")
		video.classList.remove("vcs-dragging")
	}

	parentElement.addEventListener("mouseup", stopDragging)
	parentElement.addEventListener("mouseleave", stopDragging)
	parentElement.addEventListener("mousemove", startDragging)
}

var timer = null
function showController(controller) {
	log("Showing controller", 4)
	controller.classList.add("vcs-show")

	if (timer) clearTimeout(timer)

	timer = setTimeout(function () {
		controller.classList.remove("vcs-show")
		timer = false
		log("Hiding controller", 5)
	}, 2000)
}

/* Log levels (depends on caller specifying the correct level)
	2 - error
	3 - warning
	4 - info
	5 - debug
	6 - debug high verbosity + stack trace on each message
*/
function log(message, level) {
	return
	let to_print = ""
	switch (level) {
		case 2:
			to_print = "ERROR: "
			break
		case 3:
			to_print = "WARNING: "
			break
		case 4:
			to_print = "INFO: "
			break
		case 5:
			to_print = "DEBUG: "
			break
		case 6:
			to_print = "VERBOSE DEBUG: "
			console.trace()
			break
		default:
			console.log(
				"ALERT: Please report on GitHub how you got this to VideoSpeed"
			)
			console.trace()
	}
	console.log(to_print + message)
}
