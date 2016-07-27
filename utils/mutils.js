"use strict";

const _ = require('lodash');
const co = require('co');
const mongodb = require("mongodb");
const ObjectID = mongodb.ObjectID;

function db(cfg) {
  const url = `mongodb://${cfg.host}:${cfg.port}/${cfg.name}?${cfg.options || ""}`;
  return mongodb.MongoClient.connect(url);
}

function collection(dbcfg, name) {
  return db(dbcfg).then(db => db.collection(name));
}

function date2ObjectID(timestamp) {
  return ObjectID(Math.floor(timestamp / 1000).toString(16) + '0000000000000000');
}

const DAY = 24 * 60 * 60 * 1000;

function wait(sec) {
  return new Promise(resolve => setTimeout(resolve, sec * 1000))
}

/**
 *
 * @param fn
 * @param thisArg
 * @returns {*|Promise}
 */
function repeater(fn, thisArg) {
  let delay = .5;
  const args = Array.prototype.slice.call(arguments, 2);

  return co(function*() {
    let success = false;
    do {
      try {
        return yield fn.apply(thisArg, args)
      } catch (e) {
        if (e.status === 404) throw e.response.error;
        success = false;
      }
      console.log(`repeat in ${2 * delay} sec`);
      yield wait(delay *= 2);
    } while (!success && delay < 128);
    throw new Error("repeater timeout!");
  })
}

/**
 *
 * @param fn
 * @param thisArg
 * @returns {Function}
 */
const repeatrequest = (fn, thisArg) => function () {
  return repeater(fn, thisArg, ...arguments)
};


module.exports = {collection, date2ObjectID, DAY, repeatrequest};
