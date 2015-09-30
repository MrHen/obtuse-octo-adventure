# obtuse-octo-adventure

A simple card game. To see it in action, start at http://mrhen.github.io/obtuse-octo-adventure (be gentle; it can take some time to wake up the server.)

## Technical Overview

The app is split into `client` and `server` folders but could be split into two repos without trouble ([with one exception](https://github.com/MrHen/obtuse-octo-adventure/blob/master/server/src/api.d.ts)).

* Client
  * Simple wrapper to show off the REST API
  * [TypeScript](http://www.typescriptlang.org/) + [Angular](https://angularjs.org/)
  * Uses [gulp](http://gulpjs.com/) build pipeline _[(source)](https://github.com/MrHen/obtuse-octo-adventure/blob/master/client/gulpfile.js)_
  * Deployed at http://mrhen.github.io/obtuse-octo-adventure
    * Deploy using `gulp deploy` from the client directory
    * Builds the entire app and publishes the client files to GitHub Pages
  * Development only node instance _[(source)](https://github.com/MrHen/obtuse-octo-adventure/blob/master/client/src/app.ts)_
* Server
  * Deployed at https://murmuring-tundra-3318.herokuapp.com/ (no exposed server dashboard at this time)
    * Hosted on Heroku
    * Be gentle; it can take some time to wake up the Heroku instance
    * Uses `npm postinstall` hook to build TypeScript and run tests
  * REST API
     * Behavior declared using [controller interfaces](https://github.com/MrHen/obtuse-octo-adventure/blob/master/server/src/routes/Routes.ts)
     * Initalization and base route driven by the [core app](https://github.com/MrHen/obtuse-octo-adventure/blob/master/server/src/app.ts#L45)
  * "Hot swappable" data stores
    * Development environment uses an [in-memory variation](https://github.com/MrHen/obtuse-octo-adventure/blob/master/server/src/datastore/DataStoreMemory.ts)
    * Production uses [Redis](http://redis.io/) _[(source)](https://github.com/MrHen/obtuse-octo-adventure/blob/master/server/src/datastore/DataStoreRedis.ts)_
    * [Data store tests](https://github.com/MrHen/obtuse-octo-adventure/blob/master/server/src/datastore/DataStore.spec.ts) run against either and should be run against a final environment setup
    * Generates data driven events using [Redis PubSub](http://redis.io/topics/pubsub)
  * Event services
    * Client event traffic handled with [Socket.IO](http://socket.io/) _[source](https://github.com/MrHen/obtuse-octo-adventure/blob/master/server/src/services/Sockets.ts)_
       * Translates back-end events into WebSocket friendly messages and event names
       * Assumes only one real user; would need to be extended to support more than one user at a time
    * Game service hooks into Redis PubSub and reacts using a game event loop _[source](https://github.com/MrHen/obtuse-octo-adventure/blob/master/server/src/services/GameService.ts)_
    * Listener chain is set up in the [core app](https://github.com/MrHen/obtuse-octo-adventure/blob/master/server/src/app.ts#L80)
    * Events are not setup to scale horizontally in this release but it was designed with that direction in mind
