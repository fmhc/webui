requirejs.config({
	baseUrl : './site',

});

require(["core", 'package', 'xhr', 'tmpl', 'rpc'], function(core, Package) {

	webui = {
		timmer : 0,
		clearShowGraph : function(uid) {
			clearInterval(webui.timmer)
		},
		connect : function() {
			socket = io.connect('http://mangoraft.com:9004/');

			rpc = new core.Module(function(data) {
				socket.emit('rpc', data);
			})
			socket.on('auth', function(data) {

				$("#login-form").modal('hide');
				$("#login-form .alert-info").hide()
				$("#login-form .alert-success").show()
				console.log('auth')
				socket.on('rpc', function(data) {
					rpc.requestEvent(data);
				});
				webui[CONFIG.start](function() {

					$("#login-form .alert-success").hide()
				})
			});

			if (localStorage.pword) {

				socket.emit('login', {
					username : localStorage.uname,
					password : localStorage.pword
				})
			} else {
				$("#login-form").modal({
					"backdrop" : "static",
					"keyboard" : true,
					"show" : true
				});

				$("#login-form .alert-info").show()
				$("#authenticate").on("click", function(e) {
					socket.emit('login', {
						username : localStorage.uname = $('#uname').val(),
						password : localStorage.pword = $('#pword').val()
					})
				});

			}
		},
		showGraphStats : function() {
			var data = {

			}
			var memory = {}
			var load = {}
			var time = Date.now()

			function logStas(stats) {
				stats.forEach(function(stat) {
					if (!memory[stat.uid + 'memory']) {
						memory[stat.uid + 'memory'] = {
							data : [],
							label : 'uid: ' + stat.uid
						}
						load[stat.uid + 'load'] = {
							data : [],
							label : 'uid: ' + stat.uid
						}
					}
					memory[stat.uid + 'memory'].data.push([time, Number(stat.rssize) / 1024])
					load[stat.uid + 'load'].data.push([time, Number(stat.pcpu)])
				})
			}


			webui.timmer = setInterval(function() {
				time = Date.now()
				rpc.invoke('user.stats.proxy', ['mon'], function(err, result) {
					var stats = result.stats
					logStas(stats)
					rpc.invoke('user.package.running', [], function(err, result) {

						function loop() {
							var info = result.running.shift()
							if (!info) {
								var _memory = []
								var _load = []
								Object.keys(memory).forEach(function(key) {
									_memory.push(memory[key])
								})
								Object.keys(load).forEach(function(key) {
									_load.push(load[key])
								})

								$.plot($('#load'), _load, {
									xaxis : {
										mode : 'time',
										timeFormat : '%h:%M:%S'
									},
									legend : {
										container : $('#load-legend')
									}
								});
								$.plot($('#memory'), _memory, {
									legend : {
										container : $('#memory-legend')
									},
									xaxis : {
										mode : 'time',
										timeFormat : '%h:%M:%S'
									}
								});
								return;
							}

							rpc.invoke('user.stats.uid.load', [info.uid, 1], function(err, result) {
								var stats = result.load

								logStas(stats)
								loop()
							})
						}

						loop()

					})
				})
			}, 2500)
		},
		showHistoryStats : function() {
			var data = {

			}
			var memory = {}
			var load = {}
			var time = Date.now()

			function logStas(stats) {
				stats.forEach(function(stat) {
					if (!memory[stat.uid + 'memory']) {
						memory[stat.uid + 'memory'] = {
							data : [],
							label : 'uid: ' + stat.uid
						}
						load[stat.uid + 'load'] = {
							data : [],
							label : 'uid: ' + stat.uid
						}
					}
					memory[stat.uid + 'memory'].data.push([new Date(stat.time).getTime(), Number(stat.rssize) / 1024])
					load[stat.uid + 'load'].data.push([new Date(stat.time).getTime(), Number(stat.pcpu)])
				})
			}

			function weekendAreas(axes) {

				var markings = [], d = new Date(axes.xaxis.min);

				// go to the first Saturday

				d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 1) % 7))
				d.setUTCSeconds(0);
				d.setUTCMinutes(0);
				d.setUTCHours(0);

				var i = d.getTime();

				// when we don't set yaxis, the rectangle automatically
				// extends to infinity upwards and downwards

				do {
					markings.push({
						xaxis : {
							from : i,
							to : i + 1 * 1000
						}
					});
					i += 60 * 1 * 1000;
				} while (i < axes.xaxis.max);

				return markings;
			}

			function showTooltip(x, y, contents) {
				$("<div id='tooltip'>" + contents + "</div>").css({
					position : "absolute",
					display : "none",
					top : y + 5,
					left : x + 5,
					border : "1px solid #fdd",
					padding : "2px",
					"background-color" : "#fee",
					opacity : 0.80
				}).appendTo("body").fadeIn(200);
			}


			rpc.invoke('user.stats.user.load', [5000], function(err, result) {
				var stats = result.load
				console.log(stats)

				logStas(stats)
				var _memory = []
				var _load = []
				Object.keys(memory).forEach(function(key) {
					_memory.push(memory[key])
				})
				Object.keys(load).forEach(function(key) {
					_load.push(load[key])
				})
				var options = {
					xaxis : {
						mode : "time",
						tickLength : 100
					},
					series : {
						lines : {
							show : true
						},
						points : {
							show : false
						}
					},

					selection : {
						mode : "x"
					},
					legend : {
						container : $('#load-legend')
					}
				};

				// now connect the two
				(function() {

					$("#memory-placeholder").bind("plotselected", function(event, ranges) {

						plot = $.plot("#memory-placeholder", _memory, $.extend(true, {}, options, {
							xaxis : {
								min : ranges.xaxis.from,
								max : ranges.xaxis.to
							},
							yaxis : {
								min : ranges.yaxis.from,
								max : ranges.yaxis.to
							}
						}));

						// don't fire event on the overview to prevent eternal loop

						overview.setSelection(ranges, true);
					});
					var previousPoint = null;
					$("#memory-overview").bind("plotselected", function(event, ranges) {
						plot.setSelection(ranges);
					});

					var plot = $.plot($('#memory-placeholder'), _memory, {
						xaxis : {
							mode : "time",
							tickLength : 5
						},
						selection : {
							mode : "x"
						},
						legend : {
							container : $('#memory-legend')
						},
						grid : {
							markings : weekendAreas
						}
					});
					var overview = $.plot($('#memory-overview'), _memory, {
						series : {
							lines : {
								show : true,
								lineWidth : 1
							},
							shadowSize : 0
						},
						xaxis : {
							mode : "time"
						},
						legend : {
							container : $('#memory-legend')
						},
						selection : {
							mode : "x"
						}
					});

				})();
				;
				(function() {

					$("#load-placeholder").bind("plotselected", function(event, ranges) {

						plot = $.plot("#load-placeholder", _load, $.extend(true, {}, options, {
							xaxis : {
								min : ranges.xaxis.from,
								max : ranges.xaxis.to
							},
							yaxis : {
								min : ranges.yaxis.from,
								max : ranges.yaxis.to
							}
						}));

						// don't fire event on the overview to prevent eternal loop

						overview.setSelection(ranges, true);
					});

					$("#load-overview").bind("plotselected", function(event, ranges) {
						plot.setSelection(ranges);
					});

					var plot = $.plot($('#load-placeholder'), _load, {
						xaxis : {
							mode : "time",
							tickLength : 5
						},
						selection : {
							mode : "x"
						},
						legend : {
							container : $('#load-legend')
						},
						grid : {
							markings : weekendAreas
						}
					});
					var overview = $.plot($('#load-overview'), _load, {
						series : {
							lines : {
								show : true,
								lineWidth : 1
							},
							shadowSize : 0
						},
						xaxis : {
							mode : "time"
						},
						legend : {
							container : $('#memory-legend')
						},
						selection : {
							mode : "x"
						}
					});

				})()

			})
		},

		loadpackages : function(cb) {
			rpc.invoke('user.package.running', [], function(err, result) {
				var running = result.running
				var have = {}
				running.forEach(function(spawn) {
					if (have[spawn.name]) {
						return;
					}
					console.log(spawn.name)
					have[spawn.name] = true
					new Package('.marketing', spawn.name)
				})
				cb()
			})
		},

		showGraph : function(cb) {
			var d1 = []
			var d2 = []
			var d3 = []
			var hasLoad = false
			var first = true
			this.showGraphStats()
			var bytesRead = 0
			var requests = 0
			var bytesWritten = 0

			webui.timmer = setInterval(function() {
				re_flot()
			}, 2500)

			function re_flot() {
				rpc.invoke('user.stats.proxy', [], function(err, result) {
					console.log(result.stats.requests)
					console.log(result.stats.requests - requests)
					if (first) {
						first = false
						d1.push([Date.now(), 0]);
						d2.push([Date.now(), 0]);
						d3.push([Date.now(), 0]);

						requests = result.stats.requests;
						bytesRead = result.stats.bytesRead;
						bytesWritten = result.stats.bytesWritten;

						return !hasLoad ? hasLoad = true && cb() : null;
					}

					d1.push([Date.now(), result.stats.requests - requests]);
					d2.push([Date.now(), (result.stats.bytesRead - bytesRead) / 1024]);
					d3.push([Date.now(), (result.stats.bytesWritten - bytesWritten) / 1024]);

					requests = result.stats.requests;
					bytesRead = result.stats.bytesRead;
					bytesWritten = result.stats.bytesWritten;

					$.plot($('#hits'), [{
						data : d1,
						label : 'requests'
					}], {
						xaxis : {
							mode : 'time',
							timeFormat : '%h:%M:%S'
						},
						legend : {
							container : $('#hits-legend')
						}
					});
					$.plot($('#trafic'), [{
						data : d2,
						label : 'bytesRead'
					}, {
						data : d3,
						label : 'bytesWritten'
					}], {
						xaxis : {
							mode : 'time',
							timeFormat : '%h:%M:%S'
						},
						legend : {
							container : $('#trafic-legend')
						}
					});
					!hasLoad ? hasLoad = true && cb() : null
				})
			}

		}
	}
	webui.connect()

});
