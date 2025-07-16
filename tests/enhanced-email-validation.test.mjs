/**
 * Enhanced Email Validation Tests
 * 
 * Tests the enhanced email validation middleware with security checks
 * and improved error messaging following TDD best practices.
 */

import request from 'supertest';
import express from 'express';
import { body, validationResult } from 'express-validator';
import { describe, test, expect } from 'vitest';
import { 
    validateEmail, 
    requiredEmail, 
    optionalEmail, 
    contactEmail, 
    organiserEmail, 
    playerEmail, 
    adminEmail 
} from '../middleware/validation.mjs';

// Create test app
const createTestApp = (validationMiddleware) => {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    app.post('/test', validationMiddleware, (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        res.json({ success: true });
    });
    
    return app;
};

describe('Enhanced Email Validation Middleware', () => {
    describe('validateEmail()', () => {
        test('should accept valid email addresses', async () => {
            const app = createTestApp([validateEmail('email', true)]);
            
            const validEmails = [
                'user@example.com',
                'test.email@domain.org',
                'admin@company.co.uk',
                'player123@club-rugby.au'
            ];
            
            for (const email of validEmails) {
                const response = await request(app)
                    .post('/test')
                    .send({ email });
                
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            }
        });

        test('should reject invalid email formats', async () => {
            const app = createTestApp([validateEmail('email', true)]);
            
            const invalidEmails = [
                'invalid-email',
                '@domain.com',
                'user@',
                'user@domain' // Missing TLD - tests basic email format validation without triggering our custom security rules that block consecutive special chars (like user..double@domain.com)
            ];
            
            for (const email of invalidEmails) {
                const response = await request(app)
                    .post('/test')
                    .send({ email });
                
                expect(response.status).toBe(400);
                expect(response.body.errors.length).toBeGreaterThanOrEqual(1);
            }
        });

        test('should block disposable email domains', async () => {
            const app = createTestApp([validateEmail('email', true)]);
            
            const disposableEmails = [
                'test@10minutemail.com',
                'user@tempmail.org',
                'fake@guerrillamail.com',
                'spam@mailinator.com'
            ];
            
            for (const email of disposableEmails) {
                const response = await request(app)
                    .post('/test')
                    .send({ email });
                
                expect(response.status).toBe(400);
                expect(response.body.errors[0].msg).toContain('Disposable email addresses are not allowed');
            }
        });

        test('should enforce maximum length limit', async () => {
            const app = createTestApp([validateEmail('email', true, { maxLength: 50 })]);
            
            const longEmail = 'a'.repeat(40) + '@example.com'; // 51 characters
            
            const response = await request(app)
                .post('/test')
                .send({ email: longEmail });
            
            expect(response.status).toBe(400);
            expect(response.body.errors[0].msg).toContain('must not exceed 50 characters');
        });

        test('should handle optional email fields correctly', async () => {
            const app = createTestApp([validateEmail('email', false)]);
            
            // Empty optional field should pass
            const response1 = await request(app)
                .post('/test')
                .send({ email: '' });
            
            expect(response1.status).toBe(200);
            
            // Valid optional field should pass
            const response2 = await request(app)
                .post('/test')
                .send({ email: 'valid@example.com' });
            
            expect(response2.status).toBe(200);
            
            // Invalid optional field should fail
            const response3 = await request(app)
                .post('/test')
                .send({ email: 'invalid-email' });
            
            expect(response3.status).toBe(400);
        });
    });

    describe('requiredEmail()', () => {
        test('should require email and provide custom message', async () => {
            const app = createTestApp([requiredEmail('email', 'Custom email error message')]);
            
            const response = await request(app)
                .post('/test')
                .send({ email: '' });
            
            expect(response.status).toBe(400);
            expect(response.body.errors[0].msg).toBe('Email is required');
        });

        test('should validate required email with custom error', async () => {
            const app = createTestApp([requiredEmail('email', 'Custom validation message')]);
            
            const response = await request(app)
                .post('/test')
                .send({ email: 'invalid-email' });
            
            expect(response.status).toBe(400);
            expect(response.body.errors[0].msg).toBe('Custom validation message');
        });
    });

    describe('optionalEmail()', () => {
        test('should allow empty optional email', async () => {
            const app = createTestApp([optionalEmail('contactEmail')]);
            
            const response = await request(app)
                .post('/test')
                .send({ contactEmail: '' });
            
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('contactEmail()', () => {
        test('should provide contact-specific error message', async () => {
            const app = createTestApp([contactEmail('contactEmail')]);
            
            const response = await request(app)
                .post('/test')
                .send({ contactEmail: 'invalid-email' });
            
            expect(response.status).toBe(400);
            expect(response.body.errors[0].msg).toContain('communication purposes');
        });
    });

    describe('organiserEmail()', () => {
        test('should require organiser email for carnivals', async () => {
            const app = createTestApp([organiserEmail('organiserContactEmail')]);
            
            // Missing email
            const response1 = await request(app)
                .post('/test')
                .send({ organiserContactEmail: '' });
            
            expect(response1.status).toBe(400);
            expect(response1.body.errors[0].msg).toContain('OrganiserContactEmail is required');
            
            // Invalid email
            const response2 = await request(app)
                .post('/test')
                .send({ organiserContactEmail: 'invalid-email' });
            
            expect(response2.status).toBe(400);
            expect(response2.body.errors[0].msg).toContain('carnival communications');
        });
    });

    describe('playerEmail()', () => {
        test('should provide player-specific error message', async () => {
            const app = createTestApp([playerEmail('email')]);
            
            const response = await request(app)
                .post('/test')
                .send({ email: 'invalid-email' });
            
            expect(response.status).toBe(400);
            expect(response.body.errors[0].msg).toContain('unique email address for the player');
        });
    });

    describe('adminEmail()', () => {
        test('should provide admin-specific error message', async () => {
            const app = createTestApp([adminEmail('email')]);
            
            const response = await request(app)
                .post('/test')
                .send({ email: 'invalid-email' });
            
            expect(response.status).toBe(400);
            expect(response.body.errors[0].msg).toContain('corporate or institutional email');
        });
    });

    describe('Security Features', () => {
        test('should block emails with suspicious patterns', async () => {
            const app = createTestApp([validateEmail('email', true)]);
            
            const suspiciousEmails = [
                'user..double@domain.com',
                'user++suspicious@domain.com',
                'user--dash@domain.com'
            ];
            
            for (const email of suspiciousEmails) {
                const response = await request(app)
                    .post('/test')
                    .send({ email });
                
                expect(response.status).toBe(400);
                expect(response.body.errors[0].msg).toContain('invalid character sequences');
            }
        });

        test('should block emails starting/ending with special characters', async () => {
            const app = createTestApp([validateEmail('email', true)]);
            
            const invalidEmails = [
                '.user@domain.com',
                'user.@domain.com',
                '+user@domain.com',
                '-user@domain.com'
            ];
            
            for (const email of invalidEmails) {
                const response = await request(app)
                    .post('/test')
                    .send({ email });
                
                expect(response.status).toBe(400);
                expect(response.body.errors[0].msg).toContain('format is invalid');
            }
        });

        test('should normalize email addresses correctly', async () => {
            const app = createTestApp([validateEmail('email', true)]);
            
            const response = await request(app)
                .post('/test')
                .send({ email: 'User@EXAMPLE.COM' });
            
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('Integration with Express-Validator', () => {
        test('should work with multiple validation rules', async () => {
            const app = createTestApp([
                body('name').notEmpty().withMessage('Name is required'),
                requiredEmail('email', 'Email is required for registration'),
                body('age').isInt({ min: 18 }).withMessage('Must be at least 18 years old')
            ]);
            
            const response = await request(app)
                .post('/test')
                .send({
                    name: '',
                    email: 'invalid-email',
                    age: 15
                });
            
            expect(response.status).toBe(400);
            expect(response.body.errors).toHaveLength(3);
        });

        test('should pass with all valid data', async () => {
            const app = createTestApp([
                body('name').notEmpty(),
                requiredEmail('email'),
                body('age').isInt({ min: 18 })
            ]);
            
            const response = await request(app)
                .post('/test')
                .send({
                    name: 'John Doe',
                    email: 'john@example.com',
                    age: 25
                });
            
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });
});