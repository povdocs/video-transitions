(function (window) {
	'use strict';

	/*
	Timing function for smoothly animated transitions.
	Linear timing is too abrupt at edges.
	*/
	function easeInOut(t) {
		if (t < 0.5) {
			return 0.5 * Math.pow(t * 2, 2);
		}

		return -0.5 * (Math.pow(Math.abs(t * 2 - 2), 2) - 2);
	}

	/*
	Keeps a function from running too frequently in case it's too slow.
	We use it for resizing, which takes too long to be run every time
	the event fires when the user is dragging to resize the window.
	*/
	function debounce(func, wait) {
		var timeout,
			lastRun = 0;

		return function() {
			var context = this, args = arguments;

			if (Date.now() - lastRun >= wait) {
				lastRun = Date.now();
				func.apply(context, args);
			} else {
				clearTimeout(timeout);
				timeout = setTimeout(function() {
					timeout = null;
					func.apply(context, args);
					lastRun = Date.now();
				}, wait);
			}
		};
	}

	var document = window.document,
		Seriously = window.Seriously,

		min = Math.min,
		abs = Math.abs,
		max = Math.max,

		formats = [
			'mp4',
			'webm'
		],
		videoSources = [
			'olympia',
			'danceforme',
			'koch'
		],
		videos = [],

		videoWidth = 1280,
		videoHeight = 720,

		seriously,
		target,

		resize,

		//state
		selectedIndex = -1,
		transition,
		activeTransition = 'flash',
		transitionStart = 0,
		previousVideo,
		nextVideo,
		playing = false,

		canvas = document.getElementById('canvas'),
		controls = document.getElementById('controls'),
		bigbutton = document.getElementById('bigbutton'),
		infobutton = document.getElementById('infobutton'),
		info = document.getElementById('info'),

		/*
		Each transition has its own callback functions:
		- init - set up the required effect nodes
		- start - attach the effect nodes to the video sources being transitioned
		- draw - runs every frame of the transition
		*/
		transitions = {
			whip: {
				title: 'Whip Pan',
				duration: 250,
				transformFrom: null,
				transformTo: null,
				blur: null,
				init: function () {
					var blur = seriously.effect('directionblur'),
						blend = seriously.effect('blend'),
						transformFrom = seriously.transform('2d'),
						transformTo = seriously.transform('2d');

					blend.bottom = transformFrom;
					blend.top = transformTo;
					blur.source = blend;

					this.transformFrom = transformFrom;
					this.transformTo = transformTo;
					this.blur = blur;
				},
				start: function (fromNode, toNode) {
					//todo: alternate direction of whip-pan
					this.transformFrom.source = fromNode;
					this.transformTo.source = toNode;

					return this.blur;
				},
				draw: function (amount) {
					//this.blur.amount = 1 - 2 * abs(amount - 0.5);
					amount = easeInOut(amount);
					this.transformFrom.translateX = this.transformFrom.width * amount;
					this.transformTo.translateX = -this.transformTo.width * (1 - amount);
					this.blur.amount = min(1, 1.2 * (1 - 2 * abs(amount - 0.5)) + 0.2);
				}
			},
			flash: {
				title: 'Flash',
				duration: 500,
				linear: null,
				blur: null,
				select: null,
				init: function () {
					var blur = seriously.effect('blur'),
						exposure = seriously.effect('exposure'),
						blend = seriously.effect('blend');

					blur.source = exposure;
					exposure.source = blend;

					this.blur = blur;
					this.exposure = exposure;
					this.blend = blend;
				},
				start: function (fromNode, toNode) {
					this.blend.bottom = fromNode;
					this.blend.top = toNode;
					this.blend.opacity = 0;

					return this.blur;
				},
				draw: function (amount) {
					this.blend.opacity = min(1, max(0, 1 - 8 * (0.5 - amount)));

					amount = 1 - 2 * abs(amount - 0.5);
					this.blur.amount = 0.8 * amount;
					this.exposure.exposure = 6 * amount;
				}
			},
			channel: {
				title: 'Channel Change',
				duration: 300,
				volume: false,
				tvProps: {
					distortion: [0.02, 0.2],
					lineSync: [0.03, 0.2],
					verticalSync: [0, 1],
					bars: [0.4, 0.6]
				},
				tvglitch: null,
				init: function () {
					var tvglitch = seriously.effect('tvglitch');

					tvglitch.distortion = 0.02;
					tvglitch.verticalSync = 0;
					tvglitch.scanlines = 0.22;
					tvglitch.lineSync = 0.03;
					tvglitch.frameSharpness = 10.67;
					tvglitch.frameLimit = 0.3644;
					tvglitch.bars = 0.4;

					this.tvglitch = tvglitch;
				},
				start: function (fromNode, toNode) {
					this.tvglitch.source = toNode;
					return this.tvglitch;
				},
				draw: function (amount) {
					var factor = 0,
						key,
						prop,
						tvProps = this.tvProps,
						tvglitch = this.tvglitch;

					factor = 1 - amount;
					factor = max(factor, 0);
					factor = min(factor, 1);
					factor = Math.pow(factor, 2);

					for (key in tvProps) {
						if (tvProps.hasOwnProperty(key)) {
							prop = tvProps[key];
							tvglitch[key] = prop[0] + factor * (prop[1] - prop[0]);
						}
					}

					tvglitch.time = Date.now();
				}
			}
		};

	function initSeriously() {
		var key;
		seriously = new Seriously();
		target = seriously.target(canvas);

		for (key in transitions) {
			if (transitions.hasOwnProperty(key)) {
				transitions[key].init();
			}
		}

		videos.forEach(function (obj) {
			var video = obj.element,
				reformat = seriously.transform('reformat');

			reformat.width = canvas.width;
			reformat.height = canvas.height;
			reformat.source = video;
			reformat.mode = 'cover';

			obj.reformat = reformat;
		});
	}

	function updateButtonState() {
		bigbutton.className = playing ? 'playing' : 'paused';
	}

	function play() {
		if (nextVideo) {
			nextVideo.play();
			playing = !nextVideo.paused;
		}
		updateButtonState();
	}

	function pause() {
		var i;
		playing = false;
		for (i = 0; i < videos.length; i++) {
			videos[i].element.pause();
		}
		updateButtonState();
	}

	function togglePlay() {
		if (playing) {
			pause();
		} else {
			play();
		}
	}

	function switchVideo(index) {
		if (!seriously || selectedIndex === index || index >= videos.length) {
			//no change, nothing to do here
			return;
		}

		if (selectedIndex >= 0) {
			transitionStart = Date.now();
			previousVideo = videos[selectedIndex].element;
			target.source = transition.start(videos[selectedIndex].reformat, videos[index].reformat);
		} else {
			target.source = videos[index].reformat;
		}

		selectedIndex = index;
		nextVideo = videos[selectedIndex].element;
		if (playing) {
			nextVideo.play();
		}
	}

	/*
	Runs repeatedly as long as the web page is visible, approximately every 16 milliseconds.
	Only does work while the transition is running, handles timing of the animation
	and volume cross-fade.
	*/
	function draw() {
		var progress;
		if (transitionStart) {
			progress = max(Date.now() - transitionStart, 0) / transition.duration;

			if (progress >= 1) {
				transitionStart = 0;
				target.source = videos[selectedIndex].reformat;
				if (previousVideo) {
					previousVideo.pause();
				}
			} else {
				if (transition.volume !== false) {
					if (previousVideo) {
						previousVideo.volume = min(1, max(0, 1 - progress));
					}
					nextVideo.volume = min(1, max(0, progress));
				} else {
					previousVideo.volume = 0;
					nextVideo.volume = 1;
				}

				transition.draw(progress);
			}
		}
	}

	function start() {
		var i;

		if (seriously) {
			return;
		}

		for (i = 0; i < videos.length; i++) {
			if (!videos[i].element.readyState) {
				return;
			}
		}

		initSeriously();
		resize();
		seriously.go(draw);
		switchVideo(0);
		play();
	}

	function loadVideos() {
		var i,
			format,
			type,
			vid,
			maxDim,
			size = 'hd';

		vid = document.createElement('video');

		/*
		Make our best guess about the appropriate video size
		*/
		maxDim = Math.max(screen.width, screen.height);
		if (window.matchMedia('handheld').matches || maxDim < 1280) {
			if (maxDim * (window.devicePixelRatio || 1) < 960) {
				size = 'small';
				videoWidth = 640;
				videoHeight = 360;
			} else {
				size = 'mid';
				videoWidth = 960;
				videoHeight = 540;
			}
		}

		for (i = 0; i < formats.length; i++) {
			type = 'video/' + formats[i];
			if (vid.canPlayType && vid.canPlayType(type)) {
				format = formats[i];
				break;
			}
		}

		if (!format) {
			//todo: display some kind of error
			console.log('Unable to play any video types');
			return;
		}

		videoSources.forEach(function (source, index) {
			var video = document.createElement('video'),
				button;

			video.type = type;
			video.src = 'video/' + source + '-' + size + '.' + format;
			video.crossOrigin = 'anonymous';
			video.preload = 'auto';
			video.id = 'video' + index;
			video.loop = true;
			video.controls = true; //for debugging

			/*
			Start every video at a random time. They all have a similar bumper at the
			beginning, so the transitions don't make for an effective demo if the videos
			all look the same.
			*/
			video.addEventListener('loadedmetadata', function () {
				video.currentTime = Math.random() * video.duration;
				start();
			}, false);
			video.load();

			document.body.appendChild(video);

			button = document.createElement('span');
			button.style.backgroundImage = 'url(images/' + source + '.jpg)';
			button.addEventListener('click', switchVideo.bind(null, index), false);
			controls.appendChild(button);

			videos.push({
				element: video,
				reformat: null
			});
		});

		updateButtonState();
	}

	/*
	Pause the video when this browser tab is in the background or minimized.
	Resume when it comes back in focus, but only if the user didn't pause manually.
	*/
	function visibilityChange() {
		if (document.hidden || document.mozHidden || document.msHidden || document.webkitHidden) {
			videos[selectedIndex].element.pause();
		} else if (playing) {
			videos[selectedIndex].element.play();
		}
	}

	resize = debounce(function () {
		var width = Math.min(videoWidth, window.innerWidth),
			height = Math.min(videoHeight, window.innerHeight);

		if (width / height < 16 / 9) {
			height = width * 9 / 16;
		}

		canvas.style.width = width + 'px';
		canvas.style.height = height + 'px';

		/*
		If it's a big enough screen and we have a retina display, let's take advantage.
		We assume that the GPU will be able to handle it
		*/
		if (window.screen.width * window.devicePixelRatio > videoWidth) {
			width *= window.devicePixelRatio;
			height *= window.devicePixelRatio;
		}

		canvas.width = width;
		canvas.height = height;

		videos.forEach(function (obj) {
			obj.reformat.width = width;
			obj.reformat.height = height;
		});
	}, 30, true);

	transition = transitions[activeTransition];
	loadVideos();

	Object.keys(transitions).forEach(function (t) {
		var button = document.getElementById(t);
		transitions[t].button = button;

		button.addEventListener('click', function () {
			transitions[activeTransition].button.className = '';
			activeTransition = t;
			transition = transitions[activeTransition];
			button.className = 'active';
		});
	});
	document.getElementById(activeTransition).className = 'active';

	document.addEventListener('visibilitychange', visibilityChange);
	document.addEventListener('mozvisibilitychange', visibilityChange);
	document.addEventListener('msvisibilitychange', visibilityChange);
	document.addEventListener('webkitvisibilitychange', visibilityChange);

	window.addEventListener('orientationchange', resize);
	window.addEventListener('resize', resize);

	canvas.addEventListener('click', togglePlay);
	bigbutton.addEventListener('click', togglePlay);

	/*
	User can press the space bar to toggle pause/play
	*/
	window.addEventListener('keyup', function(evt) {
		if (evt.which === 32) {
			togglePlay();
		}
	}, true);

	infobutton.addEventListener('click', function () {
		if (info.className) {
			info.className = '';
		} else {
			info.className = 'open';
		}
	});
}(this));