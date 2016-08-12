'use strict';

var chai = require('chai');
var should = chai.should();
var assert = require('assert');
var expect = chai.expect;

var Filter = require('../');
var MurmurHash3 = function(seed, data) {
  return require('murmur-hash').v3.x86.hash32(data, seed);
}

// convert a hex string to a bytes buffer
function ParseHex(str) {
  var result = [];
  while (str.length >= 2) {
    result.push(parseInt(str.substring(0, 2), 16));
    str = str.substring(2, str.length);
  }
  var buf = new Buffer(result);
  return buf;
}

describe('Bloom', function() {

  // test data from bitcoind
  // see: https://github.com/bitcoin/bitcoin/blob/master/src/test/bloom_tests.cpp
  var a = '99108ad8ed9bb6274d3980bab5a85c048f0950c8';
  var b = '19108ad8ed9bb6274d3980bab5a85c048f0950c8';
  var c = 'b5a2c786d9ef4658287ced5914b37a1b4aa32eee';
  var d = 'b9300670b4c5366e95b2699e8b18bc75e5f729c5';

  describe('Filter', function() {

    it('create with false positive settings', function() {
      var filter = Filter.create(100, 0.1);
      should.exist(filter.vData);
      should.exist(filter.nHashFuncs);
    });

    it('error if missing vData', function(){
      expect(function(){
        var a = new Filter({});
      }).to.throw('Data object should include filter data "vData"');
    });

    it('error if missing nHashFuncs', function(){
      expect(function(){
        var a = new Filter({vData: [121, 12, 200]});
      }).to.throw('Data object should include number of hash functions');
    });

    it('error if nHashFuncs exceeds max', function(){
      expect(function(){
        var a = new Filter({vData: [121, 12, 200], nHashFuncs: 51});
      }).to.throw('"nHashFuncs" exceeded max size');
    });

    it('error if missing object', function(){
      expect(function(){
        var a = new Filter('unrecognized');
      }).to.throw(Error);
    });

    describe('correctly calculate size of filter and number of hash functions', function() {
      // elements, fprate, expected length, expected funcs
      // calculated with: https://github.com/petertodd/python-bitcoinlib/blob/master/bitcoin/bloom.py
      var data = [
        [2, 0.001, 3, 8],
        [3, 0.01, 3, 5],
        [10, 0.2, 4, 2],
        [100, 0.2, 41, 2],
        [10000, 0.3, 3132, 1]
      ];

      data.forEach(function(d){
        it('elements: "'+d[0]+'" and fprate: "'+d[1]+'"', function() {
          var filter = Filter.create(d[0], d[1]);
          filter.vData.length.should.equal(d[2]);
          filter.nHashFuncs.should.equal(d[3]);
        });
      });

    });

    it('add items and test if they match the filter correctly', function() {
      var filter = Filter.create(3, 0.01);
      filter.insert(a);
      assert(filter.contains(a));
      assert(!filter.contains(b));
      filter.insert(c);
      assert(filter.contains(c));
      filter.insert(d);
      assert(filter.contains(d));
    });

    it('correctly serialize to an object', function() {

      var filter = Filter.create(3, 0.01, 0, Filter.BLOOM_UPDATE_ALL);

      filter.insert('99108ad8ed9bb6274d3980bab5a85c048f0950c8');
      assert(filter.contains('99108ad8ed9bb6274d3980bab5a85c048f0950c8'));

      // one bit different in first byte
      assert(!filter.contains('19108ad8ed9bb6274d3980bab5a85c048f0950c8'));

      filter.insert('b5a2c786d9ef4658287ced5914b37a1b4aa32eee');
      assert(filter.contains("b5a2c786d9ef4658287ced5914b37a1b4aa32eee"));

      filter.insert('b9300670b4c5366e95b2699e8b18bc75e5f729c5');
      assert(filter.contains('b9300670b4c5366e95b2699e8b18bc75e5f729c5'));
    });

    it('correctly serialize to an object with tweak', function() {

      var filter = Filter.create(3, 0.01, 2147483649, Filter.BLOOM_UPDATE_ALL);

      filter.insert('99108ad8ed9bb6274d3980bab5a85c048f0950c8');
      assert(filter.contains('99108ad8ed9bb6274d3980bab5a85c048f0950c8'));

      // one bit different in first byte
      assert(!filter.contains('19108ad8ed9bb6274d3980bab5a85c048f0950c8'));

      filter.insert('b5a2c786d9ef4658287ced5914b37a1b4aa32eee');
      assert(filter.contains('b5a2c786d9ef4658287ced5914b37a1b4aa32eee'));

      filter.insert('b9300670b4c5366e95b2699e8b18bc75e5f729c5');
      assert(filter.contains('b9300670b4c5366e95b2699e8b18bc75e5f729c5'));

    });


    it('clear the filter', function() {
      var filter = Filter.create(1, 0.01);
      filter.insert(a);
      assert(filter.contains(a));
      filter.clear();
      assert(!filter.contains(a));
    });

    it('use the max size', function() {
      var filter = Filter.create(100000000, 0.01);
    });

    it('use the max number of hash funcs', function() {
      var filter = Filter.create(10, 0.0000000000000001);
      filter.nHashFuncs.should.equal(Filter.MAX_HASH_FUNCS);
    });

  });

});
