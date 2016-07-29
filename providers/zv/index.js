"use strict";

const co = require('co');
const request = require('superagent');
const cheerio = require('cheerio');
const tools = require('../tools');
const repeater = require('../../utils/mutils').repeatrequest;

const host = "http://zv.fm";
const headers = [
  ['Cookie', 'zvAuth=1'],
  ['Referer', 'http://zv.fm/new']
];

/**
 *
 * @param res
 * @returns {*}
 */
function parseresponse(res) {
  let cheerio = require('cheerio');
  let $ = cheerio.load(res.text);
  return $("#container .song").map((index, item)=> {
    const $item = $(item);
    const artist = $item.find('.song-artist').text();
    const title = $item.find('.song-name').text();
    const $play = $($item.find('.song-play'));
    const duration = $play.data('time');
    const id = $play.data('sid');
    const url = host + $play.data('url');
    return {id, artist, title, duration, url}
  }).get();
}

/**
 *
 * @type {Function}
 */
const find = repeater(function (song) {
  const search = `${song.artist} ${song.title}`;
  const req = request
    .get(`${host}/mp3/search`)
    .query({keywords: search.replace(/[)!]/g, ' ')});

  headers.forEach(header => req.set.apply(req, header));
  return req.then(parseresponse, err => Promise.reject(err));
});

/**
 *
 * @param A
 * @param B
 * @returns {number}
 */
function simpleScore(A, B) {
  const durDelta = Math.abs(A.duration - B.duration);
  let score = durDelta > 3 ? 0 : 1 - Math.min(1, Math.pow(durDelta, 2) / 100);
  // если в названии содержится слово "cover"
  return score * (/\bcover\b/i.test(B.title) ? 0.0 : 1.0);
}

/**
 *
 * @param song
 * @param limit
 * @returns {Promise}
 */
function getCandidates(song, limit) {
  return co(function*() {
    let dests = yield find(song);
    dests = tools.softFilter(song, dests, 20, simpleScore);
    yield dests.map(s => tools.filesize(s, {headers}));
    return tools.softFilter(song, dests, limit);
  });
}

module.exports = {getCandidates};