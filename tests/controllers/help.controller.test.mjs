/**
 * @file help.controller.test.mjs
 * @description Unit tests for help.controller API endpoint.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { getHelpContent, getHelpContentValidators } from '../../controllers/help.controller.mjs';
import HelpContent from '../../models/HelpContent.mjs';
import { sequelize } from '../../config/database.mjs';

const app = express();
app.use(express.json());
app.get('/api/help/:pageIdentifier', getHelpContentValidators, getHelpContent);

const testPage = {
  pageIdentifier: 'test-page',
  title: 'Test Page',
  content: '# Test Content',
};

describe('GET /api/help/:pageIdentifier', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
    await HelpContent.create(testPage);
  });

  it('should return rendered HTML for valid pageIdentifier', async () => {
    const res = await request(app).get('/api/help/test-page');
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Test Page');
    expect(res.body.content).toContain('<h1'); // Markdown rendered to HTML
  });

  it('should return 404 for missing pageIdentifier', async () => {
    const res = await request(app).get('/api/help/unknown-page');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it('should validate pageIdentifier format', async () => {
    const res = await request(app).get('/api/help/invalid!id');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
