"use strict";

const _ = require('lodash');

class Manager {
  /**
   *
   * @param tokens
   * @param options
   */
  constructor(tokens, options) {
    options || (options = {});
    tokens && this.init(tokens);
    this.chilltime = options.chilltime || (45 * 1000);
    this.badtimeout = options.badtimeout || (60 * 60 * 1000);
  }

  /**
   *
   * @param tokens
   */
  init(tokens) {
    this._tokens = _(tokens)
      .map(token => ({date: new Date(0), id: token}))
      .shuffle()
      .value();
  }

  /**
   *
   * @param id
   */
  bad(id) {
    _.isObject(id) && (id = id.id);
    const token = _.find(this._tokens, {id: id});
    if (token) {
      token.date = new Date(Date.now() + this.badtimeout);
    }
  }

  /**
   *
   * @param id
   */
  dead(id) {
    _.isObject(id) && (id = id.id);
    _.pullAllWith(this._tokens, [{id: id}], _.isMatch);
  }

  /**
   *
   * @returns {*}
   */
  getId() {
    return new Promise(resolve => {
      const token = _.minBy(this._tokens, 'date');
      const elapsed = Date.now() - token.date;
      token.date = new Date();
      _.delay(resolve, Math.max(this.chilltime - elapsed, 1), token.id);
    });
  }
}

module.exports = Manager;