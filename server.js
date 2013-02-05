var express = require('express');
var fs = require("fs");
var ejs = require('ejs');
var path = require('path');
ejs.open = '{{';
ejs.close = '}}';

var CONFIG = {
	uri : 'webui.mangoraft.com',
	wsHost : 'ws.api.mangoraft.com',
	wsPort : 9004,
	static : 'static.us.aws.mangoraft.com'
}
function mixin(c) {
	for (var key in CONFIG) {
		c[key] = CONFIG[key]
	}
	return c
}

var app = module.exports = express.createServer(//express.logger(),
//
express.cookieParser(),
//
express.static('/public'),
//
express.session({
	secret : 'keyboard cat'
}), express.bodyParser());
app.register('.ejs', require('ejs'));

app.set('view engine', 'ejs');

app.set('views', path.join('/views'));

app.get('/', function(req, res) {
	res.render('index', {
		CONFIG : mixin({
			start : 'loadpackages'
		})
	})
})
app.get('/graphs', function(req, res) {
	res.render('graphs', {
		CONFIG : mixin({
			start : 'showGraph'
		})
	})
})
app.get('/history', function(req, res) {
	res.render('history', {
		CONFIG : mixin({
			start : 'showHistoryStats'
		})
	})
})
app.get('/create', function(req, res) {
	res.render('create', {
		CONFIG : mixin({
			//start : 'showHistoryStats'
		})
	})
})
app.get('/views/app-info', function(req, res) {
	res.sendfile(__dirname + '/views/app-info.ejs')
})
app.listen(3000)
