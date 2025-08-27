/**
 * Unit tests for the AuditService.
 *
 * These tests use Vitest to verify the functionality of each method in the AuditService.
 * The AuditLog model is mocked to isolate the service and ensure that we are only
 * testing the service's logic, not the model's interaction with the database.
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import AuditService from '../../services/auditService.mjs';
import AuditLog from '../../models/AuditLog.mjs';

// Mock the AuditLog model. This replaces the actual model with a mock,
// allowing us to control its behavior (e.g., spy on function calls).
vi.mock('../../models/AuditLog.mjs', () => ({
  default: {
    logAction: vi.fn(),
  }
}));

describe('AuditService', () => {
  // Clear all mocks before each test to ensure a clean state.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Tests for logUserAction ---
  describe('logUserAction', () => {
    it('should call AuditLog.logAction with the correct parameters for a logged-in user', async () => {
      const mockReq = { user: { id: 123 } };
      const options = {
        entityType: AuditService.ENTITIES.CLUB,
        entityId: 456,
        newValues: { name: 'New Club Name' },
        metadata: { reason: 'User request' },
      };

      // Call the method under test
      await AuditService.logUserAction(AuditService.ACTIONS.CLUB_CREATE, { req: mockReq, ...options });

      // Assert that the underlying logAction was called correctly
      expect(AuditLog.logAction).toHaveBeenCalledTimes(1);
      expect(AuditLog.logAction).toHaveBeenCalledWith({
        userId: 123,
        action: AuditService.ACTIONS.CLUB_CREATE,
        entityType: AuditService.ENTITIES.CLUB,
        entityId: 456,
        oldValues: undefined,
        newValues: { name: 'New Club Name' },
        request: mockReq,
        result: 'SUCCESS',
        errorMessage: undefined,
        metadata: { reason: 'User request' },
      });
    });

    it('should handle actions for a user that is not logged in (e.g., registration)', async () => {
      const mockReq = {}; // No user on the request
      const options = {
        entityType: AuditService.ENTITIES.USER,
        entityId: 789,
        newValues: { email: 'test@example.com' },
      };

      await AuditService.logUserAction(AuditService.ACTIONS.USER_REGISTER, { req: mockReq, ...options });

      expect(AuditLog.logAction).toHaveBeenCalledWith(expect.objectContaining({
        userId: null, // Expect userId to be null
        action: AuditService.ACTIONS.USER_REGISTER,
      }));
    });
  });

  // --- Tests for logSystemAction ---
  describe('logSystemAction', () => {
    it('should call AuditLog.logAction with userId set to null', async () => {
      const options = {
        entityType: AuditService.ENTITIES.SYSTEM,
        entityId: null,
        metadata: { job: 'SYSTEM_BACKUP' },
        result: 'SUCCESS',
      };

      await AuditService.logSystemAction(AuditService.ACTIONS.SYSTEM_BACKUP, options);

      expect(AuditLog.logAction).toHaveBeenCalledTimes(1);
      expect(AuditLog.logAction).toHaveBeenCalledWith({
        userId: null, // Key difference for system actions
        action: AuditService.ACTIONS.SYSTEM_BACKUP,
        entityType: AuditService.ENTITIES.SYSTEM,
        entityId: null,
        oldValues: undefined,
        newValues: undefined,
        request: null,
        result: 'SUCCESS',
        errorMessage: undefined,
        metadata: { job: 'SYSTEM_BACKUP' },
      });
    });
  });

  // --- Tests for logAuthAction ---
  describe('logAuthAction', () => {
    it('should log a successful login with user details and request metadata', async () => {
      const mockUser = { id: 1, email: 'user@test.com', firstName: 'Test', lastName: 'User' };
      const mockReq = {
        headers: { 'user-agent': 'TestBrowser/1.0' },
        ip: '127.0.0.1',
        user: mockUser,
      };

      // Spy on logUserAction to ensure it's being called correctly by the higher-level method
      const logUserActionSpy = vi.spyOn(AuditService, 'logUserAction');

      await AuditService.logAuthAction(AuditService.ACTIONS.USER_LOGIN, mockReq, mockUser);

      expect(logUserActionSpy).toHaveBeenCalledTimes(1);
      expect(logUserActionSpy).toHaveBeenCalledWith(AuditService.ACTIONS.USER_LOGIN, {
        req: mockReq,
        entityType: AuditService.ENTITIES.USER,
        entityId: 1,
        newValues: {
          id: 1,
          email: 'user@test.com',
          firstName: 'Test',
          lastName: 'User',
        },
        metadata: {
          userAgent: 'TestBrowser/1.0',
          ipAddress: '127.0.0.1',
        },
      });
    });

    it('should handle a failed login attempt where user is null', async () => {
        const mockReq = {
            headers: { 'user-agent': 'TestBrowser/1.0' },
            ip: '192.168.1.1',
        };
        const logUserActionSpy = vi.spyOn(AuditService, 'logUserAction');

        await AuditService.logAuthAction(AuditService.ACTIONS.USER_LOGIN, mockReq, null, { reason: 'Bad password' });

        expect(logUserActionSpy).toHaveBeenCalledWith(AuditService.ACTIONS.USER_LOGIN, {
            req: mockReq,
            entityType: AuditService.ENTITIES.USER,
            entityId: null,
            newValues: null,
            metadata: {
                reason: 'Bad password',
                userAgent: 'TestBrowser/1.0',
                ipAddress: '192.168.1.1',
            }
        });
    });
  });

  // --- Tests for logAdminAction ---
  describe('logAdminAction', () => {
    it('should log an admin action with specific admin metadata', async () => {
      const mockAdminUser = { id: 1, email: 'admin@oldmanfooty.au' };
      const mockReq = { user: mockAdminUser };
      const options = {
        oldValues: { role: 'user' },
        newValues: { role: 'admin' },
        targetUserId: 25,
      };

      const logUserActionSpy = vi.spyOn(AuditService, 'logUserAction');

      await AuditService.logAdminAction(AuditService.ACTIONS.USER_ROLE_CHANGE, mockReq, AuditService.ENTITIES.USER, 25, options);

      expect(logUserActionSpy).toHaveBeenCalledTimes(1);
      expect(logUserActionSpy).toHaveBeenCalledWith(AuditService.ACTIONS.USER_ROLE_CHANGE, {
        req: mockReq,
        entityType: AuditService.ENTITIES.USER,
        entityId: 25,
        oldValues: { role: 'user' },
        newValues: { role: 'admin' },
        metadata: {
          isAdminAction: true,
          adminUserId: 1,
          adminEmail: 'admin@oldmanfooty.au',
          targetUserId: 25,
        },
      });
    });
  });

  // --- Tests for createAuditMiddleware ---
  describe('createAuditMiddleware', () => {
    // Use vitest's fake timers to control setImmediate
    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    it('should call next() to pass control to the next middleware', async () => {
      const middleware = AuditService.createAuditMiddleware('ACTION', 'ENTITY');
      const mockReq = {};
      const mockRes = { end: vi.fn() };
      const mockNext = vi.fn();

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should log an action when res.end is called for a successful request', async () => {
        const getEntityId = (req) => req.params.id;
        const middleware = AuditService.createAuditMiddleware(AuditService.ACTIONS.CLUB_UPDATE, AuditService.ENTITIES.CLUB, getEntityId);
        
        const mockReq = { params: { id: 101 } };
        const mockRes = { statusCode: 200, end: function() { this.end.called = true; } };
        const mockNext = vi.fn();

        // Spy on the service's own method
        const logSpy = vi.spyOn(AuditService, 'logUserAction');

        middleware(mockReq, mockRes, mockNext);
        
        // Simulate the response ending
        mockRes.end();
        
        // Fast-forward all timers
        vi.runAllTimers();

        expect(logSpy).toHaveBeenCalledTimes(1);
        expect(logSpy).toHaveBeenCalledWith(AuditService.ACTIONS.CLUB_UPDATE, {
            req: mockReq,
            entityType: AuditService.ENTITIES.CLUB,
            entityId: 101,
            newValues: null,
            result: 'SUCCESS',
            errorMessage: null
        });
    });

    it('should log an action as FAILURE for a 4xx or 5xx status code', async () => {
        const getEntityId = (req) => req.params.id;
        const middleware = AuditService.createAuditMiddleware(AuditService.ACTIONS.CLUB_DELETE, AuditService.ENTITIES.CLUB, getEntityId);
        
        const mockReq = { params: { id: 102 } };
        const mockRes = { statusCode: 404, end: function() { this.end.called = true; } };
        const mockNext = vi.fn();

        const logSpy = vi.spyOn(AuditService, 'logUserAction');

        middleware(mockReq, mockRes, mockNext);
        mockRes.end();
        vi.runAllTimers();

        // Corrected assertion: Check for two arguments.
        // 1. The action string
        // 2. An object containing the failure details
        expect(logSpy).toHaveBeenCalledWith(
            AuditService.ACTIONS.CLUB_DELETE,
            expect.objectContaining({
                result: 'FAILURE',
                errorMessage: 'HTTP 404'
            })
        );
    });
  });

  // --- Tests for sanitizeData ---
  describe('sanitizeData', () => {
    it('should redact top-level sensitive fields', () => {
      const data = { name: 'test', password: '12345password', token: 'abc-123' };
      const sanitized = AuditService.sanitizeData(data);
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.name).toBe('test');
    });

    it('should redact nested sensitive fields', () => {
      const data = { user: { details: { passwordResetToken: 'xyz-789' } }, id: 1 };
      const sanitized = AuditService.sanitizeData(data);
      expect(sanitized.user.details.passwordResetToken).toBe('[REDACTED]');
      expect(sanitized.id).toBe(1);
    });

    it('should redact sensitive fields within an array of objects', () => {
      const data = [
        { id: 1, apiKey: 'key-1' },
        { id: 2, secret: 'secret-2' },
      ];
      const sanitized = AuditService.sanitizeData(data);
      expect(sanitized[0].apiKey).toBe('[REDACTED]');
      expect(sanitized[1].secret).toBe('[REDACTED]');
    });

    it('should return non-object data as-is', () => {
      expect(AuditService.sanitizeData(null)).toBeNull();
      expect(AuditService.sanitizeData(undefined)).toBeUndefined();
      expect(AuditService.sanitizeData('a string')).toBe('a string');
    });
  });

  // --- Tests for formatAuditLog ---
  describe('formatAuditLog', () => {
    it('should format an audit log with a user correctly', () => {
      const log = {
        id: 1,
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: 10,
        userId: 10,
        user: { firstName: 'John', lastName: 'Doe', email: 'john.doe@test.com' },
        result: 'SUCCESS',
        ipAddress: '127.0.0.1',
        createdAt: new Date(),
        oldValues: { status: 'pending' },
        newValues: { status: 'active' },
        metadata: { browser: 'Chrome' },
      };
      const formatted = AuditService.formatAuditLog(log);
      expect(formatted.userName).toBe('John Doe');
      expect(formatted.userEmail).toBe('john.doe@test.com');
      expect(formatted.hasChanges).toBe(true);
    });

    it('should format an audit log for a system action correctly', () => {
      const log = {
        id: 2,
        action: 'SYSTEM_BACKUP',
        entityType: 'System',
        userId: null,
        user: null,
        result: 'SUCCESS',
        createdAt: new Date(),
      };
      const formatted = AuditService.formatAuditLog(log);
      expect(formatted.userName).toBe('System');
      expect(formatted.userEmail).toBe('support@oldmanfooty.au');
      expect(formatted.hasChanges).toBe(false);
    });
  });
});
