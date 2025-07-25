/**
 * Unit tests for EmailSubscription model (Mocked)
 *
 * Uses Vitest and in-memory mock data. No database.
 */
import { describe, it, expect, beforeEach } from 'vitest';

// In-memory store for subscriptions
let subStore;

function randomToken() {
  return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function createMockSubscription(data) {
  // Normalize email
  const email = data.email ? data.email.trim().toLowerCase() : null;
  if (!email) throw new Error('Email is required');
  if (subStore.some(s => s.email === email)) throw new Error('Email must be unique');
  // States
  let states = Array.isArray(data.states) ? [...data.states] : [];
  // Default values
  const isActive = data.isActive !== undefined ? data.isActive : true;
  let unsubscribedAt = data.unsubscribedAt || (isActive ? null : new Date());
  // Mocked instance
  const sub = {
    ...data,
    email,
    isActive,
    states,
    unsubscribeToken: randomToken(),
    source: data.source || 'homepage',
    unsubscribedAt,
    addState: function(state) {
      if (!this.states.includes(state)) this.states.push(state);
    },
    removeState: function(state) {
      this.states = this.states.filter(s => s !== state);
    },
    includesState: function(state) {
      return this.states.includes(state);
    },
    generateUnsubscribeToken: function() {
      this.unsubscribeToken = randomToken();
      return this.unsubscribeToken;
    },
    save: async function() {
      if (this.isActive && this.unsubscribedAt) this.unsubscribedAt = null;
      if (!this.isActive && !this.unsubscribedAt) this.unsubscribedAt = new Date();
      return this;
    }
  };
  subStore.push(sub);
  return sub;
}

const EmailSubscription = {
  create: async data => createMockSubscription(data),
  bulkCreate: async arr => arr.map(data => createMockSubscription(data)),
  findByState: async state => subStore.filter(s => s.isActive && s.states.includes(state)),
  destroy: async ({ where }) => {
    if (where && where.email) {
      subStore = subStore.filter(s => s.email !== where.email);
    } else {
      subStore = [];
    }
  }
};

describe('EmailSubscription Model (Mocked)', () => {
  beforeEach(() => {
    subStore = [];
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