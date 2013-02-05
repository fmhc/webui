define(function() {

	ejs.open = '{{';
	ejs.close = '}}';
	/**
	 * EventEmitter class
	 * Creates an object with event registering and firing methods
	 */
	function EventEmitter() {
		// Initialise required storage variables
		this._events = {};
		this._maxListeners = 10;
	}

	/**
	 * Event class
	 * Contains Event methods and property storage
	 *
	 * @param {String} type Event type name
	 * @param {Function} listener Function to be called when the event is fired
	 * @param {Object} scope Object that this should be set to when the listener is called
	 * @param {Boolean} once If true then the listener will be removed after the first call
	 * @param {Object} instance The parent EventEmitter instance
	 */
	function Event(type, listener, scope, once, instance) {
		// Store arguments
		this.type = type;
		this.listener = listener;
		this.scope = scope;
		this.once = once;
		this.instance = instance;
	}

	/**
	 * Executes the listener
	 *
	 * @param {Array} args List of arguments to pass to the listener
	 * @return {Boolean} If false then it was a once event
	 */
	Event.prototype.fire = function(args) {
		var self = this
		//setTimeout(function() {
		self.listener.apply(self.scope || self.instance, args);

		//}, 0)
		// Remove the listener if this is a once only listener
		if (this.once) {
			this.instance.removeListener(this.type, this.listener, this.scope);
			return false;
		}
	};

	/**
	 * Passes every listener for a specified event to a function one at a time
	 *
	 * @param {String} type Event type name
	 * @param {Function} callback Function to pass each listener to
	 * @return {Object} The current EventEmitter instance to allow chaining
	 */
	EventEmitter.prototype.eachListener = function(type, callback) {
		// Initialise variables
		var i = null, possibleListeners = null, result = null;

		// Only loop if the type exists
		if (this._events.hasOwnProperty(type)) {
			possibleListeners = this._events[type];

			for ( i = 0; i < possibleListeners.length; i += 1) {
				result = callback.call(this, possibleListeners[i], i);

				if (result === false) {
					i -= 1;
				} else if (result === true) {
					break;
				}
			}
		}

		// Return the instance to allow chaining
		return this;
	};

	/**
	 * Adds an event listener for the specified event
	 *
	 * @param {String} type Event type name
	 * @param {Function} listener Function to be called when the event is fired
	 * @param {Object} scope Object that this should be set to when the listener is called
	 * @param {Boolean} once If true then the listener will be removed after the first call
	 * @return {Object} The current EventEmitter instance to allow chaining
	 */
	EventEmitter.prototype.addListener = function(type, listener, scope, once) {
		// Create the listener array if it does not exist yet
		if (!this._events.hasOwnProperty(type)) {
			this._events[type] = [];
		}

		// Push the new event to the array
		this._events[type].push(new Event(type, listener, scope, once, this));

		// Emit the new listener event
		this.emit('newListener', type, listener, scope, once);

		// Check if we have exceeded the maxListener count
		// Ignore this check if the count is 0
		// Also don't check if we have already fired a warning
		if (this._maxListeners && !this._events[type].warned && this._events[type].length > this._maxListeners) {
			// The max listener count has been exceeded!
			// Warn via the console if it exists
			if ( typeof console !== 'undefined') {
				console.warn('Possible EventEmitter memory leak detected. ' + this._events[type].length + ' listeners added. Use emitter.setMaxListeners() to increase limit.');
			}

			// Set the flag so it doesn't fire again
			this._events[type].warned = true;
		}

		// Return the instance to allow chaining
		return this;
	};

	/**
	 * Alias of the addListener method
	 *
	 * @param {String} type Event type name
	 * @param {Function} listener Function to be called when the event is fired
	 * @param {Object} scope Object that this should be set to when the listener is called
	 * @param {Boolean} once If true then the listener will be removed after the first call
	 */
	EventEmitter.prototype.on = EventEmitter.prototype.addListener;

	/**
	 * Alias of the addListener method but will remove the event after the first use
	 *
	 * @param {String} type Event type name
	 * @param {Function} listener Function to be called when the event is fired
	 * @param {Object} scope Object that this should be set to when the listener is called
	 * @return {Object} The current EventEmitter instance to allow chaining
	 */
	EventEmitter.prototype.once = function(type, listener, scope) {
		return this.addListener(type, listener, scope, true);
	};

	/**
	 * Removes the a listener for the specified event
	 *
	 * @param {String} type Event type name the listener must have for the event to be removed
	 * @param {Function} listener Listener the event must have to be removed
	 * @param {Object} scope The scope the event must have to be removed
	 * @return {Object} The current EventEmitter instance to allow chaining
	 */
	EventEmitter.prototype.removeListener = function(type, listener, scope) {
		this.eachListener(type, function(currentListener, index) {
			// If this is the listener remove it from the array
			// We also compare the scope if it was passed
			if (currentListener.listener === listener && (!scope || currentListener.scope === scope)) {
				this._events[type].splice(index, 1);
			}
		});

		// Remove the property if there are no more listeners
		if (this._events[type] && this._events[type].length === 0) {
			delete this._events[type];
		}

		// Return the instance to allow chaining
		return this;
	};

	/**
	 * Alias of the removeListener method
	 *
	 * @param {String} type Event type name the listener must have for the event to be removed
	 * @param {Function} listener Listener the event must have to be removed
	 * @param {Object} scope The scope the event must have to be removed
	 * @return {Object} The current EventEmitter instance to allow chaining
	 */
	EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

	/**
	 * Removes all listeners for a specified event
	 * If no event type is passed it will remove every listener
	 *
	 * @param {String} type Event type name to remove all listeners from
	 * @return {Object} The current EventEmitter instance to allow chaining
	 */
	EventEmitter.prototype.removeAllListeners = function(type) {
		// Check for a type, if there is none remove all listeners
		// If there is a type however, just remove the listeners for that type
		if (type && this._events.hasOwnProperty(type)) {
			delete this._events[type];
		} else if (!type) {
			this._events = {};
		}

		// Return the instance to allow chaining
		return this;
	};

	/**
	 * Retrieves the array of listeners for a specified event
	 *
	 * @param {String} type Event type name to return all listeners from
	 * @return {Array} Will return either an array of listeners or an empty array if there are none
	 */
	EventEmitter.prototype.listeners = function(type) {
		// Return the array of listeners or an empty array if it does not exist
		if (this._events.hasOwnProperty(type)) {
			// It does exist, loop over building the array
			var listeners = [];

			this.eachListener(type, function(evt) {
				listeners.push(evt.listener);
			});

			return listeners;
		}

		return [];
	};

	/**
	 * Emits an event executing all appropriate listeners
	 * All values passed after the type will be passed as arguments to the listeners
	 *
	 * @param {String} type Event type name to run all listeners from
	 * @return {Object} The current EventEmitter instance to allow chaining
	 */
	EventEmitter.prototype.emit = function(type) {
		// Calculate the arguments
		var args = [], i = null;

		for ( i = 1; i < arguments.length; i += 1) {
			args.push(arguments[i]);
		}

		this.eachListener(type, function(currentListener) {
			return currentListener.fire(args);
		});

		// Return the instance to allow chaining
		return this;
	};

	/**
	 * Sets the max listener count for the EventEmitter
	 * When the count of listeners for an event exceeds this limit a warning will be printed
	 * Set to 0 for no limit
	 *
	 * @param {Number} maxListeners The new max listener limit
	 * @return {Object} The current EventEmitter instance to allow chaining
	 */
	EventEmitter.prototype.setMaxListeners = function(maxListeners) {
		this._maxListeners = maxListeners;

		// Return the instance to allow chaining
		return this;
	};

	/**
	 * Builds a clone of the prototype object for you to extend with
	 *
	 * @return {Object} A clone of the EventEmitter prototype object
	 */
	EventEmitter.extend = function() {
		// First thing we need to do is create our new prototype
		// Then we loop over the current one copying each method out
		// When done, simply return the clone
		var clone = {}, current = this.prototype, key = null;

		for (key in current) {
			// Make sure this is actually a property of the object before copying it
			// We don't want any default object methods leaking though
			if (current.hasOwnProperty(key)) {
				clone[key] = current[key];
			}
		}

		// All done, return the clone
		return clone;
	};
	$.EventEmitter = EventEmitter
	/**
	 *
	 *
	 *
	 */

	var _jQuery = typeof jQuery === 'function'

	function isFunction(value) {
		return toString.call(value) == "[object Function]"
	}

	function isObject(value) {
		return value instanceof Object
	}

	function isPlainObject(value) {
		return isObject(value) && value.__proto__ == Object.prototype
	}

	function isArray(value) {
		return value instanceof Array
	}

	function likeArray(obj) {
		return typeof obj.length == 'number'
	}

	function compact(array) {
		return array.filter(function(item) {
			return item !== undefined && item !== null
		})
	}

	function flatten(array) {
		return array.length > 0 ? $.fn.concat.apply([], array) : array
	}

	function camelize(str) {
		return str.replace(/-+(.)?/g, function(match, chr) {
			return chr ? chr.toUpperCase() : ''
		})
	}

	function dasherize(str) {
		return str.replace(/::/g, '/').replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2').replace(/([a-z\d])([A-Z])/g, '$1_$2').replace(/_/g, '-').toLowerCase()
	}

	function S4() {
		return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
	}

	function inherits(ctor, superCtor) {
		ctor.super_ = superCtor;
		ctor.prototype = Object.create(superCtor.prototype, {
			constructor : {
				value : ctor,
				enumerable : false,
				writable : true,
				configurable : true
			}
		});
	}

	function uuid() {
		return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
	}

	function Frame5() {
		return this.init()
	}

	inherits(Frame5, $.EventEmitter)

	Frame5.prototype.init = function(selector) {
		var self = this
		$.EventEmitter.call(this);
		this.isReady = false
		this.once('core', function() {
			self.logger('Frame5 core ready')
		})
		if (_jQuery) {
			jQuery(document).ready(function() {
				self.isReady = true

				self.emit('ready')
			})
		} else {
			self.emit('ready')
		}
		return this;
	}
	//
	Frame5.prototype.inherits = inherits;
	Frame5.prototype.uuid = uuid;
	//
	Frame5.prototype.EventEmitter = $.EventEmitter;

	//
	Frame5.prototype.camelize = camelize;
	Frame5.prototype.flatten = flatten;
	Frame5.prototype.compact = compact;
	Frame5.prototype.likeArray = likeArray;
	Frame5.prototype.isArray = isArray;
	Frame5.prototype.isPlainObject = isPlainObject;
	Frame5.prototype.isObject = isObject;
	Frame5.prototype.isFunction = isFunction;

	//
	Frame5.prototype.nope = function() {
		//
	};
	//
	var print = function(o) {
		var str = '';
		if ( typeof o === 'string') {
			return o;
		}
		for (var p in o) {
			if ( typeof o[p] == 'object') {
				str += p + ':    { </br>' + print(o[p]) + '}  ';
			} else {

				str += p + ': ' + o[p] + '; </br>';
			}
		}

		return str;
	}
	Frame5.prototype.logger = function(message, html) {

		if (this.browser && this.browser.worker) {
			if (this.isReady) {
				return this.worker.rpc.invoke('logger', ['<li>' + this.inspect(message) + '</li>'], function() {

				})
			} else {
				var self = this;
				return this.once('ready', function() {
					this.worker.rpc.invoke('logger', ['<li>' + self.inspect(message) + '</li>'], function() {

					})
				})
			}
		}

		if (_jQuery) {
			if (this.isReady) {
				jQuery('#logger').prepend( html ? message : '<li>' + this.inspect(message) + '</li>')
				try {
					jQuery('#logger').listview('refresh');
				} catch(e) {
				}
			} else {
				var self = this;
				this.once('ready', function() {
					jQuery('#logger').prepend( html ? message : '<li>' + self.inspect(message) + '</li>')
					try {
						jQuery('#logger').listview('refresh');
					} catch(e) {
					}
				})
			}
		}

	};
	//
	Frame5.prototype.ready = function(fn) {

		if (this.isReady) {
			fn(this)
		} else {
			this.once('ready', fn)
		}

	};
	//

	Frame5.prototype.extend = function() {
		var options, name, src, copy, copyIsArray, clone, self = this, target = arguments[0] || {}, i = 1, length = arguments.length, deep = false;
		if ( typeof target === "boolean") {
			deep = target;
			target = arguments[1] || {};
			i = 2;
		}
		if ( typeof target !== "object" && !self.isFunction(target)) {
			target = {};
		}
		if (length === i) {
			target = this; --i;
		}
		for (; i < length; i++) {
			if (( options = arguments[i]) != null) {
				for (name in options ) {
					src = target[name];
					copy = options[name];
					if (target === copy) {
						continue;
					}
					if (deep && copy && (self.isPlainObject(copy) || ( copyIsArray = self.isArray(copy)) )) {
						if (copyIsArray) {
							copyIsArray = false;
							clone = src && self.isArray(src) ? src : [];
						} else {
							clone = src && self.isPlainObject(src) ? src : {};
						}
						target[name] = self.extend(deep, clone, copy);
					} else if (copy !== undefined) {
						target[name] = copy;
					}
				}
			}
		}
		return target;
	};

	/**
	 *
	 *
	 */
	function inspect(obj, showHidden, depth, colors) {
		var ctx = {
			showHidden : showHidden,
			seen : [],
			stylize : colors ? stylizeWithColor : stylizeNoColor
		};
		return formatValue(ctx, obj, ( typeof depth === 'undefined' ? 2 : depth));
	}


	Frame5.prototype.inspect = inspect;

	// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
	var colors = {
		'bold' : [1, 22],
		'italic' : [3, 23],
		'underline' : [4, 24],
		'inverse' : [7, 27],
		'white' : [37, 39],
		'grey' : [90, 39],
		'black' : [30, 39],
		'blue' : [34, 39],
		'cyan' : [36, 39],
		'green' : [32, 39],
		'magenta' : [35, 39],
		'red' : [31, 39],
		'yellow' : [33, 39]
	};

	// Don't use 'blue' not visible on cmd.exe
	var styles = {
		'special' : 'cyan',
		'number' : 'yellow',
		'boolean' : 'yellow',
		'undefined' : 'grey',
		'null' : 'bold',
		'string' : 'green',
		'date' : 'magenta',
		// "name": intentionally not styling
		'regexp' : 'red'
	};

	function stylizeWithColor(str, styleType) {
		var style = styles[styleType];

		if (style) {
			return '\033[' + colors[style][0] + 'm' + str + '\033[' + colors[style][1] + 'm';
		} else {
			return str;
		}
	}

	function stylizeNoColor(str, styleType) {
		return str;
	}

	function arrayToHash(array) {
		var hash = {};

		array.forEach(function(val, idx) {
			hash[val] = true;
		});

		return hash;
	}

	function formatValue(ctx, value, recurseTimes) {
		// Provide a hook for user-specified inspect functions.
		// Check that value is an object with an inspect function on it
		if (value && typeof value.inspect === 'function' &&
		// Filter out the util module, it's inspect function is special
		value.inspect !== exports.inspect &&
		// Also filter out any prototype objects using the circular check.
		!(value.constructor && value.constructor.prototype === value)) {
			return String(value.inspect(recurseTimes));
		}

		// Primitive types cannot have properties
		var primitive = formatPrimitive(ctx, value);
		if (primitive) {
			return primitive;
		}

		// Look up the keys of the object.
		var keys = Object.keys(value);
		var visibleKeys = arrayToHash(keys);

		if (ctx.showHidden) {
			keys = Object.getOwnPropertyNames(value);
		}

		// Some type of object without properties can be shortcutted.
		if (keys.length === 0) {
			if ( typeof value === 'function') {
				var name = value.name ? ': ' + value.name : '';
				return ctx.stylize('[Function' + name + ']', 'special');
			}
			if (isRegExp(value)) {
				return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
			}
			if (isDate(value)) {
				return ctx.stylize(Date.prototype.toString.call(value), 'date');
			}
			if (isError(value)) {
				return formatError(value);
			}
		}

		var base = '', array = false, braces = ['{', '}'];

		// Make Array say that they are Array
		if (isArray(value)) {
			array = true;
			braces = ['[', ']'];
		}

		// Make functions say that they are functions
		if ( typeof value === 'function') {
			var n = value.name ? ': ' + value.name : '';
			base = ' [Function' + n + ']';
		}

		// Make RegExps say that they are RegExps
		if (isRegExp(value)) {
			base = ' ' + RegExp.prototype.toString.call(value);
		}

		// Make dates with properties first say the date
		if (isDate(value)) {
			base = ' ' + Date.prototype.toUTCString.call(value);
		}

		// Make error with message first say the error
		if (isError(value)) {
			base = ' ' + formatError(value);
		}

		if (keys.length === 0 && (!array || value.length == 0)) {
			return braces[0] + base + braces[1];
		}

		if (recurseTimes < 0) {
			if (isRegExp(value)) {
				return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
			} else {
				return ctx.stylize('[Object]', 'special');
			}
		}

		ctx.seen.push(value);

		var output;
		if (array) {
			output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
		} else {
			output = keys.map(function(key) {
				return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
			});
		}

		ctx.seen.pop();

		return reduceToSingleString(output, base, braces);
	}

	function formatPrimitive(ctx, value) {
		switch (typeof value) {
			case 'undefined':
				return ctx.stylize('undefined', 'undefined');

			case 'string':
				var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '').replace(/'/g, "\\'").replace(/\\"/g, '"') + '\'';
				return ctx.stylize(simple, 'string');

			case 'number':
				return ctx.stylize('' + value, 'number');

			case 'boolean':
				return ctx.stylize('' + value, 'boolean');
		}
		// For some reason typeof null is "object", so special case here.
		if (value === null) {
			return ctx.stylize('null', 'null');
		}
	}

	function formatError(value) {
		return '[' + Error.prototype.toString.call(value) + ']';
	}

	function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
		var output = [];
		for (var i = 0, l = value.length; i < l; ++i) {
			if (Object.prototype.hasOwnProperty.call(value, String(i))) {
				output.push(formatProperty(ctx, value, recurseTimes, visibleKeys, String(i), true));
			} else {
				output.push('');
			}
		}
		keys.forEach(function(key) {
			if (!key.match(/^\d+$/)) {
				output.push(formatProperty(ctx, value, recurseTimes, visibleKeys, key, true));
			}
		});
		return output;
	}

	function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
		var name, str, desc;
		desc = Object.getOwnPropertyDescriptor(value, key) || {
			value : value[key]
		};
		if (desc.get) {
			if (desc.set) {
				str = ctx.stylize('[Getter/Setter]', 'special');
			} else {
				str = ctx.stylize('[Getter]', 'special');
			}
		} else {
			if (desc.set) {
				str = ctx.stylize('[Setter]', 'special');
			}
		}
		if (!visibleKeys.hasOwnProperty(key)) {
			name = '[' + key + ']';
		}
		if (!str) {
			if (ctx.seen.indexOf(desc.value) < 0) {
				if (recurseTimes === null) {
					str = formatValue(ctx, desc.value, null);
				} else {
					str = formatValue(ctx, desc.value, recurseTimes - 1);
				}
				if (str.indexOf('</br>') > -1) {
					if (array) {
						str = str.split('</br>').map(function(line) {
							return '     ' + line;
						}).join('</br>').substr(2);
					} else {
						str = '</br>' + str.split('</br>').map(function(line) {
							return '      ' + line;
						}).join('</br>');
					}
				}
			} else {
				str = ctx.stylize('[Circular]', 'special');
			}
		}
		if ( typeof name === 'undefined') {
			if (array && key.match(/^\d+$/)) {
				return str;
			}
			name = JSON.stringify('' + key);
			if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
				name = name.substr(1, name.length - 2);
				name = ctx.stylize(name, 'name');
			} else {
				name = name.replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'");
				name = ctx.stylize(name, 'string');
			}
		}

		return name + ': ' + str;
	}

	function reduceToSingleString(output, base, braces) {
		var numLinesEst = 0;
		var length = output.reduce(function(prev, cur) {
			numLinesEst++;
			if (cur.indexOf('</br>') >= 0)
				numLinesEst++;
			return prev + cur.length + 1;
		}, 0);

		if (length > 60) {
			return braces[0] + (base === '' ? '' : base + '</br> ') + ' ' + output.join(',</br>  ') + ' ' + braces[1];
		}

		return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
	}

	// NOTE: These type checking functions intentionally don't use `instanceof`
	// because it is fragile and can be easily faked with `Object.create()`.
	function isArray(ar) {
		return Array.isArray(ar) || ( typeof ar === 'object' && objectToString(ar) === '[object Array]');
	}


	Frame5.prototype.isArray = isArray;

	function isRegExp(re) {
		return typeof re === 'object' && objectToString(re) === '[object RegExp]';
	}


	Frame5.prototype.isRegExp = isRegExp;

	function isDate(d) {
		return typeof d === 'object' && objectToString(d) === '[object Date]';
	}


	Frame5.prototype.isDate = isDate;

	function isError(e) {
		return typeof e === 'object' && objectToString(e) === '[object Error]';
	}


	Frame5.prototype.isError = isError;

	function objectToString(o) {
		return Object.prototype.toString.call(o);
	}

	return Frame5 = new Frame5()
});

