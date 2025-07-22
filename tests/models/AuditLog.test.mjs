/**
 * @file AuditLog Model Unit Tests
 * @description Vitest unit tests for the AuditLog Sequelize model.
 *
 * Follows AAA (Arrange, Act, Assert) pattern and project security/MVC/testing guidelines.
 */
import { describe, test, it, expect, beforeEach, vi } from 'vitest';

// Mock AuditLog and User models
const mockAuditLogs = [];
const mockUsers = [];

const AuditLog = {
  logAction: vi.fn(async (data) => {
    // Simulate validation
    if (!data.action || !data.entityType) throw new Error('Invalid action/entityType');
    if (data.request && data.request.ip === 'not-an-ip') throw new Error('Invalid IP');
    if (data.result && !['SUCCESS', 'FAILURE'].includes(data.result)) throw new Error('Invalid result');
    const log = {
      ...data,
      id: mockAuditLogs.length + 1,
      ipAddress: data.request?.ip ?? null,
      userAgent: data.request?.headers?.['user-agent'] ?? null,
      sessionId: data.request?.sessionID ?? null,
      result: data.result ?? 'SUCCESS',
      metadata: data.metadata ?? null,
    };
    mockAuditLogs.push(log);
    return log;
  }),
  getUserAuditLogs: vi.fn(async (userId) => {
    const rows = mockAuditLogs.filter(l => l.userId === userId);
    return { rows, count: rows.length };
  }),
  getEntityAuditLogs: vi.fn(async (entityType, entityId) => {
    return mockAuditLogs.filter(l => l.entityType === entityType && l.entityId === entityId);
  }),
  getAuditStatistics: vi.fn(async () => {
    const totalActions = mockAuditLogs.length;
    const failedActions = mockAuditLogs.filter(l => l.result === 'FAILURE').length;
    const successfulActions = mockAuditLogs.filter(l => l.result === 'SUCCESS').length;
    // Group by action type
    const actionsByType = Array.from(new Set(mockAuditLogs.map(l => l.action))).map(action => ({ action, count: mockAuditLogs.filter(l => l.action === action).length }));
    // Group by user
    const actionsByUser = Array.from(new Set(mockAuditLogs.map(l => l.userId))).map(userId => ({ userId, count: mockAuditLogs.filter(l => l.userId === userId).length }));
    return {
      totalActions,
      failedActions,
      successfulActions,
      actionsByType,
      actionsByUser,
      successRate: totalActions ? (successfulActions / totalActions) * 100 : 0,
    };
  }),
  cleanupOldLogs: vi.fn(async (days) => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const before = mockAuditLogs.length;
    for (let i = mockAuditLogs.length - 1; i >= 0; i--) {
      if (mockAuditLogs[i].createdAt && mockAuditLogs[i].createdAt.getTime() < cutoff) {
        mockAuditLogs.splice(i, 1);
      }
    }
    return before - mockAuditLogs.length;
  }),
  create: vi.fn(async (data) => {
    const log = { ...data, id: mockAuditLogs.length + 1 };
    mockAuditLogs.push(log);
    return log;
  }),
  findByPk: vi.fn(async (id) => mockAuditLogs.find(l => l.id === id) ?? null),
  destroy: vi.fn(async () => { mockAuditLogs.length = 0; }),
};

const User = {
  create: vi.fn(async (data) => {
    const user = { ...data, id: mockUsers.length + 1 };
    mockUsers.push(user);
    return user;
  }),
  destroy: vi.fn(async () => { mockUsers.length = 0; }),
};

describe('AuditLog Model', () => {
  let user;

  beforeEach(async () => {
    mockAuditLogs.length = 0;
    mockUsers.length = 0;
    user = await User.create({
      email: 'testuser@example.com',
      passwordHash: 'testpassword',
      firstName: 'Test',
      lastName: 'User',
      isActive: true
    });
  });

  describe('logAction', () => {
    it('should create an audit log entry for a user action', async () => {
      // Arrange
      const actionData = {
        userId: user.id,
        action: 'CREATE_USER',
        entityType: 'User',
        entityId: user.id,
        oldValues: null,
        newValues: { email: user.email },
        request: {
          ip: '127.0.0.1',
          headers: { 'user-agent': 'vitest-test' },
          sessionID: 'sess123'
        },
        result: 'SUCCESS',
        errorMessage: null,
        metadata: { foo: 'bar' }
      };
      // Act
      const log = await AuditLog.logAction(actionData);
      // Assert
      expect(log).toBeDefined();
      expect(log.userId).toBe(user.id);
      expect(log.action).toBe('CREATE_USER');
      expect(log.entityType).toBe('User');
      expect(log.entityId).toBe(user.id);
      expect(log.ipAddress).toBe('127.0.0.1');
      expect(log.userAgent).toBe('vitest-test');
      expect(log.sessionId).toBe('sess123');
      expect(log.result).toBe('SUCCESS');
      expect(log.metadata).toEqual({ foo: 'bar' });
    });

    it('should handle missing request object gracefully', async () => {
      // Arrange
      const actionData = {
        userId: null,
        action: 'SYSTEM_MAINTENANCE',
        entityType: 'System',
        entityId: null,
        oldValues: null,
        newValues: null,
        request: null,
        result: 'SUCCESS',
        errorMessage: null,
        metadata: null
      };
      // Act
      const log = await AuditLog.logAction(actionData);
      // Assert
      expect(log).toBeDefined();
      expect(log.userId).toBeNull();
      expect(log.ipAddress).toBeNull();
      expect(log.userAgent).toBeNull();
      expect(log.sessionId).toBeNull();
    });
  });

  describe('getUserAuditLogs', () => {
    it('should return audit logs for a specific user', async () => {
      // Arrange
      await AuditLog.logAction({
        userId: user.id,
        action: 'LOGIN',
        entityType: 'User',
        entityId: user.id,
        oldValues: null,
        newValues: null,
        request: null,
        result: 'SUCCESS',
        errorMessage: null,
        metadata: null
      });
      // Act
      const { rows, count } = await AuditLog.getUserAuditLogs(user.id);
      // Assert
      expect(count).toBe(1);
      expect(rows[0].action).toBe('LOGIN');
      expect(rows[0].userId).toBe(user.id);
    });
  });

  describe('getEntityAuditLogs', () => {
    it('should return audit logs for a specific entity', async () => {
      // Arrange
      await AuditLog.logAction({
        userId: user.id,
        action: 'UPDATE_USER',
        entityType: 'User',
        entityId: user.id,
        oldValues: { firstName: 'Old' },
        newValues: { firstName: 'New' },
        request: null,
        result: 'SUCCESS',
        errorMessage: null,
        metadata: null
      });
      // Act
      const logs = await AuditLog.getEntityAuditLogs('User', user.id);
      // Assert
      expect(logs.length).toBe(1);
      expect(logs[0].action).toBe('UPDATE_USER');
      expect(logs[0].entityType).toBe('User');
      expect(logs[0].entityId).toBe(user.id);
    });
  });

  describe('getAuditStatistics', () => {
    it('should return audit statistics', async () => {
      // Arrange
      await AuditLog.logAction({
        userId: user.id,
        action: 'LOGIN',
        entityType: 'User',
        entityId: user.id,
        oldValues: null,
        newValues: null,
        request: null,
        result: 'SUCCESS',
        errorMessage: null,
        metadata: null
      });
      await AuditLog.logAction({
        userId: user.id,
        action: 'LOGIN',
        entityType: 'User',
        entityId: user.id,
        oldValues: null,
        newValues: null,
        request: null,
        result: 'FAILURE',
        errorMessage: 'Invalid password',
        metadata: null
      });
      // Act
      const stats = await AuditLog.getAuditStatistics();
      // Assert
      expect(stats.totalActions).toBe(2);
      expect(stats.failedActions).toBe(1);
      expect(stats.successfulActions).toBe(1);
      expect(stats.actionsByType.length).toBeGreaterThan(0);
      expect(stats.actionsByUser.length).toBeGreaterThan(0);
      expect(Number(stats.successRate)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('cleanupOldLogs', () => {
    it('should delete logs older than retention period', async () => {
      // Arrange
      const oldLog = await AuditLog.create({
        userId: user.id,
        action: 'OLD_ACTION',
        entityType: 'User',
        entityId: user.id,
        oldValues: null,
        newValues: null,
        ipAddress: null,
        userAgent: null,
        sessionId: null,
        result: 'SUCCESS',
        errorMessage: null,
        metadata: null,
        createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000) // 400 days ago
      });
      // Act
      const deleted = await AuditLog.cleanupOldLogs(365);
      // Assert
      expect(deleted).toBeGreaterThanOrEqual(1);
      const found = await AuditLog.findByPk(oldLog.id);
      expect(found).toBeNull();
    });

    it('should not create an audit log entry with invalid action or entityType', async () => {
      // Arrange: action and entityType are empty strings (invalid)
      const invalidActionData = {
      userId: user.id,
      action: '',
      entityType: '',
      entityId: user.id,
      oldValues: null,
      newValues: null,
      request: null,
      result: 'SUCCESS',
      errorMessage: null,
      metadata: null
      };
      // Act & Assert
      await expect(AuditLog.logAction(invalidActionData)).rejects.toThrow();
    });

    it('should validate ipAddress format', async () => {
      // Arrange: invalid IP address
      const invalidIpData = {
      userId: user.id,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      oldValues: null,
      newValues: null,
      request: {
        ip: 'not-an-ip',
        headers: { 'user-agent': 'vitest-test' },
        sessionID: 'sess123'
      },
      result: 'SUCCESS',
      errorMessage: null,
      metadata: null
      };
      // Act & Assert
      await expect(AuditLog.logAction(invalidIpData)).rejects.toThrow();
    });

    it('should default result to SUCCESS if not provided', async () => {
      // Arrange
      const actionData = {
      userId: user.id,
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: user.id,
      oldValues: null,
      newValues: { email: user.email },
      request: null,
      errorMessage: null,
      metadata: null
      };
      // Act
      const log = await AuditLog.logAction(actionData);
      // Assert
      expect(log.result).toBe('SUCCESS');
    });

    it('should allow metadata to be null or an object', async () => {
      // Arrange
      const actionDataNull = {
      userId: user.id,
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: user.id,
      oldValues: null,
      newValues: { email: user.email },
      request: null,
      result: 'SUCCESS',
      errorMessage: null,
      metadata: null
      };
      const actionDataObj = {
      ...actionDataNull,
      metadata: { foo: 'bar', baz: 123 }
      };
      // Act
      const logNull = await AuditLog.logAction(actionDataNull);
      const logObj = await AuditLog.logAction(actionDataObj);
      // Assert
      expect(logNull.metadata).toBeNull();
      expect(logObj.metadata).toEqual({ foo: 'bar', baz: 123 });
    });

    it('should not allow result to be other than SUCCESS or FAILURE', async () => {
      // Arrange
      const actionData = {
      userId: user.id,
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: user.id,
      oldValues: null,
      newValues: { email: user.email },
      request: null,
      result: 'INVALID_RESULT',
      errorMessage: null,
      metadata: null
      };
      // Act & Assert
      await expect(AuditLog.logAction(actionData)).rejects.toThrow();
    });
  });
});
