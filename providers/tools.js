"use strict";

const _ = require('lodash');
const co = require('co');
const request = require('superagent');
const fp = require('fpcalc');
const fpOffset = require('../utils/fingerprint').findOffset;

/**
 *
 * @param A
 * @param B
 * @returns {number}
 */
function simpleScore(A, B) {
  const durDelta = Math.abs(A.duration - B.duration);
  let score = durDelta > 3 ? 0 : 1 - Math.min(1, Math.pow(durDelta, 2) / 100);

  // хламное качество нулим
  score *= B.bitrate < Math.min(112, A.bitrate) ? 0 : 1.0;
  const bitrateDelta = Math.abs(A.bitrate - B.bitrate);
  score *= (1 - (0.01 * bitrateDelta / 192));

  return score;
}

/**
 *
 * @param song
 * @param dests
 * @param limit
 * @param scoreFn
 * @returns {*}
 */
function softFilter(song, dests, limit, scoreFn) {
  scoreFn || (scoreFn = simpleScore);
  limit || (limit = 7);

  return _(dests)
    .map(dest => _.set(dest, 'score', scoreFn(song, dest)))
    .filter('score')
    .orderBy('score')
    .takeRight(limit)
    .value();
}

/**
 *
 * @param songs
 * @param len
 * @returns {*}
 */
function fetchFingerprints(songs, len) {
  const promises = songs
  // отбираем только те которые еще не загружались и у которых есть url
    .filter(s => !s.fp)
    // загружаем фингерпринты
    .map((v, k) => fpcalc(songs[k], len));

  return Promise.all(promises);
}

/**
 *
 * @param song
 * @param dests
 * @param mse
 * @returns {*}
 */
function hardFilter(song, dests, mse) {
  // сравниванием файлы
  dests.forEach((v, k) => {
    dests[k].mse = fpOffset(song.fp, v.fp)
  });

  return dests.filter(v => _.get(v, 'mse.val', 32) < mse);
}

/**
 * Загрузка фингерпринта для песни
 *
 * @param song
 * @param len
 * @returns {Promise<T>|Promise}
 */
function fpcalc(song, len) {
  len || (len = 200);

  return new Promise(resolve => {
    if (!song.url) return resolve(_.set(song, 'fp', []));

    const callback = (err, fp) => {
      err && console.log('[error:fpcalc]', err);
      song.fp = err ? [] : fp.fingerprint;
      resolve(song);
    };

    // тут нужен типа таймаут, так как fpcalc
    // подвисает в вк на песне мерлина менсона
    fp(song.url, {raw: true, length: len}, callback);
  });
}

/**
 *
 * @param song
 * @param options
 * @returns {Promise}
 */
function filesize(song, options) {
  if (!song || !song.url) return song;
  options || (options = {});

  const req = request
    .head(song.url)
    .redirects(options.redirects || 2);

  if (options.headers) {
    options.headers.forEach(header => req.set.apply(req, header));
  }

  return req.then(res => res, err => {
    console.log('[error:filesize]', err);
    song.size = null;
    song.bitrate = 0;
    return Promise.resolve(song);
  }).then(res => {
    song.size = _.toInteger(res.header['content-length']);
    song.bitrate || (song.bitrate = _.toInteger(0.008 * song.size / song.duration));
    if (res.redirects.length) {
      song.url = _.last(res.redirects);
    }
    return song;
  })
}

module.exports = {softFilter, hardFilter, fetchFingerprints, filesize};