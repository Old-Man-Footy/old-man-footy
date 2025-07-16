/**
 * Audit Service Tests
 * 
 * Tests for the audit logging functionality to ensure proper tracking
 * of user and system actions.
 */

import { describe, test, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AUDIT_RESULTS } from '../config/constants.mjs';
import AuditService from '../services/auditService.mjs';
import { AuditLog, User } from '../models/index.mjs';

describe('Audit Service', () => {
    let testUser;

    beforeEach(async () => {
        // Create a test user for each test
        testUser = await User.create({
            firstName: 'Test',
            lastName: 'User',
            email: 'audit-test@example.com',
            passwordHash: 'hashedpassword',
            isActive: true
        });
    });

    afterEach(async () => {
        // Clean up test data
        await AuditLog.destroy({ where: {} });
        await User.destroy({ where: {} });
    });

    describe('Constants', () => {
        test('should have required ACTIONS constants', () => {
            expect(AuditService.ACTIONS.USER_LOGIN).toBe('USER_LOGIN');
            expect(AuditService.ACTIONS.USER_LOGOUT).toBe('USER_LOGOUT');
            expect(AuditService.ACTIONS.USER_CREATE).toBe('USER_CREATE');
            expect(AuditService.ACTIONS.SYSTEM_SYNC_MYSIDELINE).toBe('SYSTEM_SYNC_MYSIDELINE');
        });

        test('should have required ENTITIES constants', () => {
            expect(AuditService.ENTITIES.USER).toBe('User');
            expect(AuditService.ENTITIES.CLUB).toBe('Club');
            expect(AuditService.ENTITIES.CARNIVAL).toBe('Carnival');
            expect(AuditService.ENTITIES.SYSTEM).toBe('System');
        });
    });

    describe('logUserAction', () => {
        test('should log a user action successfully', async () => {
            const mockReq = {
                user: { id: testUser.id },
                ip: '192.168.1.1',
                headers: { 'user-agent': 'Test Browser' },
                sessionID: 'test-session-123'
            };

            const auditLog = await AuditService.logUserAction(
                AuditService.ACTIONS.USER_LOGIN,
                {
                    req: mockReq,
                    entityType: AuditService.ENTITIES.USER,
                    entityId: testUser.id,
                    newValues: { email: testUser.email },
                    metadata: { loginMethod: 'password' }
                }
            );

            expect(auditLog).toBeDefined();
            expect(auditLog.userId).toBe(testUser.id);
            expect(auditLog.action).toBe(AuditService.ACTIONS.USER_LOGIN);
            expect(auditLog.entityType).toBe(AuditService.ENTITIES.USER);
            expect(auditLog.entityId).toBe(testUser.id);
            expect(auditLog.result).toBe(AUDIT_RESULTS.SUCCESS);
            expect(auditLog.ipAddress).toBe('192.168.1.1');
            expect(auditLog.userAgent).toBe('Test Browser');
            expect(auditLog.sessionId).toBe('test-session-123');
            expect(auditLog.newValues).toEqual({ email: testUser.email });
            expect(auditLog.metadata).toEqual({ loginMethod: 'password' });
        });

        test('should log a failed action', async () => {
            const mockReq = {
                user: { id: testUser.id },
                ip: '192.168.1.1',
                headers: { 'user-agent': 'Test Browser' }
            };

            const auditLog = await AuditService.logUserAction(
                AuditService.ACTIONS.USER_UPDATE,
                {
                    req: mockReq,
                    entityType: AuditService.ENTITIES.USER,
                    entityId: testUser.id,
                    result: AUDIT_RESULTS.FAILURE,
                    errorMessage: 'Validation failed'
                }
            );

            expect(auditLog.result).toBe(AUDIT_RESULTS.FAILURE);
            expect(auditLog.errorMessage).toBe('Validation failed');
        });
    });

    describe('logSystemAction', () => {
        test('should log system actions without user context', async () => {
            const auditLog = await AuditService.logSystemAction(
                AuditService.ACTIONS.SYSTEM_SYNC_MYSIDELINE,
                {
                    entityType: AuditService.ENTITIES.SYSTEM,
                    metadata: { eventsProcessed: 10, eventsCreated: 5 }
                }
            );

            expect(auditLog.userId).toBeNull();
            expect(auditLog.action).toBe(AuditService.ACTIONS.SYSTEM_SYNC_MYSIDELINE);
            expect(auditLog.entityType).toBe(AuditService.ENTITIES.SYSTEM);
            expect(auditLog.metadata.eventsProcessed).toBe(10);
            expect(auditLog.metadata.eventsCreated).toBe(5);
        });
    });

    describe('logAuthAction', () => {
        test('should log authentication events', async () => {
            const mockReq = {
                ip: '192.168.1.1',
                headers: { 'user-agent': 'Test Browser' }
            };

            const auditLog = await AuditService.logAuthAction(
                AuditService.ACTIONS.USER_LOGIN,
                mockReq,
                testUser,
                { loginAttempt: 1 }
            );

            expect(auditLog.action).toBe(AuditService.ACTIONS.USER_LOGIN);
            expect(auditLog.entityType).toBe(AuditService.ENTITIES.USER);
            expect(auditLog.entityId).toBe(testUser.id);
            expect(auditLog.newValues.email).toBe(testUser.email);
            expect(auditLog.metadata.loginAttempt).toBe(1);
            expect(auditLog.metadata.userAgent).toBe('Test Browser');
            expect(auditLog.metadata.ipAddress).toBe('192.168.1.1');
        });

        test('should log failed authentication without user', async () => {
            const mockReq = {
                ip: '192.168.1.100',
                headers: { 'user-agent': 'Test Browser' }
            };

            const auditLog = await AuditService.logAuthAction(
                AuditService.ACTIONS.USER_LOGIN,
                mockReq,
                null,
                { loginAttempt: 3, result: AUDIT_RESULTS.FAILURE, reason: 'Invalid credentials' }
            );

            expect(auditLog.action).toBe(AuditService.ACTIONS.USER_LOGIN);
            expect(auditLog.entityType).toBe(AuditService.ENTITIES.USER);
            expect(auditLog.entityId).toBeNull();
            expect(auditLog.newValues).toBeNull();
            expect(auditLog.metadata.loginAttempt).toBe(3);
            expect(auditLog.metadata.reason).toBe('Invalid credentials');
        });
    });

    describe('sanitizeData', () => {
        test('should sanitize sensitive fields', () => {
            const sensitiveData = {
                firstName: 'John',
                lastName: 'Doe',
                password: 'secret123',
                passwordHash: 'hashedvalue',
                token: 'abc123',
                email: 'john@example.com'
            };

            const sanitized = AuditService.sanitizeData(sensitiveData);

            expect(sanitized.firstName).toBe('John');
            expect(sanitized.lastName).toBe('Doe');
            expect(sanitized.email).toBe('john@example.com');
            expect(sanitized.password).toBe('[REDACTED]');
            expect(sanitized.passwordHash).toBe('[REDACTED]');
            expect(sanitized.token).toBe('[REDACTED]');
        });

        test('should handle null and undefined data', () => {
            expect(AuditService.sanitizeData(null)).toBeNull();
            expect(AuditService.sanitizeData(undefined)).toBeUndefined();
            expect(AuditService.sanitizeData('string')).toBe('string');
        });

        test('should handle arrays and nested objects', () => {
            const complexData = {
                users: [
                    { name: 'John', password: 'secret' },
                    { name: 'Jane', token: 'abc123' }
                ],
                config: {
                    apiKey: 'secret-key',
                    publicSetting: 'public-value'
                }
            };

            const sanitized = AuditService.sanitizeData(complexData);

            expect(sanitized.users[0].name).toBe('John');
            expect(sanitized.users[0].password).toBe('[REDACTED]');
            expect(sanitized.users[1].name).toBe('Jane');
            expect(sanitized.users[1].token).toBe('[REDACTED]');
            expect(sanitized.config.apiKey).toBe('[REDACTED]');
            expect(sanitized.config.publicSetting).toBe('public-value');
        });
    });

    describe('formatAuditLog', () => {
        test('should format audit log for display', async () => {
            const auditLog = await AuditLog.create({
                userId: testUser.id,
                action: AuditService.ACTIONS.USER_LOGIN,
                entityType: AuditService.ENTITIES.USER,
                entityId: testUser.id,
                result: AUDIT_RESULTS.SUCCESS,
                ipAddress: '192.168.1.1',
                metadata: { loginMethod: 'password' }
            });

            // Load the user association
            await auditLog.reload({ include: [{ model: User, as: 'user' }] });

            const formatted = AuditService.formatAuditLog(auditLog);

            expect(formatted.id).toBe(auditLog.id);
            expect(formatted.action).toBe(AuditService.ACTIONS.USER_LOGIN);
            expect(formatted.userName).toBe('Test User');
            expect(formatted.userEmail).toBe('audit-test@example.com');
            expect(formatted.result).toBe('SUCCESS');
            expect(formatted.ipAddress).toBe('192.168.1.1');
            expect(formatted.metadata.loginMethod).toBe('password');
            expect(formatted.hasChanges).toBe(false);
        });

        test('should handle audit log without user', async () => {
            const auditLog = await AuditLog.create({
                userId: null,
                action: AuditService.ACTIONS.SYSTEM_SYNC_MYSIDELINE,
                entityType: AuditService.ENTITIES.SYSTEM,
                result: AUDIT_RESULTS.SUCCESS,
                ipAddress: null,
                metadata: {}
            });

            const formatted = AuditService.formatAuditLog(auditLog);

            expect(formatted.userName).toBe('System');
            expect(formatted.userEmail).toBe('system@oldmanfooty.com');
            expect(formatted.hasChanges).toBe(false);
        });

        test('should detect changes when old/new values exist', async () => {
            const auditLog = await AuditLog.create({
                userId: testUser.id,
                action: AuditService.ACTIONS.USER_UPDATE,
                entityType: AuditService.ENTITIES.USER,
                entityId: testUser.id,
                result: AUDIT_RESULTS.SUCCESS,
                oldValues: { firstName: 'Old Name' },
                newValues: { firstName: 'New Name' }
            });

            const formatted = AuditService.formatAuditLog(auditLog);

            expect(formatted.hasChanges).toBe(true);
        });
    });
});