"use strict";

const co = require('co');
const _ = require('lodash');
const config = require('./config');
const ws = require('./utils/workingset')(config);
const getSiblings = require('./utils/siblings');
const store = require('./utils/store')(config);
const tidido = require('./providers/tidido');
const async = require('async');
const Chalk = require('chalk');
const mutils = require('./utils/mutils');

const colors = ['red', 'green', 'blue', 'yellow', 'magenta', 'cyan', /*'white', */'gray'/*, 'black'*/];

/**
 *
 * @param provider
 * @param id
 * @param pid
 * @param callback
 */
function processSong(provider, id, pid, callback) {
  const color = colors.shift() || 'bgRed';
  const cstr = Chalk[color];
  const writeln = str => process.stdout.write(cstr(`[${pid}] ${str}\n`));

  co(function*() {
    const _id = id._id.toString();

    writeln(`fetching: ${_id}`);
    const song = yield tidido.fetchOne(_id);
    song._id = id._id;
    const title = `${song.artist} - ${song.title}`;

    writeln(`siblings: ${title}`);
    const siblings = yield getSiblings(provider, song, config);

    const mse = siblings.map(s => s.mse.val.toFixed(2));
    mse.length === 0
      ? writeln(`"${title}" ${cstr.bold("[no siblings]")}`)
      : writeln(`"${title}" has siblings: ${cstr.bold(`[${mse.join(", ")}]`)}`);

    yield store(provider, song, siblings);
    colors.push(color);
  })
    .then(callback).catch(callback);
}

/**
 *
 * @returns {String}
 */
function getProvider() {
  const name = process.argv[2];
  if (["youtube", "zv"].includes(name)) {
    return name;
  }
  throw new Error(`Provider ${name} not defined.`);
}


const provider = getProvider();
const limit = parseInt(process.argv[3]) || 3;
const topN = parseInt(process.argv[4]) || 3000;
const days = parseInt(process.argv[5]) || 3;

console.log(`Provider: ${provider}`);
console.log(`Threads: ${limit}`);
console.log(`Top: ${topN}`);
console.log(`Days: ${days}`);

/**
 *
 */
co(function*() {
  const ids = yield ws(provider, topN, days);

  console.log(`${ids.length} songs will be looked up on ${provider}`);

  async.eachOfLimit(ids, limit, _.partial(processSong, provider), err => {
    err && console.log(err);
    console.log('done');
    mutils.closeDb();
  })

}).catch(e => {
  console.log(e);
  process.exit();
});