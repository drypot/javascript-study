var init = require('../main/init');
var tokenize = require('./tokenizer').tokenize;
var es = require('../main/es');
var express = require('../main/express');
var error = require('../main/error');

init.add(function () {

	var app = express.app;

	console.log('search-api:');

	app.get('/api/search', function (req, res) {
		req.findUser(function (err, user) {
			if (err) return res.jsonErr(err);
			var tokens = tokenize(req.query.q || '');
			var pg = parseInt(req.query.pg) || 0;
			var pgsize = parseInt(req.query.ps) || 16;
			pgsize = pgsize > 64 ? 64 : pgsize < 0 ? 0 : pgsize;
			search(user, query, offset, limit, function (err, results) {
				if (err) {
					return res.jsonErr(err);
				}
				res.json({
					results: results
				});
			});
		});
	});

	function search(user, query, offset, limit, next) {
		if (query.length == 0) { // es 에 '' 넘어가면 에러난다.
			return next(null, []);
		}
		var form = {
			query: { query_string: { query: query, default_operator: 'and' } },
			sort: [ { cdate : "desc" } ],
			size: limit,
			from: offset
		}
		es.search(form, function (err, res) {
			if (err) return next(err);
			if (!res.body.hits) {
				return next(null, []);
			}
			var results = [];
			var categories = user.categories;
			res.body.hits.hits.forEach(function (hit) {
				var s = hit._source;
				var category = categories[s.cid];
				if (category && (s.visible || user.admin)) {
					results.push({
						pid: hit._id,
						tid: s.tid,
						cid: s.cid,
						cdate: s.cdate.getTime(),
						writer: s.writer,
						title: s.title,
						text: s.text.substring(0, 512)
					});
				}
			});
			next(null, results);
		});
	}

});
