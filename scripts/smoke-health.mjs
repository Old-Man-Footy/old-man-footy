/**
 * Simple healthcheck smoke test script for local Docker runs
 * Retries until success or timeout.
 */

import http from 'node:http';

const port = Number(process.env.PORT || 3050);
const path = process.env.HEALTH_CHECK_PATH || '/health';
const url = `http://localhost:${port}${path}`;
const maxWaitMs = Number(process.env.SMOKE_MAX_WAIT_MS || 30000);
const intervalMs = Number(process.env.SMOKE_INTERVAL_MS || 1000);

function checkOnce() {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      const ok = res.statusCode === 200;
      resolve({ ok, status: res.statusCode });
    });
    req.on('error', (err) => {
      resolve({ ok: false, error: err });
    });
  });
}

async function main() {
  const start = Date.now();
  /* eslint-disable no-constant-condition */
  while (true) {
    const { ok, status, error } = await checkOnce();
    if (ok) {
      console.log(`Health OK - ${status}`);
      process.exit(0);
    }
    const elapsed = Date.now() - start;
    if (elapsed >= maxWaitMs) {
      console.error(`Health check failed after ${elapsed}ms`, error ? `- ${error.message}` : status ?? '');
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

main();
