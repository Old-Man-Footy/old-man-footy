import { describe, it, beforeAll, beforeEach, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Hoisted mocks before imports under test
vi.mock('../../../../models/index.mjs', () => ({
  Sponsor: {
    findAll: vi.fn(),
    findOne: vi.fn(),
  },
  Club: {},
}));

vi.mock('../../../../config/constants.mjs', () => ({
  AUSTRALIAN_STATES: ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'],
}));

let app;
let Sponsor;

beforeAll(async () => {
  const models = await import('../../../../models/index.mjs');
  Sponsor = models.Sponsor;

  const sponsorsModule = await import('../../../../routes/api/sponsors.mjs');
  const sponsorsRouter = sponsorsModule.default;

  app = express();
  app.use(express.json());
  app.use('/api/sponsors', sponsorsRouter);
});

describe('GET /api/sponsors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return sponsors with no filters', async () => {
    Sponsor.findAll.mockResolvedValue([{ id: 1, sponsorName: 'Sponsor A' }]);
    const res = await request(app).get('/api/sponsors');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(Sponsor.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          isPubliclyVisible: true,
        }),
      })
    );
  });

  it('should apply search filter if provided and valid', async () => {
    Sponsor.findAll.mockResolvedValue([{ id: 2, sponsorName: 'Sponsor B' }]);
    const res = await request(app).get('/api/sponsors?search=Test');
    expect(res.status).toBe(200);
  // Verify base filters
  expect(Sponsor.findAll).toHaveBeenCalledTimes(1);
  const arg = Sponsor.findAll.mock.calls[0][0];
  expect(arg.where.isActive).toBe(true);
  expect(arg.where.isPubliclyVisible).toBe(true);
  // Verify a Sequelize.Op.or symbol key exists with an array of conditions
  const symKeys = Object.getOwnPropertySymbols(arg.where);
  const orSym = symKeys.find((s) => s.description === 'or');
  expect(orSym).toBeDefined();
  expect(Array.isArray(arg.where[orSym])).toBe(true);
  expect(arg.where[orSym].length).toBeGreaterThan(0);
  });

  it('should ignore overly long search queries', async () => {
    Sponsor.findAll.mockResolvedValue([]);
    const longSearch = 'a'.repeat(201);
    const res = await request(app).get(`/api/sponsors?search=${longSearch}`);
    expect(res.status).toBe(200);
  expect(Sponsor.findAll).toHaveBeenCalledTimes(1);
  const arg = Sponsor.findAll.mock.calls[0][0];
  const symKeys = Object.getOwnPropertySymbols(arg.where);
  // No Sequelize.Op.or should be present when search is ignored
  const hasOr = symKeys.some((s) => s.description === 'or');
  expect(hasOr).toBe(false);
  });

  it('should apply state filter if valid', async () => {
    Sponsor.findAll.mockResolvedValue([{ id: 3, sponsorName: 'Sponsor C' }]);
    const res = await request(app).get('/api/sponsors?state=NSW');
    expect(res.status).toBe(200);
    expect(Sponsor.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          state: 'NSW',
        }),
      })
    );
  });

  it('should ignore invalid state filter', async () => {
    Sponsor.findAll.mockResolvedValue([]);
    const res = await request(app).get('/api/sponsors?state=INVALID');
    expect(res.status).toBe(200);
    expect(Sponsor.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          state: 'INVALID',
        }),
      })
    );
  });
});

describe('GET /api/sponsors/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return sponsor data for valid id', async () => {
    Sponsor.findOne.mockResolvedValue({ id: 1, sponsorName: 'Sponsor A' });
    const res = await request(app).get('/api/sponsors/1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(1);
    expect(Sponsor.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 1,
          isActive: true,
          isPubliclyVisible: true,
        }),
      })
    );
  });

  it('should return 400 for invalid id', async () => {
    const res = await request(app).get('/api/sponsors/abc');
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual({
      status: 400,
      message: 'Invalid sponsor id.',
    });
    expect(Sponsor.findOne).not.toHaveBeenCalled();
  });

  it('should return 404 if sponsor not found', async () => {
    Sponsor.findOne.mockResolvedValue(null);
    const res = await request(app).get('/api/sponsors/999');
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({
      status: 404,
      message: 'Sponsor not found.',
    });
  });
});
