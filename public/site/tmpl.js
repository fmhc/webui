define(['core'], function(core) {
	cache = {}
	var htmlCache = {}
	var wrapper = ['<div id="{{id}}">', '</div>']
	var Tmpl = function(name, tag, Class) {
		this.id = core.uuid().split('-').shift()
		this.name = name
		this.tag = tag
		this.wrapper = ['<' + tag + ' id="{{id}}" class="' + ( Class ? Class : '') + '">', '</' + tag + '>']
		this.compile = cache[this.name] ||
		function() {
			return false
		}

	}

	Tmpl.prototype.render = function(data) {
		return this.compile(data)
	}

	Tmpl.prototype.append = function(data, attach) {
		var html = this.wrapper[0].replace('{{id}}', this.id)
		html += this.render(data)
		html += this.wrapper[1]
		html = html
		$(attach).append(html)
		return html
	}
	Tmpl.prototype.prepend = function(data, attach) {
		var html = this.wrapper[0].replace('{{id}}', this.id)
		html += this.render(data)
		html += this.wrapper[1]
		$(attach).prepend(html)

	}

	Tmpl.prototype.update = function(data) {
		var el = $('#' + this.id)
		el.html()
		el.html(this.render(data))
	}

	Tmpl.prototype.getEl = function() {
		var el = $('#' + this.id)
		return el
	}

	Tmpl.prototype.init = function(cb) {
		if (cache[this.name]) {
			return cb()
		}
		var self = this
		core.xhr({
			url : '/view/' + this.name + '.ejs'
		}).on('end', function(data) {
			cache[self.name] = self.compile = ejs.compile(data, {})
			cb()
		}).on('error', function(err) {

			console.log(err)
		})
	}
	core.extend({
		Tmpl : Tmpl,
		cacheTmpl : function(cb) {
			core.xhr({
				url : '/page-cache'
			}).on('end', function(data) {
				for (var key in data) {
					cache[key] = ejs.compile(data[key], {})
				}
				cb()
			}).on('error', function(err) {

				console.log(err)
			})
		}
	})
	return Tmpl
});
