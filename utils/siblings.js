"use strict";

const co = require('co');
const tools = require('../providers/tools');

const providers = {
  'youtube': require('../providers/youtube'),
  'vk': require('../providers/vk'),
  'zv': require('../providers/zv')
};

module.exports = function (providerName, song, config) {
  config || (config = {});

  if (!providerName in providers) {
    throw new Error(`${providerName} provider not found.`)
  }
  const provider = providers[providerName];

  return co(function*() {
    // ищем по песне (обычно это "артист+название")
    // и сразу же выполняем легкую префильтрацию
    let dests = yield provider.getCandidates(song, config.limit || 7);

    // подргужаем фингерпринты
    yield tools.fetchFingerprints([].concat(song, dests));

    // расчитываем mse и отфильтровываем по порогу
    return tools.hardFilter(song, dests, config.mse || 3);
  });
};
