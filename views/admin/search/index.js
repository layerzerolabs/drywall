'use strict';

exports.find = function(req, res, next){
  req.query.q = req.query.q ? req.query.q : '';
  var regexQuery = new RegExp('^.*?'+ req.query.q +'.*$', 'i');
  var outcome = {};

  req.app.db.models.User.find({search: regexQuery}, 'username').sort('username').limit(10).lean().exec(function(err, results) {
    if (err) {
      console.log(err);
      next(err);
    }
    outcome.users = results;
    console.log(outcome);
    res.send(outcome);
  });
};
