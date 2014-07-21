(function (window) {
	'use strict';

	function easeInOut(t) {
		if (t < 0.5) {
			return 0.5 * Math.pow(t * 2, 2);
		}

		return -0.5 * (Math.pow(Math.abs(t * 2 - 2), 2) - 2);
	}

	var document = window.document,
		Seriously = window.Seriously,

		formats = [
			//'mp4',
			'webm'
		],
		videoSources = [
			'olympia',
			'danceforme',
			'koch'
		],
		videos = [],

		seriously,
		target,

		//state
		selectedIndex = -1,
		transition,
		activeTransition = 'whip',
		transitionStart = 0,
		previousVideo,
		nextVideo,

		canvas = document.getElementById('canvas'),
		controls = document.getElementById('controls'),

		transitions = {
			whip: {
				title: 'Whip Pan',
				duration: 200,
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
					amount = easeInOut(amount);
					this.transformFrom.translateX = this.transformFrom.width * amount;
					this.transformTo.translateX = -this.transformTo.width * (1 - amount);
					this.blur.amount = 4 - Math.abs(amount - 0.5) * 6;
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

					blur.source = blend;
					exposure.source = blur;

					this.blur = blur;
					this.exposure = exposure;
					this.blend = blend;
				},
				start: function (fromNode, toNode) {
					this.blend.bottom = fromNode;
					this.blend.top = toNode;
					this.blend.opacity = 0;

					return this.exposure;
				},
				draw: function (amount) {
					this.blend.opacity = Math.min(1, Math.max(0, 1 - 8 * (0.5 - amount)));

					amount = 1 - 2 * Math.abs(amount - 0.5);
					this.blur.amount = 0.8 * amount;
					this.exposure.exposure = 4 * amount;
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
					factor = Math.max(factor, 0);
					factor = Math.min(factor, 1);
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
	}

	function switchVideo(index) {
		if (selectedIndex === index || index >= videos.length) {
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
		nextVideo.play();
	}

	function loadVideos() {
		var i,
			format,
			type,
			vid;

		vid = document.createElement('video');

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

		initSeriously();

		videoSources.forEach(function (source, index) {
			var video = document.createElement('video'),
				reformat = seriously.transform('reformat'),
				button;

			video.type = type;
			video.src = 'http://localhost:8888/video-transitions/video/' + source + '-hd.' + format + '#t=20,';
			video.crossOrigin = 'anonymous';
			video.preload = 'auto';
			video.id = 'video' + index;
			video.loop = true;
			video.controls = true; //for debugging

			//debug?
			video.onloadedmetadata = function () {
				video.currentTime = Math.random() * video.duration;
			};

			reformat.width = canvas.width;
			reformat.height = canvas.height;
			reformat.source = video;
			reformat.mode = 'cover';

			document.body.appendChild(video);

			button = document.createElement('button'); //todo: use a span or img
			button.appendChild(document.createTextNode(source)); //todo: pick a real name or image
			button.addEventListener('click', switchVideo.bind(null, index), false);
			controls.appendChild(button);

			videos.push({
				element: video,
				reformat: reformat
			});
		});
	}

	function visibilityChange() {
		if (document.hidden || document.mozHidden || document.msHidden || document.webkitHidden) {
			videos[selectedIndex].element.pause();
		} else {
			videos[selectedIndex].element.play();
		}
	}

	transition = transitions[activeTransition];
	loadVideos();
	seriously.go(function () {
		var progress;
		if (transitionStart) {
			progress = Math.max(Date.now() - transitionStart, 0) / transition.duration;

			if (progress >= 1) {
				transitionStart = 0;
				target.source = videos[selectedIndex].reformat;
				if (previousVideo) {
					previousVideo.pause();
				}
			} else {
				if (transition.volume !== false) {
					if (previousVideo) {
						previousVideo.volume = Math.min(1, Math.max(0, 1 - progress));
					}
					nextVideo.volume = Math.min(1, Math.max(0, progress));
				} else {
					previousVideo.volume = 0;
					nextVideo.volume = 1;
				}

				transition.draw(progress);
			}
		}
	});
	switchVideo(0);

	document.getElementById('transition').addEventListener('change', function () {
		activeTransition = this.value;
		transition = transitions[activeTransition];
	});

	document.addEventListener('visibilitychange', visibilityChange);
	document.addEventListener('mozvisibilitychange', visibilityChange);
	document.addEventListener('msvisibilitychange', visibilityChange);
	document.addEventListener('webkitvisibilitychange', visibilityChange);

	/*
	window.addEventListener('keyup', function(evt) {
		if (evt.which === 32) {
			if (video.paused) {
				video.play();
			} else {
				video.pause();
			}
		}
	}, true);

	window.addEventListener('keydown', function(evt) {
		if (video.paused) {
			if (evt.which === 37) {
				video.currentTime = video.currentTime - 1 / FRAME_RATE;
			} else if (evt.which === 39) {
				video.currentTime = video.currentTime + 1 / FRAME_RATE;
			}
		}
	}, true);
	*/
}(this));