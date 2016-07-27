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

const colors = ['red', 'green', 'blue', 'yellow', 'magenta', 'cyan', 'white', 'gray', 'black'];

function processChunk(provider, ids, callback) {
  const color = colors.shift() || 'bgRed';
  const cstr = Chalk[color];
  let counter = ids.length;
  const writeln = str => process.stdout.write(cstr(`[${counter}] ${str}\n`));

  co(function*() {
    for (const id of ids) {
      const _id = id._id.toString();

      writeln(`fetching: ${_id}`);
      const song = yield tidido.fetchOne(_id);
      song._id = id._id;
      const title = `${song.artist} - ${song.title}`;

      writeln(`siblings: ${title}`);
      const siblings = yield getSiblings(provider, song, config);

      const mse = siblings.map(s => s.mse.val.toFixed(2));
      mse.length === 0
        ? writeln(cstr.bold(`"${title}" [no siblings]`))
        : writeln(cstr.bold(`"${title}" has siblings: [${mse.join(", ")}]`));

      yield store(provider, song, siblings);
      counter--;
    }
    colors.push(color);
  }).then(callback)
    .catch(callback);
}

co(function*() {
  const provider = 'youtube';
  const limit = parseInt(process.argv[2]) || 3;
  const ids = yield ws(provider, 1000, 1);
  const chunks = _.chunk(ids, Math.ceil(ids.length / limit));

  async.each(chunks, _.partial(processChunk, provider), err => {
    err && console.log(err);
    console.log('done');
  })

}).catch(e => console.log(e));