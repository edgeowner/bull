/*eslint-env node */
'use strict';

var expect = require('chai').expect;
var utils = require('./utils');
var redis = require('ioredis');
var _ = require('lodash');

describe('Rate limiter', function() {
  var queue;
  var client;

  beforeEach(function() {
    client = new redis();
    return client.flushdb().then(function() {
      queue = utils.buildQueue('test rate limiter', {
        limiter: {
          max: 1,
          duration: 1000
        }
      });
      return queue;
    });
  });

  afterEach(function() {
    return queue.close().then(function() {
      return client.quit();
    });
  });

  it('should throw exception if missing duration option', function(done) {
    try {
      var queue = utils.buildQueue('rate limiter fail', {
        limiter: {
          max: 5
        }
      });
      expect.fail('Should not allow missing `duration` option');
    } catch (err) {
      done();
    }
  });

  it('should throw exception if missing max option', function(done) {
    try {
      var queue = utils.buildQueue('rate limiter fail', {
        limiter: {
          duration: 5000
        }
      });
      expect.fail('Should not allow missing `max`option');
    } catch (err) {
      done();
    }
  });

  it('should obey the rate limit', function(done) {
    var startTime = new Date().getTime();
    var numJobs = 4;

    queue.process(function() {
      return Promise.resolve();
    });

    for (var i = 0; i < numJobs; i++) {
      queue.add({});
    }

    queue.on(
      'completed',
      _.after(numJobs, function() {
        try {
          expect(new Date().getTime() - startTime).to.be.above(
            (numJobs - 1) * 1000
          );
          done();
        } catch (e) {
          done(e);
        }
      })
    );

    queue.on('failed', done);
  });
});
