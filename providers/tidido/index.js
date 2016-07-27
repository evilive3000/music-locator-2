"use strict";

const request = require('superagent');
const _ = require('lodash');
const tools = require('../tools');
const mutils = require('../../utils/mutils');

/**
 *
 * @param res
 * @returns {*}
 */
function parseresponse(res) {
  if (_.isEmpty((res || {}).body)) return [];

  const artists = res.body.artists
    .reduce((prev, curr) => _.set(prev, curr.id, curr.fullname), {});

  return res.body.songs.map(function (song) {
    const res = _.pick(song, ['id', 'duration', 'bitrate', 'url']);
    res.artist = _(artists).pick(song.artistIds).values().join(' ');
    res.duration = ~~(song.duration / 1000);
    res.title = song.name;
    return res;
  });
}

// X-Requested-With = xmlhttprequest

/**
 *
 * @param id
 * @returns {Promise}
 */
function fetchOne(id) {
  return request
    .get('tidido.com/api/music/song')
    .query({sids: id.toString()})
    .then(parseresponse)
    .then(songs => songs.length ? tools.filesize(_.first(songs)) : null)
}

module.exports = {
  fetchOne: mutils.repeatrequest(fetchOne)
};

