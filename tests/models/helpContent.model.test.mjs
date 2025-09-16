/**
 * @file helpContent.model.test.mjs
 * @description Unit tests for HelpContent model.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import HelpContent from '../../models/HelpContent.mjs';
import { sequelize } from '../../config/database.mjs';

const testPage = {
  pageIdentifier: 'test-page',
  title: 'Test Page',
  content: '# Test Content',
};

describe('HelpContent Model', () => {

  beforeEach(async () => {
    await sequelize.sync({ force: true });
  });
  afterEach(async () => {
    await HelpContent.destroy({ where: {} });
  });

  it('should create and retrieve a help content entry', async () => {
    await HelpContent.create(testPage);
    const found = await HelpContent.findOne({ where: { pageIdentifier: 'test-page' } });
    expect(found).toBeTruthy();
    expect(found.title).toBe('Test Page');
    expect(found.content).toBe('# Test Content');
  });

  it('should enforce unique pageIdentifier', async () => {
    await HelpContent.create(testPage);
    await expect(HelpContent.create(testPage)).rejects.toThrow();
  });
});
