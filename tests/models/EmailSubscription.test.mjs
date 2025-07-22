import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import EmailSubscription from '/models/EmailSubscription.mjs';
import { sequelize } from '/config/database.mjs';

/**
 * Unit tests for EmailSubscription model
 * 
 * Uses Vitest and SQLite test database.
 */


describe('EmailSubscription Model', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
  });

  afterEach(async () => {
    await EmailSubscription.destroy({ where: {} });
  });

  it('should create a subscription with default values', async () => {
    const sub = await EmailSubscription.create({ email: 'test@example.com' });
    expect(sub.email).toBe('test@example.com');
    expect(sub.isActive).toBe(true);
    expect(Array.isArray(sub.states)).toBe(true);
    expect(sub.unsubscribeToken).toMatch(/^[a-f0-9]{64}$/);
    expect(sub.source).toBe('homepage');
    expect(sub.unsubscribedAt).toBeNull();
  });

  it('should lowercase and trim email', async () => {
    const sub = await EmailSubscription.create({ email: '  TEST@EXAMPLE.COM ' });
    expect(sub.email).toBe('test@example.com');
  });

  it('should add and remove states', async () => {
    const sub = await EmailSubscription.create({ email: 'state@test.com' });
    sub.addState('VIC');
    sub.addState('NSW');
    expect(sub.states).toContain('VIC');
    expect(sub.states).toContain('NSW');
    sub.removeState('VIC');
    expect(sub.states).not.toContain('VIC');
  });

  it('should check if subscription includes a state', async () => {
    const sub = await EmailSubscription.create({ email: 'check@test.com', states: ['QLD', 'SA'] });
    expect(sub.includesState('QLD')).toBe(true);
    expect(sub.includesState('VIC')).toBe(false);
  });

  it('should generate a new unsubscribe token', async () => {
    const sub = await EmailSubscription.create({ email: 'token@test.com' });
    const oldToken = sub.unsubscribeToken;
    const newToken = sub.generateUnsubscribeToken();
    expect(newToken).toMatch(/^[a-f0-9]{64}$/);
    expect(newToken).not.toBe(oldToken);
  });

  it('should find active subscriptions by state', async () => {
    await EmailSubscription.bulkCreate([
      { email: 'a@x.com', states: ['VIC', 'NSW'], isActive: true },
      { email: 'b@x.com', states: ['QLD'], isActive: true },
      { email: 'c@x.com', states: ['VIC'], isActive: false }
    ]);
    const found = await EmailSubscription.findByState('VIC');
    expect(found.length).toBe(1);
    expect(found[0].email).toBe('a@x.com');
  });

  it('should set unsubscribedAt when isActive changes from true to false', async () => {
    const sub = await EmailSubscription.create({ email: 'active@test.com' });
    expect(sub.unsubscribedAt).toBeNull();
    sub.isActive = false;
    await sub.save();
    expect(sub.unsubscribedAt).toBeInstanceOf(Date);
  });

  it('should clear unsubscribedAt when isActive changes from false to true', async () => {
    const sub = await EmailSubscription.create({ email: 'inactive@test.com', isActive: false, unsubscribedAt: new Date() });
    sub.isActive = true;
    await sub.save();
    expect(sub.unsubscribedAt).toBeNull();
  });

  it('should enforce unique email constraint', async () => {
    await EmailSubscription.create({ email: 'unique@test.com' });
    await expect(EmailSubscription.create({ email: 'unique@test.com' })).rejects.toThrow();
  });
});