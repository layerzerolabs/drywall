Differences from the standard Drywall
=====================================
## User Entity
This fork of Drywall is simpler in that it does not have separate entities for User, Account and Admin. Instead it just has one User entity.

In standard Drywall, for a user to be a member of a permissioned group, it has to have an Admin entity. The Admin entity is related to the group. In this version, the groups sit on the User entity directly.

The notion of Roles has not been entirely removed, however, I think that is the next step. Groups provide one permissioning system; why have two?

## Modularity
I am playing with the idea of making Drywall an npm module which you would install and keep separate from your own code.

There are reasons for and against this.

To this end I have changed the name of app.js to "index.js" and it now exports the app object. It also exports a `start` method which you should call after you have done all your own app setup. The start method applies a 404 catch-all so that any requests not covered by standard routes or by your own routes will be served with a 404 page. It then runs app.listen() to start the app.

Also, the authentication functions that was previously hidden inside routes.js is now attached to the app so that the user has access to `app.ensureAuthenticated`. (Also `app.ensureAccount`, etc, which I will soon remove).

Also, now, you do not have to put your views in the drywall views directory. You can set an additional view path in config.js. You can also of course statically serve whatever you like but make sure there are no naming clashes with drywall/public. If you want to extend the drywall layouts in your templates, you just need to use the right path, e.g. `extends ../../drywall/layouts/default`

Drywall
=============

A website and user system for Node.js. What you create with Drywall is more important than Drywall.

[![Dependency Status](https://david-dm.org/jedireza/drywall.svg?theme=shields.io)](https://david-dm.org/jedireza/drywall)
[![devDependency Status](https://david-dm.org/jedireza/drywall/dev-status.svg?theme=shields.io)](https://david-dm.org/jedireza/drywall#info=devDependencies)

Technology
------------

| On The Server | On The Client  | Development |
| ------------- | -------------- | ----------- |
| Express       | Bootstrap      | Grunt       |
| Jade          | Backbone.js    |             |
| Mongoose      | jQuery         |             |
| Passport      | Underscore.js  |             |
| Async         | Font-Awesome   |             |
| EmailJS       | Moment.js      |             |

Requirements
------------

You need [Node.js](http://nodejs.org/download/) and [MongoDB](http://www.mongodb.org/downloads) installed and running.

To install Mongo: http://docs.mongodb.org/manual/installation/

We use [Grunt](http://gruntjs.com/) as our task runner. Get the CLI (command line interface).

```bash
$ sudo npm install grunt-cli -g
```

We use [`bcrypt`](https://github.com/ncb000gt/node.bcrypt.js) for hashing secrets. If you have issues during installation related to `bcrypt` then [refer to this wiki page](https://github.com/jedireza/drywall/wiki/bcrypt-Installation-Trouble).

Installation
------------

```bash
$ git clone git@github.com:layerzerolabs/drywall.git && cd ./drywall
$ npm install
$ mv ./config.example.js ./config.js #set mongodb and email credentials
$ grunt
```

Setup
------------

You need a few records in the database to start using the user system.

Run these commands on mongo. __Obviously you should use your email address.__

```js
use drywall; //your mongo db name
```

```js
db.admingroups.insert({ _id: 'root', name: 'Root' });
db.users.save({ username: 'root', isActive: 'yes', email: 'your@email.addy', roles: ['admin'], groups: ['root'], search: ['root', 'your@email.addy'] });
```

Now just use the reset password feature to set a password.

 - `http://localhost:3000/login/forgot/`
 - Submit your email address and wait a second.
 - Go check your email and get the reset link.
 - `http://localhost:3000/login/reset/:email/:token/`
 - Set a new password.

Login. Customize. Enjoy.

Philosophy
------------

 - Create a website and user system.
 - Write code in a simple and consistent way.
 - Only create minor utilities or plugins to avoid repetitiveness.
 - Find and use good tools.
 - Use tools in their native/default behavior.

Features
------------

 - Basic front end web pages.
 - Contact page has form to email.
 - Login system with forgot password and reset password.
 - Signup and Login with Facebook, Twitter, GitHub, Google and Tumblr.
 - Optional email verification during signup flow.
 - Simplified user system.
 - Admin groups with shared permission settings.
 - Global admin quick search component.

Contributing
------------

Contributions welcome. Make sure your code passes `grunt lint` without error.

If you're changing something non-trivial or user-facing, you may want to submit an issue first.

License
------------

MIT

[![githalytics.com alpha](https://cruel-carlota.pagodabox.com/d41f60f22a2148e2e2dc6b705cd01481 "githalytics.com")](http://githalytics.com/jedireza/drywall)
