/**
 * Simple in-memory failure-only counter store.
 *
 * Tracks timestamps of failed authentication attempts per key.
 * This is intentionally lightweight and process-local. For multi-instance
 * deployments you should replace this with a Redis sorted-set (ZADD / ZREM / ZCOUNT)
 * or similar durable store.
 */

const store = new Map();
let windowMs = 10 * 60 * 1000; // default 10 minutes

/**
 * Configure pruning window (in milliseconds).
 * @param {number} ms
 */
export const setWindowMs = (ms) => {
  if (typeof ms === 'number' && ms > 0) {
    windowMs = ms;
  }
};

const now = () => Date.now();

const pruneForKey = (key) => {
  const arr = store.get(key) || [];
  const cutoff = now() - windowMs;
  const pruned = arr.filter((t) => t > cutoff);
  if (pruned.length > 0) {
    store.set(key, pruned);
  } else {
    store.delete(key);
  }
  return pruned;
};

/**
 * Increment failure count for a key (adds a timestamp)
 * Returns the new failure count.
 * @param {string} key
 * @returns {number}
 */
export const incrementFailure = (key) => {
  if (!key) return 0;
  pruneForKey(key);
  const arr = store.get(key) || [];
  arr.push(now());
  store.set(key, arr);
  return arr.length;
};

/**
 * Reset (clear) failures for a key.
 * @param {string} key
 */
export const resetFailures = (key) => {
  if (!key) return;
  store.delete(key);
};

/**
 * Get current failure count for a key (after pruning old timestamps).
 * @param {string} key
 * @returns {number}
 */
export const getFailureCount = (key) => {
  if (!key) return 0;
  const arr = pruneForKey(key);
  return arr.length;
};

/**
 * For debugging / tests: ability to inspect internal store (not for prod usage).
 */
export const _debug = () => ({ windowMs, store: Array.from(store.entries()) });

export default {
  setWindowMs,
  incrementFailure,
  resetFailures,
  getFailureCount,
  _debug,
};
