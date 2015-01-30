/* global escape */

'use strict';

exports.find = function(req, res, next){
  req.query.username = req.query.username ? req.query.username : '';
  req.query.limit = req.query.limit ? parseInt(req.query.limit, null) : 20;
  req.query.page = req.query.page ? parseInt(req.query.page, null) : 1;
  req.query.sort = req.query.sort ? req.query.sort : '_id';

  var filters = {};
  if (req.query.username) {
    filters.username = new RegExp('^.*?'+ req.query.username +'.*$', 'i');
  }

  if (req.query.isActive) {
    filters.isActive = req.query.isActive;
  }

  if (req.query.roles && req.query.roles === 'admin') {
    filters['roles.admin'] = { $exists: true };
  }

  if (req.query.roles && req.query.roles === 'account') {
    filters['roles.account'] = { $exists: true };
  }

  req.app.db.models.User.pagedFind({
    filters: filters,
    keys: 'username email isActive',
    limit: req.query.limit,
    page: req.query.page,
    sort: req.query.sort
  }, function(err, results) {
    if (err) {
      return next(err);
    }

    if (req.xhr) {
      res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      results.filters = req.query;
      res.send(results);
    }
    else {
      results.filters = req.query;
      res.render('admin/users/index', { data: { results: JSON.stringify(results) } });
    }
  });
};

exports.read = function(req, res) {
  var outcome = {};
  var getAdminGroups = function(callback) {
    req.app.db.models.AdminGroup.find({}, 'name').sort('name').exec(function(err, adminGroups) {
      if (err) {
        return callback(err, null);
      }

      outcome.adminGroups = adminGroups;
      return callback(null, 'done');
    });
  };

  var getRecord = function(callback) {
    req.app.db.models.User.findById(req.params.id).populate('groups', 'name').exec(function(err, record) {
      if (err) {
        return callback(err, null);
      }

      outcome.record = record;
      return callback(null, 'done');
    });
  };

  var asyncFinally = function() {
    if (req.xhr) {
      res.send(outcome.record);
    }
    else {
      res.render('admin/users/details', { 
        data: { 
          record: escape(JSON.stringify(outcome.record)),
          adminGroups: outcome.adminGroups
        } 
      });
    }
  };
  require('async').parallel([getAdminGroups, getRecord], asyncFinally);
};

exports.create = function(req, res){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.body.username) {
      workflow.outcome.errors.push('Please enter a username.');
      return workflow.emit('response');
    }

    if (!/^[a-zA-Z0-9\-\_]+$/.test(req.body.username)) {
      workflow.outcome.errors.push('only use letters, numbers, -, _');
      return workflow.emit('response');
    }

    workflow.emit('duplicateUsernameCheck');
  });

  workflow.on('duplicateUsernameCheck', function() {
    req.app.db.models.User.findOne({ username: req.body.username }, function(err, user) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (user) {
        workflow.outcome.errors.push('That username is already taken.');
        return workflow.emit('response');
      }

      workflow.emit('createUser');
    });
  });

  workflow.on('createUser', function() {
    var fieldsToSet = {
      username: req.body.username,
      search: [
        req.body.username
      ]
    };
    req.app.db.models.User.create(fieldsToSet, function(err, user) {
      if (err) {
        return workflow.emit('exception', err);
      }

      workflow.outcome.record = user;
      return workflow.emit('response');
    });
  });

  workflow.emit('validate');
};

exports.update = function(req, res){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.body.isActive) {
      req.body.isActive = 'no';
    }

    if (!req.body.username) {
      workflow.outcome.errfor.username = 'required';
    }
    else if (!/^[a-zA-Z0-9\-\_]+$/.test(req.body.username)) {
      workflow.outcome.errfor.username = 'only use letters, numbers, \'-\', \'_\'';
    }

    if (!req.body.email) {
      workflow.outcome.errfor.email = 'required';
    }
    else if (!/^[a-zA-Z0-9\-\_\.\+]+@[a-zA-Z0-9\-\_\.]+\.[a-zA-Z0-9\-\_]+$/.test(req.body.email)) {
      workflow.outcome.errfor.email = 'invalid email format';
    }

    if (workflow.hasErrors()) {
      return workflow.emit('response');
    }

    workflow.emit('duplicateUsernameCheck');
  });

  workflow.on('duplicateUsernameCheck', function() {
    req.app.db.models.User.findOne({ username: req.body.username, _id: { $ne: req.params.id } }, function(err, user) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (user) {
        workflow.outcome.errfor.username = 'username already taken';
        return workflow.emit('response');
      }

      workflow.emit('duplicateEmailCheck');
    });
  });

  workflow.on('duplicateEmailCheck', function() {
    req.app.db.models.User.findOne({ email: req.body.email.toLowerCase(), _id: { $ne: req.params.id } }, function(err, user) {
      if (err) {
        return workflow.emit('exception', err);
      }

      if (user) {
        workflow.outcome.errfor.email = 'email already taken';
        return workflow.emit('response');
      }

      workflow.emit('patchUser');
    });
  });

  workflow.on('patchUser', function() {
    var fieldsToSet = {
      isActive: req.body.isActive,
      username: req.body.username,
      email: req.body.email.toLowerCase(),
      search: [
        req.body.username,
        req.body.email
      ]
    };

    req.app.db.models.User.findByIdAndUpdate(req.params.id, fieldsToSet, function(err) {
      if (err) {
        return workflow.emit('exception', err);
      }
      workflow.emit('response');
    });
  });
  workflow.emit('validate');
};

exports.groups = function(req, res){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.user.isMemberOf('root')) {
      workflow.outcome.errors.push('You may not change the group memberships of users.');
      return workflow.emit('response');
    }

    if (!req.body.groups) {
      workflow.outcome.errfor.groups = 'required';
      return workflow.emit('response');
    }

    workflow.emit('patchUser');
  });

  workflow.on('patchUser', function() {
    var fieldsToSet = {
      groups: req.body.groups
    };

    req.app.db.models.User.findByIdAndUpdate(req.params.id, fieldsToSet, function(err, admin) {
      if (err) {
        return workflow.emit('exception', err);
      }

      admin.populate('groups', 'name', function(err, admin) {
        if (err) {
          return workflow.emit('exception', err);
        }

        workflow.outcome.admin = admin;
        workflow.emit('response');
      });
    });
  });

  workflow.emit('validate');
};
exports.password = function(req, res){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.body.newPassword) {
      workflow.outcome.errfor.newPassword = 'required';
    }

    if (!req.body.confirm) {
      workflow.outcome.errfor.confirm = 'required';
    }

    if (req.body.newPassword !== req.body.confirm) {
      workflow.outcome.errors.push('Passwords do not match.');
    }

    if (workflow.hasErrors()) {
      return workflow.emit('response');
    }

    workflow.emit('patchUser');
  });

  workflow.on('patchUser', function() {
    req.app.db.models.User.encryptPassword(req.body.newPassword, function(err, hash) {
      if (err) {
        return workflow.emit('exception', err);
      }

      var fieldsToSet = { password: hash };
      req.app.db.models.User.findByIdAndUpdate(req.params.id, fieldsToSet, function(err, user) {
        if (err) {
          return workflow.emit('exception', err);
        }

        user.populate('roles.admin roles.account', 'name.full', function(err, user) {
          if (err) {
            return workflow.emit('exception', err);
          }

          workflow.outcome.user = user;
          workflow.outcome.newPassword = '';
          workflow.outcome.confirm = '';
          workflow.emit('response');
        });
      });
    });
  });

  workflow.emit('validate');
};

exports.delete = function(req, res){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.user.isMemberOf('root')) {
      workflow.outcome.errors.push('You may not delete users.');
      return workflow.emit('response');
    }

    if (req.user._id === req.params.id) {
      workflow.outcome.errors.push('You may not delete yourself from user.');
      return workflow.emit('response');
    }

    workflow.emit('deleteUser');
  });

  workflow.on('deleteUser', function() {
    req.app.db.models.User.findByIdAndRemove(req.params.id, function(err) {
      if (err) {
        return workflow.emit('exception', err);
      }

      workflow.emit('response');
    });
  });

  workflow.emit('validate');
};
