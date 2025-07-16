/**
 * Audit Service Tests
 * 
 * Tests for the audit logging functionality to ensure proper tracking
 * of user and system actions.
 */

import { AuditLog, User } from '../models/index.mjs';
import AuditService from '../services/auditService.mjs';
import { describe, test, expect, beforeEach } from '@jest/globals';
import { AUDIT_RESULTS } from '../config/constants.mjs';


describe('Audit Service', () => {
    let testUser;

    beforeEach(async () => {
        // Create a test user for each test
        testUser = await User.create({
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            passwordHash: 'hashedpassword',
            isActive: true
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
                headers: { 'user-agent': 'Test Browser' }  // Add missing headers
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
        });

        it('should log successful authentication with correct result', async () => {
            // Arrange
            const mockReq = {
                ip: '127.0.0.1',
                headers: { 'user-agent': 'test-browser' }
            };
            const mockUser = { id: 1, email: 'test@example.com' };

            // Act
            await AuditService.logAuthAction('USER_LOGIN', mockReq, mockUser);

            // Assert
            expect(AuditLog.logAction).toHaveBeenCalledWith({
                userId: 1,
                action: 'USER_LOGIN',
                entityType: 'User',
                entityId: 1,
                oldValues: null,
                newValues: { id: 1, email: 'test@example.com' },
                request: mockReq,
                result: AUDIT_RESULTS.SUCCESS,
                errorMessage: null,
                metadata: expect.objectContaining({
                    userAgent: 'test-browser',
                    ipAddress: '127.0.0.1'
                })
            });
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
    });

    describe('AuditLog Model Methods', () => {
        test('should get user audit logs', async () => {
            // Create some test audit logs
            await AuditLog.create({
                userId: testUser.id,
                action: AuditService.ACTIONS.USER_LOGIN,
                entityType: AuditService.ENTITIES.USER,
                entityId: testUser.id,
                result: AUDIT_RESULTS.SUCCESS
            });

            await AuditLog.create({
                userId: testUser.id,
                action: AuditService.ACTIONS.USER_UPDATE,
                entityType: AuditService.ENTITIES.USER,
                entityId: testUser.id,
                result: AUDIT_RESULTS.SUCCESS
            });

            const result = await AuditLog.getUserAuditLogs(testUser.id, { limit: 10 });

            expect(result.count).toBe(2);
            expect(result.rows).toHaveLength(2);
            expect(result.rows[0].userId).toBe(testUser.id);
        });

        test('should get audit statistics', async () => {
            // Create test data
            await AuditLog.create({
                userId: testUser.id,
                action: AuditService.ACTIONS.USER_LOGIN,
                entityType: AuditService.ENTITIES.USER,
                result: AUDIT_RESULTS.SUCCESS
            });

            await AuditLog.create({
                userId: testUser.id,
                action: AuditService.ACTIONS.USER_LOGIN,
                entityType: AuditService.ENTITIES.USER,
                result: AUDIT_RESULTS.FAILURE
            });

            const stats = await AuditLog.getAuditStatistics();

            expect(stats.totalActions).toBe(2);
            expect(stats.successfulActions).toBe(1);
            expect(stats.failedActions).toBe(1);
            expect(stats.successRate).toBe('50.00');
        });

        test('should clean up old logs', async () => {
            // Create an old audit log
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 400); // 400 days ago

            await AuditLog.create({
                userId: testUser.id,
                action: AuditService.ACTIONS.USER_LOGIN,
                entityType: AuditService.ENTITIES.USER,
                result: AUDIT_RESULTS.SUCCESS,
                createdAt: oldDate
            });

            // Create a recent audit log
            await AuditLog.create({
                userId: testUser.id,
                action: AuditService.ACTIONS.USER_LOGIN,
                entityType: AuditService.ENTITIES.USER,
                result: AUDIT_RESULTS.SUCCESS
            });

            const deletedCount = await AuditLog.cleanupOldLogs(365);

            expect(deletedCount).toBe(1);

            const remainingLogs = await AuditLog.findAll();
            expect(remainingLogs).toHaveLength(1);
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

            // Manually add user association for formatting
            auditLog.user = testUser;

            const formatted = AuditService.formatAuditLog(auditLog);

            expect(formatted.id).toBe(auditLog.id);
            expect(formatted.action).toBe(AuditService.ACTIONS.USER_LOGIN);
            expect(formatted.userName).toBe('Test User');
            expect(formatted.userEmail).toBe('test@example.com');
            expect(formatted.result).toBe('SUCCESS');
            expect(formatted.ipAddress).toBe('192.168.1.1');
            expect(formatted.metadata.loginMethod).toBe('password');
        });
    });

    describe('audit middleware', () => {
        it('should log success result for 200 status codes', async () => {
            // Arrange
            const action = 'TEST_ACTION';
            const middleware = AuditService.createAuditMiddleware(action, 'User', () => 1);
            
            const mockReq = { user: { id: 1 } };
            const mockRes = {
                statusCode: 200,
                end: jest.fn()
            };
            const mockNext = jest.fn();

            // Act
            middleware(mockReq, mockRes, mockNext);
            mockRes.end();

            // Assert - wait for setImmediate
            await new Promise(resolve => setImmediate(resolve));
            
            expect(AuditService.logUserAction).toHaveBeenCalledWith(action, {
                req: mockReq,
                entityType: 'User',
                entityId: 1,
                newValues: null,
                result: AUDIT_RESULTS.SUCCESS,
                errorMessage: null
            });
        });

        it('should log failure result for 400+ status codes', async () => {
            // Arrange
            const action = 'TEST_ACTION';
            const middleware = AuditService.createAuditMiddleware(action, 'User', () => 1);
            
            const mockReq = { user: { id: 1 } };
            const mockRes = {
                statusCode: 404,
                end: jest.fn()
            };
            const mockNext = jest.fn();

            // Act
            middleware(mockReq, mockRes, mockNext);
            mockRes.end();

            // Assert - wait for setImmediate
            await new Promise(resolve => setImmediate(resolve));
            
            expect(AuditService.logUserAction).toHaveBeenCalledWith(action, {
                req: mockReq,
                entityType: 'User',
                entityId: 1,
                newValues: null,
                result: AUDIT_RESULTS.FAILURE,
                errorMessage: 'HTTP 404'
            });
        });
    });
});