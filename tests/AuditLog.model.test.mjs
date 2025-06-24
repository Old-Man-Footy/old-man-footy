/**
 * @file AuditLog Model Unit Tests
 * @description Jest unit tests for the AuditLog Sequelize model.
 *
 * Follows AAA (Arrange, Act, Assert) pattern and project security/MVC/testing guidelines.
 */
import { sequelize, User, AuditLog } from '../models/index.mjs';

// Use the test database
beforeAll(async () => {
  await sequelize.sync({ force: true });
});

describe('AuditLog Model', () => {
  let user;

  beforeEach(async () => {
    // Clean up tables before each test
    await AuditLog.destroy({ where: {} });
    await User.destroy({ where: {} });
    // Create a user for association
    user = await User.create({
      email: 'testuser@example.com',
      passwordHash: 'testpassword',
      firstName: 'Test',
      lastName: 'User',
      isActive: true
    });
  });

  afterEach(async () => {
    await AuditLog.destroy({ where: {} });
    await User.destroy({ where: {} });
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
          headers: { 'user-agent': 'jest-test' },
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
      expect(log.userAgent).toBe('jest-test');
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
  });
});
