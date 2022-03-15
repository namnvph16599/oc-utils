const Warlock = require('node-redis-warlock');
const Redis = require('./redis');
const hapiLogger = require('./logging/hapi-logger');

const LOCK_CONFIG = {
  TTL: 60000,
  MAX_TRY: 200,
  WAIT_TRY: 100,
};

let warlock;

module.exports = {
  withLock,
  init,
};

function init({ redisEndPoint }) {
  const redisClient = new Redis(redisEndPoint).redisClient;
  if (!redisClient) {
    hapiLogger.log('error', 'failure initializing warlock: can\'t get redis client', { redisEndPoint });
    return;
  }
  warlock = Warlock(redisClient);
}

function withLock(key, func, config = {}) {
  if (!warlock) {
    hapiLogger.log('warn', 'warlock not initialized', { key });
    return func();
  }
  return new Promise((resolve, reject) => {
    warlock.optimistic(key,
      config.ttl || LOCK_CONFIG.TTL,
      config.maxTry || LOCK_CONFIG.MAX_TRY,
      config.waitTry || LOCK_CONFIG.WAIT_TRY, async (err, unlock) => {
        // get lock error, nothing to do
        if (err) {
          return reject(err);
        }
        // safety check to makre sure we don't unlock twice
        let unlocked = false;
        try {
          return func()
            .then(result => {
              if (typeof unlock === 'function') {
                if (!unlocked) {
                  unlocked = true;
                  unlock();
                }
              }
              resolve(result);
            })
            .catch(error => {
              if (typeof unlock === 'function') {
                if (!unlocked) {
                  unlocked = true;
                  unlock();
                }
              }
              reject(error);
            });
        } catch (ex) {
          if (typeof unlock === 'function') {
            if (!unlocked) {
              unlocked = true;
              unlock();
            }
          }
          reject(ex);
        }
      });
  });
}
