"use strict";

function fetchOne(id) {
  const [url, duration, bitrate] = ['google.com', 123, 192];
  return Promise.resolve({id, url, duration, bitrate});
}

function fetchMany(ids) {
  return Promise.resolve(ids);
}

module.exports = {fetchOne, fetchMany};

