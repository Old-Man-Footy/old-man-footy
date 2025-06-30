// Jest unit tests for carnivalSponsor.controller.mjs
import { jest } from '@jest/globals';
import { sequelize } from '../models/index.mjs';
import * as controller from '../controllers/carnivalSponsor.controller.mjs';
import CarnivalSponsor from '../models/CarnivalSponsor.mjs';
import Carnival from '../models/Carnival.mjs';
import Sponsor from '../models/Sponsor.mjs';

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('carnivalSponsor.controller', () => {
  let carnival, sponsor;
  beforeEach(async () => {
    carnival = await Carnival.create({ title: 'Test Carnival', isActive: true });
    sponsor = await Sponsor.create({ sponsorName: 'Test Sponsor', businessName: 'Test Sponsor Pty Ltd', isActive: true });
  });

  it('should create a carnival-sponsor relationship', async () => {
    const req = { body: { carnivalId: carnival.id, sponsorId: sponsor.id } };
    const res = mockRes();
    await controller.createCarnivalSponsor(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('should not create if missing IDs', async () => {
    const req = { body: {} };
    const res = mockRes();
    await controller.createCarnivalSponsor(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should get all carnival-sponsor relationships', async () => {
    await CarnivalSponsor.create({ carnivalId: carnival.id, sponsorId: sponsor.id, isActive: true });
    const req = { query: { carnivalId: carnival.id } };
    const res = mockRes();
    await controller.getCarnivalSponsors(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('should get a specific carnival-sponsor relationship', async () => {
    const cs = await CarnivalSponsor.create({ carnivalId: carnival.id, sponsorId: sponsor.id, isActive: true });
    const req = { params: { id: cs.id } };
    const res = mockRes();
    await controller.getCarnivalSponsor(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('should update a carnival-sponsor relationship', async () => {
    const cs = await CarnivalSponsor.create({ carnivalId: carnival.id, sponsorId: sponsor.id, isActive: true });
    const req = { params: { id: cs.id }, body: { sponsorshipLevel: 'Gold' } };
    const res = mockRes();
    await controller.updateCarnivalSponsor(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('should soft delete a carnival-sponsor relationship', async () => {
    const cs = await CarnivalSponsor.create({ carnivalId: carnival.id, sponsorId: sponsor.id, isActive: true });
    const req = { params: { id: cs.id }, query: {} };
    const res = mockRes();
    await controller.deleteCarnivalSponsor(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('should hard delete a carnival-sponsor relationship', async () => {
    const cs = await CarnivalSponsor.create({ carnivalId: carnival.id, sponsorId: sponsor.id, isActive: true });
    const req = { params: { id: cs.id }, query: { permanent: 'true' } };
    const res = mockRes();
    await controller.deleteCarnivalSponsor(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
