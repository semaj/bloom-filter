'use strict';

var chai = require('chai');
var should = chai.should();
var assert = require('assert');
var expect = chai.expect;

var MLBFilter = require('../');
var Filter = MLBFilter.Filter;

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

  var a = '99108ad8ed9bb6274d3980bab5a85c048f0950c8';
  var b = '19108ad8ed9bb6274d3980bab5a85c048f0950c8';
  var c = 'b5a2c786d9ef4658287ced5914b37a1b4aa32eee';
  var d = 'b9300670b4c5366e95b2699e8b18bc75e5f729c5';

  describe('MLBFilter', function() {
    it('exhibit no false positives', function() {
      var s = [];
      for (var i = 0; i < 1000; i++) {
        s.push(i.toString());
      }
      var mlb = new MLBFilter(10, 20000, [a, b], s, 0.6);
      assert(mlb.contains(a));
      assert(mlb.contains(b));
      for (var i = 0; i < 1000; i++) {
        assert(!mlb.contains(!i.toString()));
      }
    });

    it('serialize and deserialize correctly', function() {
      var s = [];
      for (var i = 0; i < 1000; i++) {
        s.push(i.toString());
      }
      var mlb = new MLBFilter(100, 20000, [a, b], s, 0.6);
      assert(mlb.contains(a));
      assert(mlb.contains(b));
      for (var i = 0; i < 1000; i++) {
        assert(!mlb.contains(!i.toString()));
      }
      var mlb2 = MLBFilter.fromJSON(mlb.toJSON()).toObject();
      mlb2.should.deep.equal(mlb.toObject());

    });

  });

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

      var filter = Filter.create(3, 0.01, 0);

      filter.insert(a);
      assert(filter.contains(a));

      // one bit different in first byte
      assert(!filter.contains(b));

      filter.insert(c);
      assert(filter.contains(c));

      filter.insert(d);
      assert(filter.contains(d));

      var actual = filter.toObject();

      var expected = {
        vData: new Buffer([ 88, 217, 138 ]).toString('base64'),
        nHashFuncs: 5,
        elements: 3,
        fpRate: 0.01,
        level: 0,
      };

      actual.should.deep.equal(expected);

    });

    it('correctly serialize then deserialize', function() {

      var filter = Filter.create(100, 0.255, 3);
      filter.insert(a);
      filter.insert(b);
      filter.insert(c);
      filter.insert(d);
      var filter2 = Filter.fromJSON(filter.toJSON());

      filter.toObject().should.deep.equal(filter2.toObject());
    });

    it('clear the filter', function() {
      var filter = Filter.create(1, 0.01);
      filter.insert(a);
      assert(filter.contains(a));
      filter.clear();
      assert(!filter.contains(a));
    });

    it('display in the console', function() {
      var filter = Filter.create(3, 0.01);
      filter.insert(a);
      filter.inspect().should.equal('<BloomFilter:64,25,2 nHashFuncs:5 level:0>');
    });

  });

});
