'user strict';
const bloom = require('./filter.js');

function MLBFilter(rCapacity, sCapacity, r, s, baseFpRate) {
  this.rCapacity = rCapacity;
  this.sCapacity = sCapacity;
  this.r = r;
  this.s = s;
  this.baseFpRate = baseFpRate;
  this.filters = [];
  if (this.r && this.s) {
    this.build();
  }
}

MLBFilter.prototype.contains = function(data) {
  var included = false;
  for (var i = 0; i < this.filters.length; i++) {
    if (this.filters[i].contains(data)) {
      included = !included;
    } else {
      break;
    }
  }
  return included;
}

MLBFilter.prototype.toObject = function() {
  var obj_filters = [];
  this.filters.forEach(function(f) {
    obj_filters.push(f.toObject());
  });
  return { filters: obj_filters };
}

MLBFilter.prototype.toJSON = function() {
  return JSON.stringify(this.toObject());
}

MLBFilter.fromJSON = function(data) {
  var mlb = new MLBFilter(undefined, undefined, undefined, undefined, undefined);
  JSON.parse(data).filters.forEach(function(f) {
    mlb.filters.push(bloom.fromJSON(JSON.stringify(f)));
  });
  return mlb;
};

MLBFilter.prototype.build = function() {
  var filters = [];
  var top_filter = bloom.create(this.rCapacity, this.baseFpRate, filters.length);
  filters.push(top_filter);
  this.r.forEach(function (x) {
    top_filter.insert(x);
  });
  var elements = Math.ceil(this.sCapacity * this.baseFpRate);
  var fp_filter = bloom.create(elements, this.baseFpRate, filters.length);
  this.s.forEach(function (x) {
    if (top_filter.contains(x)) {
      fp_filter.insert(x);
    }
  });
  filters.push(fp_filter);
  var current_rate_modifier = this.baseFpRate;
  var in_r_filter = true;
  while (true) {
    var last_filter = filters[filters.length - 1]
    if (in_r_filter) {
      var old_r = this.r;
      this.r = [];
      var new_filter = bloom.create(this.rCapacity * current_rate_modifier, this.baseFpRate, filters.length);
      for (var i = 0; i < old_r.length; i++) {
        if (last_filter.contains(old_r[i])) {
          this.r.push(old_r[i]);
          new_filter.insert(old_r[i]);
        }
      }
      if (this.r.length <= 1) {
        break;
      }
      filters.push(new_filter);
    } else { // u
      current_rate_modifier *= this.baseFpRate;
      var old_s = this.s;
      this.s = [];
      var new_filter = bloom.create(this.sCapacity * current_rate_modifier, this.baseFpRate, filters.length);
      for (var i = 0; i < old_s.length; i++) {
        if (last_filter.contains(old_s[i])) {
          this.s.push(old_s[i]);
          new_filter.insert(old_s[i]);
        }
      }
      if (this.s.length <= 1) {
        break;
      }
      filters.push(new_filter);
    }
    in_r_filter = !in_r_filter;
  }
  this.filters = filters;
}


module.exports = MLBFilter;
