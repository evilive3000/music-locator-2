"use strict";

const co = require('co');
const _ = require('lodash');
const config = require('./config');
const mutils = require('./utils/mutils');

const providers = {

  vk: function (data) {
    // распихиваем все эти айдишники в более детально описаные элементы записи,
    // чтобы потом можно было отсортировать по MSE и выбрать обратно эти айдишники
    const items = _(data.meta)
      .map((v, k) => _.set(v, '_id', data.ids[k]))
      // сортируем по MSE и формируем массив ВК-айдишников
      // т.е. получили массив айдишников в порядке похожести
      // на тидидовскую песню, чем выше в массиве тем похожее.
      .sortBy('mse.val')
      .filter(v => v.mse.val < config.mse)
      .map(v => ({id: v._id, mse: v.mse.val}))
      .value();
    return items.length
      ? {update: data.update, items}
      : null
  },

  zv: function (data) {
    const items = _(data.meta)
      .sortBy('mse.val')
      .filter(v => v.mse.val < config.mse)
      .map(v => ({id: v.id, mse: v.mse.val, url: v.url}))
      .value();
    return items.length
      ? {update: data.update, items}
      : null;
  },

  youtube: function (data) {
    const items = _(data.meta)
      .sortBy('mse.val')
      .filter(v => v.mse.val < config.mse)
      .map(v => ({id: v.id, mse: v.mse.val}))
      .value();

    return items.length
      ? {update: data.update, items}
      : null;
  }
};

/**
 *
 * @param doc
 * @returns {{
 *    vk: {update: Date, ids: Array},
 *    zv: {update: Date, ids: Array},
 *    youtube: {update: Date, ids: Array}
 *  }}
 */
function parsedocument(doc) {
  return _(doc.altsrc)
    .mapValues((item, name) => providers[name](item))
    .pickBy()
    .value();
}

co(function*() {
  const cTidido = yield mutils.collection(config.db.write, "tidido");
  const cExport = yield mutils.collection(config.db.write, "export");
  yield cExport.remove();

  const docs = yield cTidido.find({}).toArray();
  const len = docs.length;
  let counter = len;
  for (const doc of docs) {
    if (--counter % 1000 === 0) console.log(`${counter} / ${len}`);
    const ndoc = parsedocument(doc);
    if (!_.isEmpty(ndoc)) {
      yield cExport.insertOne({_id: doc._id, altsrc: ndoc});
    }
  }

  yield mutils.closeDb();
}).catch(err => console.log(err));