## Info

This is a fork of [CodeBicycle's fork](https://github.com/codebicycle/videospeed) of the [Chromium upstream](https://github.com/igrigorik/videospeed).

This fork is available on AMO here: https://addons.mozilla.org/firefox/addon/videospeed-magnus-fork/

The major difference (as of 28 December 2021) is that CodeBicycle lags behind the chromium version, while this repository has some PRs for the chromium version and the following further changes:
 - Patches to the settings UI which gives it a better dark theme
 - Breaking changes to the settings menu which allow for more fine-grained handling of keyboard input
 - Some fixes for specific websites such as netflix, reddit, and youtube
 - Shift+Mousewheel speeds up or slows down playback
 - (Some) settings can be changed without reloading a page, notably keybindings

Because I have seen how backwards compatability left crusty code in the original versions for multiple years while I rewrote large sections of it, I will make no promises about this extension working between versions. Clicking 'Restore Defaults' may be (but probably will not be) required on every update, so I can iterate more quickly and correctly.

## FAQ:

**A website doesn't work!**

Open an issue here *with a link to a URL that has some odd behavior*.

Websites known to have problems:
 - [Soundcloud](https://github.com/codebicycle/videospeed/issues/163)
 - [Regular](https://github.com/codebicycle/videospeed/issues/155) `mp4`s opened with `file:///` links

**There's no audio above 4x speed!**

This used to be quite annoying indeed. [This was a bug in firefox itself, not the extension](https://bugzilla.mozilla.org/show_bug.cgi?id=1630569). However, the bug is resolved! Now audio plays up to 8x speed (where it is intelligible chatter anyway). So if you still aren't hearing anything, please verify your version of Firefox is up to date.

Previously shift+scrollwheel would pause briefly at 4x speed because audio would stop above that. Since I find it extremely difficult to understand anything faster anyway, I believe this is still good default behavior. If anyone else disagrees, please open an issue; it can be turned into a configuration option if someone really wants it.

# The science of accelerated playback

**TL;DR: faster playback translates to better engagement and retention.**

Average adult reads prose text at
[250 to 300 words per minute](http://www.paperbecause.com/PIOP/files/f7/f7bb6bc5-2c4a-466f-9ae7-b483a2c0dca4.pdf)
(wpm). By contrast, the average rate of speech for English speakers is ~150 wpm,
with slide presentations often closer to 100 wpm. As a result, when given the
choice, many viewers
[speed up video playback to ~1.3\~1.5 its recorded rate](http://research.microsoft.com/en-us/um/redmond/groups/coet/compression/chi99/paper.pdf)
to compensate for the difference.

Many viewers report that
[accelerated viewing keeps their attention longer](http://www.enounce.com/docs/BYUPaper020319.pdf):
faster delivery keeps the viewer more engaged with the content. In fact, with a
little training many end up watching videos at 2x+ the recorded speed. Some
studies report that after being exposed to accelerated playback,
[listeners become uncomfortable](http://alumni.media.mit.edu/~barons/html/avios92.html#beasleyalteredspeech)
if they are forced to return to normal rate of presentation.

## Faster HTML5 Video

HTML5 video provides a native API to accelerate playback of any video. The
problem is, many players either hide, or limit this functionality. For best
results playback speed adjustments should be easy and frequent to match the pace
and content being covered: we don't read at a fixed speed, and similarly, we
need an easy way to accelerate the video, slow it down, and quickly rewind the
last point to listen to it a few more times.

![Player](https://cloud.githubusercontent.com/assets/2400185/24076745/5723e6ae-0c41-11e7-820c-1d8e814a2888.png)

#### *Install [Chrome](https://chrome.google.com/webstore/detail/video-speed-controller/nffaoalbilbmmfgbnbgppjihopabppdk) or [Firefox](https://addons.mozilla.org/en-us/firefox/addon/videospeed/) Extension*

\*\* Once the extension is installed simply navigate to any page that offers
HTML5 video ([example](http://www.youtube.com/watch?v=E9FxNzv1Tr8)), and you'll
see a speed indicator in top left corner. Hover over the indicator to reveal the
controls to accelerate, slowdown, and quickly rewind or advance the video. Or,
even better, simply use your keyboard:

- **S** - decrease playback speed.
- **D** - increase playback speed.
- **R** - reset playback speed to 1.0x.
- **Z** - rewind video by 10 seconds.
- **X** - advance video by 10 seconds.
- **G** - toggle between current and user configurable preferred speed.
- **V** - show/hide the controller.

You can customize and reassign the default shortcut keys in the extensions
settings page, as well as add additional shortcut keys to match your
preferences. For example, you can assign multiple different "preferred speed"
shortcuts with different values, which will allow you to quickly toggle between
your most commonly used speeds. To add a new shortcut, open extension settings
and click "Add New".

![settings Add New shortcut](https://user-images.githubusercontent.com/121805/50726471-50242200-1172-11e9-902f-0e5958387617.jpg)

Some sites may assign other functionality to one of the assigned shortcut keys —
these collisions are inevitable, unfortunately. As a workaround, the extension
listens both for lower and upper case values (i.e. you can use
`Shift-<shortcut>`) if there is other functionality assigned to the lowercase
key. This is not a perfect solution, as some sites may listen to both, but works
most of the time.

### License

(MIT License) - Copyright (c) 2014 Ilya Grigorik
