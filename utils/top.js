"use strict";
const co = require('co');
const mutils = require('./mutils');

module.exports = function (config) {
  const coll = mutils.collection(config.db.read, "estats.raw2");

  return function top(n, days) {
    days || (days = 7);
    const fromdate = Date.now() - days * mutils.DAY;

    return co(function*() {
      const estats = yield coll;
      return yield estats
        .aggregate([
          {$match: {_id: {$gt: mutils.date2ObjectID(fromdate)}}},
          {$sort: {_id: 1}},
          {$group: {_id: '$song', count: {$sum: 1}, avg: {$avg: "$p"}}},
          {$sort: {count: -1}},
          {$limit: n}
        ], {allowDiskUse: true})
        .toArray();
    }).catch(e => console.log(e))
  };
};