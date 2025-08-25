import { describe, it, expect, beforeEach } from 'vitest';
import { validationResult } from 'express-validator';
import express from 'express';
import request from 'supertest';
import {

validateEmail,
requiredEmail,
optionalEmail,
contactEmail,
organiserEmail,
playerEmail,
adminEmail,
} from '../../middleware/validation.mjs';

/**
 * Helper to create an Express app for testing validation middleware.
 * @param {Array} middlewares - Array of validation middlewares
 */
function createTestApp(middlewares) {
const app = express();
app.use(express.json());
app.post('/test', middlewares, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: {
        status: 400,
        message: errors.array()[0].msg,
      },
    });
  }
  res.status(200).json({ success: true });
});
return app;
}

describe('validation.mjs email validators', () => {
describe('validateEmail', () => {
  it('should pass with a valid email', async () => {
    const app = createTestApp([validateEmail('email')]);
    const res = await request(app)
      .post('/test')
      .send({ email: 'user@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should fail if email is missing and required', async () => {
    const app = createTestApp([validateEmail('email', true)]);
    const res = await request(app).post('/test').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Email is required/);
  });

  it('should pass if email is missing and optional', async () => {
    const app = createTestApp([validateEmail('email', false)]);
    const res = await request(app).post('/test').send({});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should fail for disposable email domains', async () => {
    const app = createTestApp([validateEmail('email')]);
    const res = await request(app)
      .post('/test')
      .send({ email: 'user@mailinator.com' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Disposable email addresses are not allowed/);
  });

  it('should fail for emails with suspicious patterns', async () => {
    const app = createTestApp([validateEmail('email')]);
    const res = await request(app)
      .post('/test')
      .send({ email: 'user..name@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/invalid character sequences/);
  });

  it('should fail for emails starting with special chars', async () => {
    const app = createTestApp([validateEmail('email')]);
    const res = await request(app)
      .post('/test')
      .send({ email: '.user@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/format is invalid/);
  });

  it('should fail for emails exceeding maxLength', async () => {
    const longEmail = `${'a'.repeat(250)}@ex.com`;
    const app = createTestApp([validateEmail('email')]);
    const res = await request(app)
      .post('/test')
      .send({ email: longEmail });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/must not exceed/);
  });

  it('should fail for invalid email format', async () => {
    const app = createTestApp([validateEmail('email')]);
    const res = await request(app)
      .post('/test')
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/valid email address/);
  });
});

describe('requiredEmail', () => {
  it('should require email and validate format', async () => {
    const app = createTestApp([requiredEmail()]);
    const res = await request(app)
      .post('/test')
      .send({ email: 'user@example.com' });
    expect(res.status).toBe(200);
  });

  it('should fail if required email is missing', async () => {
    const app = createTestApp([requiredEmail()]);
    const res = await request(app).post('/test').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Email is required/);
  });
});

describe('optionalEmail', () => {
  it('should allow missing email', async () => {
    const app = createTestApp([optionalEmail()]);
    const res = await request(app).post('/test').send({});
    expect(res.status).toBe(200);
  });

  it('should validate format if email is present', async () => {
    const app = createTestApp([optionalEmail()]);
    const res = await request(app)
      .post('/test')
      .send({ email: 'invalid-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/valid email address/);
  });
});

describe('contactEmail', () => {
  it('should use custom message for contact email', async () => {
    const app = createTestApp([contactEmail()]);
    const res = await request(app)
      .post('/test')
      .send({ contactEmail: 'invalid-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/contact email address/);
  });
});

describe('organiserEmail', () => {
  it('should require organiser email and use custom message', async () => {
    const app = createTestApp([organiserEmail()]);
    const res = await request(app)
      .post('/test')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/organiser email address is required/);
  });
});

describe('playerEmail', () => {
  it('should use custom message for player email', async () => {
    const app = createTestApp([playerEmail()]);
    const res = await request(app)
      .post('/test')
      .send({ email: 'invalid-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/unique email address for the player/);
  });
});

describe('adminEmail', () => {
  it('should use custom message for admin email', async () => {
    const app = createTestApp([adminEmail()]);
    const res = await request(app)
      .post('/test')
      .send({ email: 'invalid-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Administrator accounts require a valid corporate or institutional email address/);
  });
});
});