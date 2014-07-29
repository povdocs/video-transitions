# WebGL Video Transitions

This is an example of using [Seriously.js](http://github.com/brianchirls/Seriously.js) to generate real-time transition effects between two different video clips.

## Technology and Browser Support
This demo requires certain web technologies that may not be available on all browsers

- HTML Video - Processing a video image with a canvas requires loading the video directly in a `<video>` element, not as an iframe or via Flash. This is available in all modern browsers browsers.
- WebGL - A Javascript API for directly accessing graphics hardware. Available on both mobile and desktop platforms in Firefox (4+), Chrome (9+), Internet Explorer (11+) and Opera (12+). WebGL is not available in iOS and is available but disabled in desktop Safari, but it is available in both as of version 8, which is in beta release now.
- WebGL video textures - This is a feature of WebGL that is technically available in all browsers that support it, but both [Internet Explorer](https://connect.microsoft.com/IE/feedback/details/927217/webgl-video-texture-support-is-broken-possible-regression) and [Chrome for Android](https://code.google.com/p/chromium/issues/detail?id=358198) have bugs that broke the feature and will prevent this demo from running. It is unknown when these bugs will be fixed.
- Mobile video - Mobile Safari [does not allow multiple videos to play](https://developer.apple.com/library/safari/documentation/AudioVideo/Conceptual/Using_HTML5_Audio_Video/Device-SpecificConsiderations/Device-SpecificConsiderations.html#//apple_ref/doc/uid/TP40009523-CH5-SW10). It is unknown whether this will be changed when WebGL becomes available in version 8.


## License
- Original code is made avalable under [MIT License](http://www.opensource.org/licenses/mit-license.php), Copyright (c) 2014 American Documentary Inc.
- [Seriously.js](https://github.com/brianchirls/Seriously.js/#license) is distributed here under license from from its author

## Authors
- Code, concept and design by [Brian Chirls](https://github.com/brianchirls), [POV](http://www.pbs.org/pov/) Digital Technology Fellow
- Trailer from <em>[Koch](http://www.pbs.org/pov/koch/)</em> by Neil Barsky
- Trailer from <em>[Dance for Me](http://www.pbs.org/pov/danceforme/)</em> by Katrine Philp
- Trailer from <em>[My Way to Olympia](http://www.pbs.org/pov/olympia/)</em> by Niko von Glasow
