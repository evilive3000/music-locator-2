"use strict";

const co = require("co");
const mongodb = require("mongodb");
const Chalk = require("chalk");
const ObjectID = mongodb.ObjectID;
let _db = null;

function db(cfg) {
  return co(function*() {
    const url = `mongodb://${cfg.host}:${cfg.port}/${cfg.name}?${cfg.options || ""}`;
    return _db ? _db : mongodb.MongoClient.connect(url).then(r => _db = r);
  });
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
        if (e.message !== 'VK Error') console.log(e);
        success = false;
      }
      console.log(Chalk.bgRed(`repeat in ${2 * delay} sec`));
      yield wait(delay *= 2);
    } while (!success && delay < 128);
    throw new Error("repeater timeout!");
  })
}

function closeDb() {
  return _db ? _db.close() : null;
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

module.exports = {collection, date2ObjectID, DAY, repeatrequest, closeDb};
