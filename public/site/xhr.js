define(['core'], function(Frame5) {
	Frame5.extend({

		xhr : function(options) {

			var request = new Frame5.EventEmitter();

			if (!options.url) {

				setTimeout(function() {
					request.emit('error', new Error('options.url is needed.'))
				}, 1)
				return request;
			}

			var req = new XMLHttpRequest();
			request.xhr = req
			var method = options.method || 'GET';
			var url = options.url;
			var async = ( typeof options.async != 'undefined' ? options.async : true);

			//
			options.headers = options.headers || {};
			req.queryString = options.body;
			req.open(method, url, async);
			//

			if (options.auth) {
				options.headers['Authorization'] = Frame5.config.get('Authorization');

			}

			options.headers['content-type'] = options.headers['content-type'] || 'application/json';
			if (options.headers['content-type'] === 'application/json' && options.body) {
				options.body = JSON.stringify(options.body);
			}
			req.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

			for (key in options.headers) {
				if (options.headers.hasOwnProperty(key)) {
					req.setRequestHeader(key, options.headers[key]);
				}
			}
			req.onabort = req.onerror = function() {
				console.log('onerror')
				request.emit('error')
			}
			function hdl() {
				if (req.readyState == 4) {

					if ((/^[20]/).test(req.status)) {
						request.responseText = req.responseText;
						request.status = req.status;
						if (req.getResponseHeader('x-jquery-tmpl')) {
							request.emit('tmpl', request.responseText, req.getResponseHeader('x-jquery-tmpl'), req)
						} else {

							var json;
							try {
								json = JSON.parse(req.responseText)
							} catch(err) {
								return request.emit('end', req.responseText, req)
							}
							if (json.error) {
								alert(json.error.stack)
								return request.emit('error', json, req)
							}

							request.emit('end', json, req)
						}
					}
					if ((/^[45]/).test(req.status))
						request.emit('error', req.responseText, req)
					if (req.status === 0)
						request.emit('abort', options, req)
				}
			}

			if (async) {
				req.onreadystatechange = hdl;
			}
			req.send(options.body);
			if (!async)
				hdl();
			return request;
		}
	})

});

