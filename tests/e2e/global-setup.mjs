// Global setup for Playwright E2E (ESM)
// No-op: the app's webServer handles DB init; keep setup minimal and fast.
/** @type {import('@playwright/test').FullConfig} */
export default async function globalSetup() {
  // Intentionally empty
}
