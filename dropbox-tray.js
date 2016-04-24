/**
 * dropbox-tray - A simple Dropbox tray icon using NW.js
 * https://github.com/gavinhungry/dropbox-tray
 */

(function() {
  'use strict';

  var pkg = require('./package.json');
  var gui = require('nw.gui');

  var child_process = require('child_process');
  var path = require('path');
  var _ = require('underscore');
  _.str = require('underscore.string');

  /**
   * Resolve a dot-delimited string upon an object
   *
   * @param {Object} obj
   * @param {String} str
   * @return {Mixed}
   */
  var resolve = function(obj, str) {
    if (!str || !_.isString(str)) {
      return obj;
    }

    return _.reduce(str.split('.'), function(obj, prop) {
      return obj ? obj[prop] : null;
    }, obj);
  };

  var DROPBOX = {
    BIN: resolve(pkg, 'dropbox.bin'),

    ICON: {
      BUSY: resolve(pkg, 'dropbox.icons.busy') || 'img/busy.png',
      BUSY2: resolve(pkg, 'dropbox.icons.busy2') || 'img/busy2.png',
      ERROR: resolve(pkg, 'dropbox.icons.error') || 'img/error.png',
      IDLE: resolve(pkg, 'dropbox.icons.idle') || 'img/idle.png',
      OFFLINE: resolve(pkg, 'dropbox.icons.offline') ||  'img/offline.png'
    },

    STATUS: {
      IDLE: 'Up to date',
      INDEXING: 'Indexing',
      OFFLINE: 'Dropbox isn\'t running!',
      SYNCING: 'Syncing',
      UPLOADING: 'Uploading'
    },

    DIR: (function() {
      var infoPath = resolve(pkg, 'dropbox.info');
      if (!infoPath) {
        return;
      }

      var info = require(path.join(process.env.HOME, infoPath));
      return resolve(info, 'personal.path');
    })()
  };

  var dropbox = {
    tray: new gui.Tray({
      tooltip: 'Dropbox',
      icon: DROPBOX.ICON.OFFLINE
    }),

    /**
     * Execute a dropbox-cli command
     *
     * @param {String} option
     * @param {Array:String} [args]
     * @return {String}
     */
    cli: _.memoize(function(option, args) {
      var command = _.str.sprintf('%s %s %s', DROPBOX.BIN, option, (args || []).join(' '));

      try {
        return child_process.execSync(command).toString().trim();
      } catch(err) {
        return null;
      }
    }, function() {
      return _.flatten(arguments).join(' ');
    }),

    /**
     * Get an array of status messages
     *
     * @return {Array:String}
     */
    getStatuses: function() {
      return this.cli('status').split('\n');
    },

    /**
     * Get the primary status message
     *
     * @return {String}
     */
    getStatus: function() {
      var statuses = this.getStatuses();

      return _.find(statuses, function(status) {
        return _.str.startsWith(status, DROPBOX.STATUS.UPLOADING) ||
          _.str.startsWith(status, DROPBOX.STATUS.SYNCING) ||
          _.str.startsWith(status, DROPBOX.STATUS.INDEXING);
      }) || _.first(statuses);
    },

    /**
     * Check if Dropbox is running or not
     *
     * @return {Boolean} true if Dropbox is running, false otherwise
     */
    isRunning: function() {
      return this.getStatus() !== DROPBOX.STATUS.OFFLINE;
    },

    /**
     * Check if Dropbox is busy or idle
     *
     * @return {Boolean} true if Dropbox is busy, false if Dropbox is idle
     */
    isBusy: function() {
      return this.isRunning() && this.getStatus() !== DROPBOX.STATUS.IDLE;
    },

    /**
     * Flushes the cache of memoized functions
     */
    flush: function() {
      this.cli.cache = {};
    }
  };

  dropbox.tray.on('click', function() {
    gui.Shell.showItemInFolder(path.join(DROPBOX.DIR, '/.dropbox'));
  });

  setInterval(function() {
    var status = dropbox.getStatus();
    if (dropbox.tray.tooltip !== status) {
      dropbox.tray.tooltip = status;
    }

    if (dropbox.isBusy()) {
      if (dropbox.tray.icon === DROPBOX.ICON.BUSY) {
        dropbox.tray.icon = DROPBOX.ICON.BUSY2;
      } else {
        dropbox.tray.icon = DROPBOX.ICON.BUSY;
      }
    } else {
      dropbox.tray.icon = dropbox.isRunning() ? DROPBOX.ICON.IDLE : DROPBOX.ICON.OFFLINE;
    }
  }, 500);

  setInterval(function() {
    dropbox.flush();
  }, 2000);

})();
