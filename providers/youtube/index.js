"use strict";

const request = require('superagent');
const exec = require('child_process').exec;
const cheerio = require('cheerio');
const co = require('co');
const tools = require('../tools');
const _ = require('lodash');
const repeater = require('../../utils/mutils').repeatrequest;

/**
 *
 * @param song
 * @returns {Promise}
 */
const fetchOne = repeater(function fetchOne(song) {
  return new Promise(resolve=> {
    exec(`youtube-dl -j ${song.url}`, {timeout: 60000}, function (err, stdout, stderr) {
      if (stderr.length) {
        console.log('[fetchOne:error]', stderr, song);
        song.url = null;
      } else {
        const formats = stdout.length ? JSON.parse(stdout).formats : {};
        const o = _(formats)
          .filter(f => f.format_note.includes('udio'))
          .sortBy('filesize')
          .first();
        song.url = o ? o.url : null;
      }
      resolve(song);
    })
  })
});

/**
 *
 * @param res
 * @returns {*}
 */
function parseresponse(res) {
  let cheerio = require('cheerio');
  let $ = cheerio.load(res.text);
  return $("#results .yt-lockup-video").map((index, item)=> {
    const $item = $(item);
    const videotime = $item.find('.video-time').text().split(':');
    const duration = videotime[0] * 60 + parseInt(videotime[1]);
    const id = $item.data('context-item-id');
    const title = $item.find('.yt-uix-tile-link').text();
    const url = `https://www.youtube.com/watch?v=${id}`;
    return {id, title, duration, url}
  }).get();
}

const pages = ['EgIQAUgA6gMA', 'EgIQAUgU6gMA', 'EgIQAUgo6gMA', 'EgIQAUg86gMA'];
/**
 *
 * @param song
 * @param page
 * @returns {Promise}
 */
const find = repeater(function (song, page) {
  page || (page = 0);
  return request
    .get("https://www.youtube.com/results")
    .query({search_query: `${song.artist} intitle:"${song.title}"`})
    .query({sp: pages[page % pages.length]})
    .then(parseresponse);
});

/**
 * 
 * @param A
 * @param B
 * @returns {number}
 */
function simpleScore(A, B) {
  const durDelta = Math.abs(A.duration - B.duration);
  let score = durDelta > 4 ? 0 : 1 - Math.min(1, Math.pow(durDelta, 2) / 100);
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
    let page = 0;
    let dests = [];
    do {
      let pagedests = yield find(song, page);
      pagedests = tools.softFilter(song, pagedests, 20, simpleScore);
      // для ютуба не будем загружать размер файла и битрейт
      // yield dests.map(tools.filesize);
      dests = dests.concat(pagedests);
      // console.log(`page:${page}   length=${dests.length}`);
    } while (dests.length < 4 && ++page < pages.length);

    return yield tools
      .softFilter(song, dests, limit, simpleScore)
      .map(fetchOne);
  });
}

module.exports = {getCandidates};

