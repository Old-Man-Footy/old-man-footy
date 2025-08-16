// Small helpers for Playwright tests (ESM)
import { expect } from '@playwright/test';

export const TestUtils = {
  async waitForHeader(page) {
    await expect(page.getByRole('navigation')).toBeVisible();
  },
  async goto(page, path = '/') {
    await page.goto(path);
    await this.waitForHeader(page);
  }
};
