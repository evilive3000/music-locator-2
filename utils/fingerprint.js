"use strict";

const m1 = 0x55555555,
  m2 = 0x33333333,
  m4 = 0x0f0f0f0f;

const hamming_distance = function (n1, n2) {
  let n = n1 ^ n2;
  n -= (n >> 1) & m1;
  n = (n & m2) + ((n >> 2) & m2);
  n = (n + (n >> 4)) & m4;

  n += n >> 8;
  n += n >> 16;
  return n & 0x7f;
};


const min = Math.min,
  max = Math.max,
  abs = Math.abs;

/**
 * @example
 *  dataA = [aaaaaaaaaa], dataB = [bbbbbb], offset = 3
 *  [aaaaaaaaaa]
 *  [***bbbbbb]
 *
 * @example
 *  dataA = [aaaaaaaaaa], dataB = [bbbbbb], offset = -3
 *  [***aaaaaaaaaa]
 *  [bbbbbb]
 *
 * @param {array} dataA
 * @param {array} dataB
 * @param {number} offset
 * @param {number?} overlap минимальное перекрытие, если меньше то результат null
 * @param {number?} maxMSE
 * @param {object?} result
 * @constructor
 * @return {number|boolean}
 */
const MSE = function (dataA, dataB, offset, overlap, maxMSE, result) {

  const iA = -min(0, offset), iB = max(0, offset),
    start = abs(offset),
    end = min(dataA.length + iA, dataB.length + iB) - 1,
    testLen = end - start,
    minTested = max(testLen >> 4, 5), // 6.25% или 5 сравнений
    mti = minTested + start - 1;

  let i = start - 1;

  result || (result = {});

  maxMSE = (maxMSE || 9.0) * minTested;

  if ((max(0, overlap) || 20) > testLen)
    return null;

  let dist, vector = [], sum = 0;
  let sVec = [], sSum = 0, sLen = 0, sLast = 0, sN = 15;
  // делаем минимальный проход, до контрольного замера
  while (i++ < mti) {
    dist = hamming_distance(dataA[i - iA], dataB[i - iB]);
    vector.push(dist);
    sum += dist;

    sSum += dist;
    if (++sLen >= sN) {
      sVec.push(sSum / sN);
      sSum -= sLast;
    }
    sLast = dist;
  }

  // проверяем надо ли продолжать
  if (sum > maxMSE) {
    return sum / vector.length;
  }

  while (i++ < end) {
    dist = hamming_distance(dataA[i - iA], dataB[i - iB]);
    vector.push(dist);
    sum += dist;

    sSum += dist;
    if (++sLen <= testLen - sN) {
      sVec.push(sSum / sN);
      sSum -= sLast;
    }
    sLast = dist;
  }

  result.smin = min.apply(null, sVec);
  result.mse = _mse(vector, sum);
  result.avg = sum / vector.length;

  let sMin = 32;
  for (let j = sN; j <= vector.length - sN; j++) {
    let z = 0;
    for (let k = 0; k < sN; k++) {
      z += vector[j + k];
    }
    if (sMin > z / sN) {
      sMin = z / sN;
    }
  }
  result.smin2 = sMin;

  vector.sort((a, b) => a - b);
  result.median = vector[vector.length >> 1];

  return result.avg;
};

/**
 *
 * @param vector
 * @param sum
 * @returns {number}
 * @private
 */
function _mse(vector, sum) {
  let l = vector.length, d = 0, s = 0;
  const avg = sum / l;

  while (l--) {
    d = vector[l] - avg;
    s += d * d;
  }
  return Math.sqrt(s / vector.length);
}

/**
 *
 * @param fpA
 * @param fpB
 * @param delta
 * @returns {{val: Number, offset: Number, data?: {}}}
 */
function bestOffset(fpA, fpB, delta) {
  delta || (delta = Math.round(0.01 * fpB.length));
  let bo = {val: NaN, offset: NaN}, min = 32;
  for (let o = -delta; o < delta; o++) {
    const result = {};
    const mse = MSE(fpA, fpB, o, null, 12, result);
    if (mse !== false && mse < min) {
      min = mse;
      bo = {val: mse, offset: o, data: result};
    }
  }
  return bo;
}

// offset = 4;
// [ 9][aaaaaaaaa]
// [ 7][****bbb]
// [11][****bbbbbbb]
// [ 2][aa]


// offset = -4;
// [10][****aaaaaa]
// [ 7][bbbbbbb]
// [13][bbbbbbbbbbbbb]
// [ 2][bb]

//
//var a = [0,1,0,0,1,1,0,0,0,0];
//var b = [0,1,0,0,1,1,0,0,0,0];
//for(var i = -10; i < 11; i++)
//    console.log("=====%d: %s",i,mse(a,b,i,1,0.51));


//
//var Benchmark = require('benchmark');
//
//var suite = new Benchmark.Suite;
//
//// add tests
//suite.add('wagner', function(){
//    MSE(a,b,-6, 1, 0.2);
//})
//// add listeners
//.on('cycle', function(event) {
//  console.log(String(event.target));
//})
//.on('complete', function() {
//  console.log('Fastest is ' + this.filter('fastest').pluck('name'));
//})
//// run async
//.run({ 'async': true });

module.exports = {
  calcMSE: MSE,
  findOffset: bestOffset
};