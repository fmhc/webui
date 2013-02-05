define(['core'], function(core) {
	/***
	 * Node modules
	 */

	/***
	 * Local modules
	 */

	/**
	 *
	 */
	var S4 = function() {
		return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
	}
	function uuid(a) {
		if (a) {
			return (S4() + S4() + S4() + S4() + S4() + S4() + S4() + S4());
		}
		return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
	}

	var Exposed = function(data, id, user, cb) {
		var hasSent = false;
		var result = {};
		var error = {};
		var self = this
		//
		this.request = {}
		this.user = user
		this.request.id = data.id;
		this.request.method = data.method;
		this.request.params = data.params;

		function set(key, val) {
			result[key] = val;
		};
		function send(data, code) {
			if (hasSent) {
				throw new Error('should not sent twice.');
			}

			if ( typeof data === 'object') {
				for (var key in data) {
					set(key, data[key]);
				}
			} else if (arguments.length >= 1) {
				set(arguments[0], arguments[1]);
			}

			var request = {
				//
				id : self.request.id
			}
			if (code) {
				request.code = code
			} else {
				request.code = 200
			}
			if (error['code']) {
				request.error = error
			} else {
				request.result = result

			}

			hasSent = true;
			cb(request);
			return self;
		}

		function errorFn(err, code) {

			if (err.stack) {

				error = {
					message : err.message,
					stack : err.stack,
					code : code || 1000,
					method : data.method,
					params : data.params
				};
			} else {

				error = {
					message : err,
					code : code || 1000,
					stack : '',
					method : data.method,
					params : data.params
				};
			}

			return send();
		};
		this.__defineGetter__("error", function() {
			return errorFn
		});
		this.__defineGetter__("send", function() {
			return send;
		});
		this.__defineGetter__("set", function() {
			return set;
		});
	};

	/**
	 *
	 */

	/**
	 * RPC-JSON style calls for partition.io
	 * Originally taken from rpc-socket
	 *
	 * @param {Object} initialized peer
	 *
	 * @return {Object}
	 */
	var RpcModule = function(write, name) {

		var self = this;

		core.EventEmitter.call(this);
		this.write = function(data) {
			write(data)
		}
		this.name = name;
		this.vows = {}
		this.id = uuid()
		this.functions = {};
		this.counter = 0;

		this.on('request', this.requestEvent);

		this.expose('list', function() {
			var list = [];
			for (var key in self.functions) {
				this.set(key, 'function');
			}
			this.set('Array', Object.keys(self.functions));
			this.send();
		});

	}
	/***
	 * Make it an event
	 */
	core.inherits(RpcModule, core.EventEmitter);

	/***
	 * Write to the peer
	 */
	RpcModule.prototype.write = function(data) {

		//this.stream.send(data);

	};
	/***
	 * Write to the peer
	 */
	RpcModule.prototype.handler = function(handler, exsosed, params) {

		handler.apply(exsosed, params);

	};

	/***
	 * Expose modules to every peer
	 * @param {String} Base name to the module
	 * @param {Object|Function} The module. Can be a function for the
	 * module to have onlt one method, or an Object for mulit methods.
	 */
	RpcModule.prototype.expose = function(mod, object) {
		if ( typeof (object) === 'object') {
			var funcs = [];
			var keys = Object.keys(object);
			for (var i = keys.length - 1; i >= 0; i--) {

				var funcObj = object[keys[i]];
				var funcName = keys[i]
				if ( typeof (funcObj) == 'function') {

					this.functions[mod + '.' + funcName] = funcObj;
					funcs.push(funcName);
				} else if ( typeof (funcObj) == 'object') {
					this.expose(mod + '.' + funcName, funcObj);
				}
			}

			//util.log(this.id.split('-')[0] + ' exposing module : ' + mod + ' [funs: ' + funcs.join(', ') + ']');
		} else if ( typeof (object) == 'function') {
			this.functions[mod] = object;
			//util.log(this.id.split('-')[0] + ' exposing ' + mod);
		}

		return this;
	};
	/***
	 * Request event entry point for data
	 */
	RpcModule.prototype.requestEvent = function(data, cb) {
		if (!cb) {
			cb = this.write
		}
		if ((data.hasOwnProperty('result') || data.hasOwnProperty('error') ) && data.hasOwnProperty('id') && this.vows.hasOwnProperty(data.id)) {
			var vow = this.runVows(data);
			return this.handler(vow.handler, vow.exsosed, vow.params);
		}
		if (data.hasOwnProperty('error'))
			throw data.error.message;

		if (!data.hasOwnProperty('id'))
			return cb(this.runError(32600, null));

		if (!(data.hasOwnProperty('method') && typeof (data.method) === 'string'))
			return cb(this.runError(32600, data.id));

		if (!data.hasOwnProperty('params') && Array.isArray(data.params))
			return cb(this.runError(32602, data.id));

		if (!this.functions.hasOwnProperty(data.method))
			return cb(this.runError(32601, data.id));

		var result = this.runExpose(data, cb);
		return this.handler(result.handler, result.exsosed, result.params);
	};
	/***
	 * Ready for the exposed methods to be called
	 */
	RpcModule.prototype.runExpose = function(data, cb) {

		var exsosed = new Exposed(data, this.id, this.user, cb);

		var handler = this.functions[data.method];

		this.counter++;

		return {
			params : data.params,
			handler : handler,
			exsosed : exsosed
		};
	};
	/***
	 * We have a request return so deal with it.
	 */
	RpcModule.prototype.runVows = function(data) {

		var vow = this.vows[data.id];

		//
		delete this.vows[data.id];
		//

		if (data.error !== null) {
			return {
				params : [data.error, data.result, data.id],
				handler : vow.callBack,
				exsosed : this
			};
		} else {
			return {
				params : [data.error, data.result, data.id],
				handler : vow.callBack,
				exsosed : this
			};
		}
	};
	/***
	 * An error so just return it.
	 */
	RpcModule.prototype.runError = function(code, id) {
		switch (code) {
			case 32700:
				return {
					'result' : null,
					'error' : {
						'message' : 'Parse error',
						'code' : code
					},
					'id' : id
				};
			case 32600:
				return {
					'result' : null,
					'error' : {
						'message' : 'Invalid Request',
						'code' : code
					},
					'id' : id
				};
			case 32601:
				return {
					'result' : null,
					'error' : {
						'message' : 'Method not found.',
						'code' : code
					},
					'id' : id
				};
			case 32602:
				return {
					'result' : null,
					'error' : {
						'message' : 'Invalid params.',
						'code' : code
					},
					'id' : id
				};
			case 32603:
				return {
					'result' : null,
					'error' : {
						'message' : 'Internal error.',
						'code' : code
					},
					'id' : id
				};
			default:
				return {
					'result' : null,
					'error' : {
						'message' : 'Server error.',
						'code' : 32000
					},
					'id' : id
				};
		}
	};
	/***
	 * Invoke a method on the remote peer.
	 */
	RpcModule.prototype.invoke = function(method, params, callBack) {
		var id = uuid();
		this.vows[id] = {
			method : method,
			params : params,
			callBack : callBack
		};

		this.write({
			id : id,
			method : method,
			params : params
		});
		return this;
	};

	core.extend({

		Module : RpcModule

	})

});
