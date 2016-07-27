"use strict";

const co = require('co');
const mutils = require('./mutils');
const _ = require('lodash');
const db_fields = 'id.artist.title.bitrate.duration.url.date.size.mse'.split('.');

module.exports = function (config) {
  const coll = mutils.collection(config.db.write, "tidido");

  return function* store(provider, song, siblings) {
    const tidido = yield coll;
    const filter = {_id: song._id};
    const update = {
      $set: {
        tidido: _.pick(song, ['artist', 'title', 'bitrate', 'duration']),
        [`altsrc.${provider}`]: {
          update: new Date,
          ids: siblings.map(s => (s['owner_id'] ? s['owner_id'] + "_" : "") + s['id']),
          meta: siblings.map(s => _.pick(s, db_fields))
        }
      }
    };
    const options = {upsert: true};
    return tidido.updateOne(filter, update, options);
  };
};

