"use strict";

const config = require('../config');
const top = require('./top')(config);
const co = require('co');
const mutils = require('./mutils');
const _ = require('lodash');

module.exports = function (config) {
  const coll = mutils.collection(config.db.write, "tidido");
  return function workingset(provider, topN, days) {
    return co(function*() {
      const tidido = yield coll;
      const topsongs = yield top(topN, days);
      const exists = yield tidido.find(
        {[`altsrc.${provider}`]: {$exists: true}},
        {_id: true}
      ).toArray();
      return _.differenceBy(topsongs, exists, s => s._id.toString());
    });
  };
};

