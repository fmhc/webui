define(['core'], function(core) {
	var packages = {

	}
	function Countdown(options) {
		var timer, instance = this, seconds = options.seconds || 10, updateStatus = options.onUpdateStatus ||
		function() {
		}, counterEnd = options.onCounterEnd ||
		function() {
		};

		function decrementCounter() {
			updateStatus(seconds);
			if (seconds === 0) {
				counterEnd();
				instance.stop();
			}
			seconds--;
		}


		this.start = function() {
			clearInterval(timer);
			timer = 0;
			seconds = options.seconds;
			timer = setInterval(decrementCounter, 1000);
		};

		this.stop = function() {
			clearInterval(timer);
		};
	}

	function cleanMemory(current) {
		var max = 300
		var free = 0
		var user = 0
		var other = 0
		Object.keys(packages).forEach(function(name) {
			if (name !== current) {

				packages[name]._drones.forEach(function(drone) {
					other += (Number(drone.stats.rssize) / 1024)
				})
			} else {

			}
		})
		packages[current]._drones.forEach(function(drone) {
			user += (Number(drone.stats.rssize) / 1024)
		})
		free = max - (user + other)

		return {
			free : free,
			user : user,
			other : other,
			max : max
		}
	}

	var Package = function(toEl, name) {
		rpc.expose('spawn.stage', function(name, uid, stage, status, time) {
			console.log(name, stage, status, time)
			if (packages[name]) {
				packages[name].addSpawn({
					uid : uid
				})
				packages[name].updateSpawnLabelMsg(uid, status)

			}
		})
		var self = this
		packages[name] = this
		this.id = core.uuid()
		this.compile = null
		this.toEl = toEl
		this.name = name
		this.el = null
		this.els = {}
		this.spawnMax = 8
		this.spawnCount = 0
		this.requestslen = 0
		this.bytesRead = 0
		this.bytesWritten = 0
		this.uids = {}
		this.loadData = {}
		this.proxyData = {
			data : [],
			label : name
		}
		this.proxyTrafficData = [{
			data : [],
			label : "IN"
		}, {
			data : [],
			label : 'OUT'
		}]

		this._app = null
		this._proxy = null
		this._drones = []
		this.spawns = {}

		this.counter = new Countdown({
			seconds : 4, // number of seconds to count down
			onUpdateStatus : function(sec) {
				self.updateTimer(sec)
			}, // callback for each second
			onCounterEnd : function() {
				self.updateTimerEnd()
			} // final action
		});

		this.viewsCompile(function() {
			self.cacheEls()
			self.init()
		})
	}
	var LabelLev = ['success', 'warning', 'important', 'info', 'inverse']
	var elsList = ['app-name', 'description', 'countdown', 'spawn-sacle-down', 'spawn-sacle-up', 'balancer-traffic-in', 'balancer-traffic-out', 'balancer-requests-placeholder', 'balancer-traffic-placeholder', 'spawn-count-free', 'spawn-count-used', 'demo-placeholder', 'app-status-val', 'notifactions', 'app-status-label', 'app-domain', 'spawn-count', 'app-memory-usage-other', 'app-memory-usage-user', 'app-memory-usage-free', 'app-memory-val']
	Package.prototype.cacheEls = function(list) {
		var el = this.el
		var self = this;

		(list || elsList).forEach(function(c) {
			self.els[c] = $('#' + self.id + ' .' + c)
		})
	}
	Package.prototype.dsf = function() {

	}

	Package.prototype.updateTimer = function(sec) {
		this.els['countdown'].text(sec + ' sec')
	}
	Package.prototype.updateTimerEnd = function() {
		this.els['countdown'].text('Update')
	}
	Package.prototype.updateMemory = function(spawn) {
		var current = this.name
		var info = cleanMemory(current, spawn)

		this.els['app-memory-usage-free'].css('width', (info.free / info.max ) * 100 + '%')
		this.els['app-memory-usage-free'].text(info.free.toFixed(2) + 'MB')
		this.els['app-memory-usage-other'].css('width', (info.other / info.max ) * 100 + '%')
		this.els['app-memory-usage-other'].text(info.other.toFixed(2) + 'MB')
		this.els['app-memory-usage-user'].css('width', (info.user / info.max ) * 100 + '%')
		this.els['app-memory-usage-user'].text(info.user.toFixed(2) + 'MB')
		this.els['app-memory-val'].text(info.user.toFixed(0) + 'MB / ' + info.free.toFixed(0) + 'MB')
	}
	Package.prototype.updateSpawnCount = function(count) {
		this.els['spawn-count'].text(count)

		this.els['spawn-count-used'].css('width', (count / this.spawnMax ) * 100 + '%')
		this.els['spawn-count-used'].text(count)
		this.els['spawn-count-free'].css('width', ((this.spawnMax - count) / this.spawnMax ) * 100 + '%')
		this.els['spawn-count-free'].text(this.spawnMax)

	}
	Package.prototype.updateSpawn = function(spawn) {

		if (!this.els[spawn.uid]) {
			this.addSpawn(spawn)
		}
		this.els[spawn.uid].mem.text((Number(spawn.stats.rssize) / 1024).toFixed(1) + 'MB')
		this.els[spawn.uid].cpu.text(Number(spawn.stats.pcpu).toFixed(1) + '%')
		this.updateSpawnValue(spawn.uid, spawn.status)
		this.updateMemory(spawn)
	}
	Package.prototype.addSpawn = function(spawn) {
		if (this.els[spawn.uid]) {
			return
		}

		var html = '<tr class="app-spawn" id="' + spawn.uid + '">'
		html += '<td colspan="1" class="app-spawn-other">' + spawn.uid + '</td>'
		html += '<td colspan="2"><span class="' + spawn.uid + '-spawn-cpu">0%</span> / <span class="' + spawn.uid + '-spawn-mem">0MB</span></td>'
		html += '<td colspan="1"><span class="' + spawn.uid + '-spawn-label label label-inverse">CHILDSTART</span></td>'
		html += '</tr>'
		this.el.find('.spawns-list').append(html)
		this.cacheEls([spawn.uid + '-spawn-cpu', spawn.uid + '-spawn-mem', spawn.uid + '-spawn-label'])
		this.uids[spawn.uid] = {}
		this.els[spawn.uid] = {
			cpu : this.els[spawn.uid + '-spawn-cpu'],
			mem : this.els[spawn.uid + '-spawn-mem'],
			label : this.els[spawn.uid + '-spawn-label'],
			queue : [],
			quotaRun : false
		}

	}

	Package.prototype.attachScaleClicks = function() {
		var self = this
		this.els['spawn-sacle-down'].click(function() {
			self.scaledown()
		})
		this.els['spawn-sacle-up'].click(function() {
			self.scaleup()
		})
	}

	Package.prototype.scaleup = function() {
		var self = this
		rpc.invoke('user.package.scale.up', [this._app], function(err, data) {
			if (err) {
				return console.log(err)
			}
			//self.alert(data.scale ? 'alert-success' : 'alert-warning', '<strong>INFO! </strong>App Sacle was ' + data.scale + ' (count:' + data.count + ' )')

			self.updateSpawnCount(data.count)
		})
	}

	Package.prototype.scaledown = function() {
		var self = this
		rpc.invoke('user.package.scale.down', [this._app], function(err, data) {
			if (err) {
				return console.log(err)
			}
			//	self.alert(data.scale ? 'alert-success' : 'alert-warning', '<strong>INFO! </strong>App Sacle was ' + data.scale + ' (count:' + data.count + ' )')

			self.updateSpawnCount(data.count)
		})
	}

	Package.prototype.timeee = function(el) {
		var self = this

		self.t = true
		var self = this
		setTimeout(function() {
			el.label.text(el.queue.shift())

			self.t = false
			if (el.queue.length) {
				self.timeee(el)
			}
		}, 200)

	}
	Package.prototype.updateSpawnLabelMsg = function(uid, status) {

		this.els[uid].queue.push(status)
		if (!this.t) {
			this.timeee(this.els[uid])
		}
	}
	Package.prototype.updateSpawnLabelLev = function(uid, val) {

		var self = this
		LabelLev.forEach(function(c) {
			self.els[uid].label.removeClass(c)
		})
		this.els[uid].label.addClass('label-' + val)
	}
	Package.prototype.updateSpawnValue = function(uid, val) {
		this.els[uid].label.text(val)
	}
	Package.prototype.updateStatusLabelMsg = function(val) {
		this.els['app-status-label'].text(val)
	}
	Package.prototype.updateStatusLabelLev = function(val) {

		var self = this
		LabelLev.forEach(function(c) {
			self.els['app-status-label'].removeClass(c)
		})
		this.els['app-status-label'].addClass('label-' + val)
	}
	Package.prototype.updateStatusValue = function(val) {
		this.els['app-status-val'].text(val)
	}
	Package.prototype.clearSpawns = function() {
		var self = this
		this.updateSpawnCount(0)
		this.el.find('.spawns-list tr').remove()
		Object.keys(this.uids).forEach(function(uid) {
			delete self.els[key]
			delete self.uids[key]
		})
	}
	Package.prototype.updateName = function(name) {
		this.els['app-name'].text(name)
	}
	Package.prototype.updateDomain = function(domain) {
		this.els['app-domain'].text(domain).attr('href', 'http://' + domain)
	}
	Package.prototype.addSpawnAlert = function() {

		//this.els['notifactions'].append('<div class="alert  alert-success app-memory-warning"><button type="button" class="close" data-dismiss="alert">&times;</button><strong>INFO! </strong>New instance of app started. ' + new Date() + '</div>')
	}
	Package.prototype.alert = function(type, msg) {

		this.els['notifactions'].append('<div class="alert ' + type + '"><button type="button" class="close" data-dismiss="alert">&times;</button>' + msg + '</div>')
	}
	Package.prototype.removeSpawnAlert = function() {

		//this.els['notifactions'].append('<div class="alert  alert-success app-memory-warning"><button type="button" class="close" data-dismiss="alert">&times;</button><strong>INFO! </strong>Drone was removed. ' + new Date() + '</div>')
	}
	Package.prototype.updateTrafficProxy = function(stats) {

		if (this.bytesRead === 0 && stats.bytesRead !== 0) {
			this.bytesRead = stats.bytesRead
			this.bytesWritten = stats.bytesWritten
			return;
		}
		this.proxyTrafficData[0].data.push([Date.now(), stats.bytesWritten - this.bytesWritten]);
		this.proxyTrafficData[1].data.push([Date.now(), stats.bytesRead - this.bytesRead]);
		this.bytesRead = stats.bytesRead
		this.bytesWritten = stats.bytesWritten

		this.reflot('balancer-traffic-placeholder', this.proxyTrafficData);
		this.els['balancer-traffic-out'].text((stats.bytesWritten / 1024 / 1024).toFixed(2))
		this.els['balancer-traffic-in'].text((stats.bytesRead / 1024 / 1024).toFixed(2))

	}
	Package.prototype.updateProxy = function(stats) {
		this.updateTrafficProxy(stats)
		if (this.requestslen === 0 && stats.requests !== 0) {
			this.requestslen = stats.requests
			return;
		}
		this.proxyData.data.push([Date.now(), stats.requests - this.requestslen]);
		this.requestslen = stats.requests

		this.reflot('balancer-requests-placeholder', [this.proxyData]);

	}
	Package.prototype.cleanUids = function(drones) {
		var uids = this.uids
		var currentUids = {}
		drones.forEach(function(spawn) {
			currentUids[spawn.uid] = spawn
		})

		Object.keys(uids).forEach(function(uid) {
			if (!currentUids[uid]) {

				$('#' + uid).addClass('error').delay(3000).fadeOut(400).delay(800)//.remove()
			}
		})
	}
	Package.prototype.updateDescription = function(description) {
		this.els['description'].text(description)
	}

	Package.prototype.update = function() {
		var self = this
		rpc.invoke('user.package.get', [{
			name : this.name
		}], function(err, result) {
			if (err) {
				self.clearSpawns()

				setTimeout(function() {
					self.init()
				}, 5000)
				return self.updateStatusValue(err.message)
			}
			if (!result.drones) {
				return cb()
			}

			if (self._drones && self._drones.length < result.drones.length) {
				self.addSpawnAlert()
			} else if (self._drones && self._drones.length > result.drones.length) {
				self.removeSpawnAlert()
			}
			self._drones = result.drones || []
			self.updateSpawnCount(result.drones.length)

			result.drones.forEach(function(spawn) {
				self.updateSpawn(spawn)
			})
			if (Object.keys(self.uids).length !== result.drones.length) {
				self.cleanUids(result.drones)
			}

			self.updateFlowGraph()
			rpc.invoke('user.stats.proxy.host', [result.app.domain], function(err, result) {

				self._proxy = result.stats
				self.updateProxy(result.stats.stats)
				self.counter.start();
				setTimeout(function() {
					self.update()
				}, 5000)
			})
		})
	}
	Package.prototype.init = function() {
		var self = this
		rpc.invoke('user.package.get', [{
			name : this.name
		}], function(err, result) {
			if (err) {

				setTimeout(function() {
					self.init()
				}, 5000)
				return self.updateStatusValue(err.message)
			}
			if (!result.drones) {
				return cb()
			}
			var drones = result.drones
			rpc.invoke('user.stats.proxy.host', [result.app.domain], function(err, result) {
				var app = result.stats.app

				self._app = app
				delete self._app._id
				self._app.version = '0.0.0'
				self._proxy = null
				console.log(self._app)
				self._drones = drones || []

				self.updateName(app.name)
				self.updateDomain(app.domain)

				self.updateStatusValue('LOOKING')
				self.updateStatusLabelMsg('LOOKING')
				self.updateStatusLabelLev('inverse')

				if (app.description) {
					self.updateDescription(app.description)
				}

				self.attachScaleClicks()

				drones.forEach(function(spawn) {
					self.addSpawn(spawn)

					self.updateSpawn(spawn)
				})

				self._proxy = result.stats
				self.updateProxy(result.stats.stats)

				self.counter.start();
				setTimeout(function() {
					self.update()
				}, 5000)
			})
		})
	}

	Package.prototype.viewsCompile = function(cb) {
		var self = this
		core.xhr({
			url : '/views/app-info'
		}).on('end', function(data) {
			$(self.toEl).append(data.replace('{{- id }}', self.id))
			self.el = $(self.toEl).find('#' + self.id)
			cb()
		})
	}
	Package.prototype.updateFlowGraph = function() {

		var self = this
		this._drones.forEach(function(spawn) {
			if (!self.loadData[spawn.uid]) {
				self.loadData[spawn.uid] = {
					data : [],
					label : spawn.uid
				}
			}
			self.loadData[spawn.uid].data.push([Date.now(), Number(spawn.stats.pcpu).toFixed(1)])
		})
		var data = []
		Object.keys(self.loadData).forEach(function(uid) {
			data.push(self.loadData[uid])
		})
		this.reflot('demo-placeholder', data);
		var i = 1;
	}
	Package.prototype.reflot = function(placeholder, data) {

		var self = this
		try {

			$.plot(this.els[placeholder], data, {
				series : {
					lines : {
						show : true,
						lineWidth : 2
					},
					shadowSize : 0
				},
				legend : {
					show : false
				},
				xaxis : {
					ticks : [],
					mode : "time"
				},
				yaxis : {
					ticks : [],
					min : 0,
					autoscaleMargin : 0.1
				},
				selection : {
					mode : "x"
				}
			});
		} catch(err) {

		}
	}

	core.extend({
		Package : Package
	})
	return Package
});

