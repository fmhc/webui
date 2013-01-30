var express = require('express');
var fs = require("fs");
var ejs = require('ejs');
var path = require('path');
ejs.open = '{{';
ejs.close = '}}';

var CONFIG = {
	uri : 'http://mangoraft.com',
	static : 'http://static.mangoraft.com'
}

var app = module.exports = express.createServer(//express.logger(),
//
express.cookieParser(),
//
express.static(__dirname + '/public'),
//
express.session({
	secret : 'keyboard cat'
}), express.bodyParser());
app.register('.ejs', require('ejs'));

app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, '/views'));

app.get('/', function(req, res) {
	res.render('index', {
		CONFIG : CONFIG
	})
})
app.get('/contact', function(req, res) {
	res.render('contact', {
		CONFIG : CONFIG
	})
})
app.listen(3000)
