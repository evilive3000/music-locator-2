"use strict";


const co = require('co');
const request = require('superagent');
const tools = require('../tools');
const repeater = require('../../utils/mutils').repeatrequest;
const tokens = require('./tokens'),
  tokeman = new (require('./token_manager'))(tokens);

/**
 *
 * @param err
 * @param token
 */
function handleError(err, token) {
  switch (err.code) {
    case 'vk5':
      tokeman.dead(token);
      break;
    case 'ECONNRESET':
      tokeman.bad(token);
      break;
    default:
      /* !!! */
      console.log('[error:vkHandleError]');
      throw err;
  }
  console.log(err.message||err, token);
  throw new Error('VK Error');
}

/**
 *
 * @param res
 * @returns {*}
 */
function handleResponse(res) {
  if (res.body.error) {
    const {error_code, error_msg:message} = res.body.error;
    return Promise.reject({code: `vk${error_code}`, message});
  }
  const items = res.body.response.items;
  items.forEach((v, k) => {
    items[k].url = v.url.split('?')[0]
  });
  return items;
}

const find = repeater(function (song) {
  return co(function*() {
    const token = yield tokeman.getId();
    return request
      .get("https://api.vk.com/method/audio.search")
      .query({
        q: `${song.artist} ${song.title}`,
        count: 150,
        lang: "ru",
        v: "5.50",
        https: 0,
        access_token: token
      })
      .then(handleResponse, err => Promise.reject(err))
      .catch(err => handleError(err, token))
  })
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
  return score * (/\bcover\b/i.test(`${B.artist} ${B.title}`) ? 0.0 : 1.0);
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
    yield dests.map(tools.filesize);
    return tools.softFilter(song, dests, limit);
  });
}

module.exports = {getCandidates};