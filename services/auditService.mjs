/**
 * Audit Service - Centralized Audit Logging
 * 
 * Provides a centralized service for logging user and system actions across
 * the Old Man Footy platform. Handles audit trail creation with proper
 * context extraction and standardized action naming.
 */

import AuditLog from '../models/AuditLog.mjs';

/**
 * Audit Service Class
 */
class AuditService {
  /**
   * Standard action types for consistent audit logging
   */
  static ACTIONS = {
    // User Actions
    USER_LOGIN: 'USER_LOGIN',
    USER_LOGOUT: 'USER_LOGOUT',
    USER_REGISTER: 'USER_REGISTER',
    USER_CREATE: 'USER_CREATE',
    USER_UPDATE: 'USER_UPDATE',
    USER_DELETE: 'USER_DELETE',
    USER_ACTIVATE: 'USER_ACTIVATE',
    USER_DEACTIVATE: 'USER_DEACTIVATE',
    USER_PASSWORD_RESET: 'USER_PASSWORD_RESET',
    USER_ROLE_CHANGE: 'USER_ROLE_CHANGE',
    USER_INVITATION_SEND: 'USER_INVITATION_SEND',
    USER_INVITATION_ACCEPT: 'USER_INVITATION_ACCEPT',

    // Club Actions
    CLUB_CREATE: 'CLUB_CREATE',
    CLUB_UPDATE: 'CLUB_UPDATE',
    CLUB_DELETE: 'CLUB_DELETE',
    CLUB_ACTIVATE: 'CLUB_ACTIVATE',
    CLUB_DEACTIVATE: 'CLUB_DEACTIVATE',
    CLUB_CLAIM: 'CLUB_CLAIM',
    CLUB_TRANSFER_OWNERSHIP: 'CLUB_TRANSFER_OWNERSHIP',

    // Carnival Actions
    CARNIVAL_CREATE: 'CARNIVAL_CREATE',
    CARNIVAL_UPDATE: 'CARNIVAL_UPDATE',
    CARNIVAL_DELETE: 'CARNIVAL_DELETE',
    CARNIVAL_ACTIVATE: 'CARNIVAL_ACTIVATE',
    CARNIVAL_DEACTIVATE: 'CARNIVAL_DEACTIVATE',
    CARNIVAL_CLAIM: 'CARNIVAL_CLAIM',
    CARNIVAL_MERGE: 'CARNIVAL_MERGE',
    CARNIVAL_REGISTER_CLUB: 'CARNIVAL_REGISTER_CLUB',
    CARNIVAL_APPROVE_REGISTRATION: 'CARNIVAL_APPROVE_REGISTRATION',
    CARNIVAL_REJECT_REGISTRATION: 'CARNIVAL_REJECT_REGISTRATION',

    // Player Actions
    PLAYER_CREATE: 'PLAYER_CREATE',
    PLAYER_UPDATE: 'PLAYER_UPDATE',
    PLAYER_DELETE: 'PLAYER_DELETE',
    PLAYER_IMPORT: 'PLAYER_IMPORT',
    PLAYER_ASSIGN_CARNIVAL: 'PLAYER_ASSIGN_CARNIVAL',
    PLAYER_REMOVE_CARNIVAL: 'PLAYER_REMOVE_CARNIVAL',

    // Admin Actions
    ADMIN_USER_IMPERSONATE: 'ADMIN_USER_IMPERSONATE',
    ADMIN_SYSTEM_SYNC: 'ADMIN_SYSTEM_SYNC',
    ADMIN_DATA_EXPORT: 'ADMIN_DATA_EXPORT',
    ADMIN_BULK_UPDATE: 'ADMIN_BULK_UPDATE',

    // System Actions
    SYSTEM_STARTUP: 'SYSTEM_STARTUP',
    SYSTEM_SYNC_MYSIDELINE: 'SYSTEM_SYNC_MYSIDELINE',
    SYSTEM_EMAIL_SEND: 'SYSTEM_EMAIL_SEND',
    SYSTEM_BACKUP: 'SYSTEM_BACKUP',
    SYSTEM_MAINTENANCE: 'SYSTEM_MAINTENANCE'
  };

  /**
   * Entity types for consistent categorization
   */
  static ENTITIES = {
    USER: 'User',
    CLUB: 'Club',
    CARNIVAL: 'Carnival',
    PLAYER: 'Player',
    SPONSOR: 'Sponsor',
    SYSTEM: 'System'
  };

  /**
   * Log a user action with full context
   * @param {string} action - Action performed (use ACTIONS constants)
   * @param {Object} options - Logging options
   * @param {Object} options.req - Express request object
   * @param {string} options.entityType - Type of entity affected
   * @param {number|null} options.entityId - ID of affected entity
   * @param {Object|null} options.oldValues - Previous values
   * @param {Object|null} options.newValues - New values
   * @param {Object|null} options.metadata - Additional context
   * @param {string} options.result - SUCCESS or FAILURE (default: SUCCESS)
   * @param {string|null} options.errorMessage - Error message if failed
   * @returns {Promise<AuditLog>} Created audit log entry
   */
  static async logUserAction(action, options = {}) {
    const {
      req,
      entityType,
      entityId,
      oldValues,
      newValues,
      metadata,
      result = 'SUCCESS',
      errorMessage
    } = options;

    const userId = req?.user?.id || null;

    return await AuditLog.logAction({
      userId,
      action,
      entityType,
      entityId,
      oldValues,
      newValues,
      request: req,
      result,
      errorMessage,
      metadata
    });
  }

  /**
   * Log a system action (no user context)
   * @param {string} action - Action performed (use ACTIONS constants)
   * @param {Object} options - Logging options
   * @param {string} options.entityType - Type of entity affected
   * @param {number|null} options.entityId - ID of affected entity
   * @param {Object|null} options.oldValues - Previous values
   * @param {Object|null} options.newValues - New values
   * @param {Object|null} options.metadata - Additional context
   * @param {string} options.result - SUCCESS or FAILURE (default: SUCCESS)
   * @param {string|null} options.errorMessage - Error message if failed
   * @returns {Promise<AuditLog>} Created audit log entry
   */
  static async logSystemAction(action, options = {}) {
    const {
      entityType,
      entityId,
      oldValues,
      newValues,
      metadata,
      result = 'SUCCESS',
      errorMessage
    } = options;

    return await AuditLog.logAction({
      userId: null, // System actions have no user
      action,
      entityType,
      entityId,
      oldValues,
      newValues,
      request: null,
      result,
      errorMessage,
      metadata
    });
  }

  /**
   * Log authentication events
   * @param {string} action - AUTH action type
   * @param {Object} req - Express request object
   * @param {Object|null} user - User object (may be null for failed logins)
   * @param {Object} metadata - Additional context
   * @returns {Promise<AuditLog>} Created audit log entry
   */
  static async logAuthAction(action, req, user = null, metadata = {}) {
    return await this.logUserAction(action, {
      req,
      entityType: this.ENTITIES.USER,
      entityId: user?.id || null,
      newValues: user ? {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      } : null,
      metadata: {
        ...metadata,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      }
    });
  }

  /**
   * Log admin actions performed on behalf of others
   * @param {string} action - Action performed
   * @param {Object} req - Express request object (admin user)
   * @param {string} entityType - Type of entity affected
   * @param {number} entityId - ID of affected entity
   * @param {Object} options - Additional options
   * @returns {Promise<AuditLog>} Created audit log entry
   */
  static async logAdminAction(action, req, entityType, entityId, options = {}) {
    const {
      oldValues,
      newValues,
      targetUserId,
      metadata = {}
    } = options;

    return await this.logUserAction(action, {
      req,
      entityType,
      entityId,
      oldValues,
      newValues,
      metadata: {
        ...metadata,
        isAdminAction: true,
        adminUserId: req.user?.id,
        adminEmail: req.user?.email,
        targetUserId
      }
    });
  }

  /**
   * Create audit middleware for automatic logging
   * @param {string} action - Action to log
   * @param {string} entityType - Entity type
   * @param {Function} getEntityId - Function to extract entity ID from req
   * @param {Function} getValues - Function to extract values from req/res
   * @returns {Function} Express middleware function
   */
  static createAuditMiddleware(action, entityType, getEntityId, getValues = null) {
    return async (req, res, next) => {
      // Store original end function
      const originalEnd = res.end;

      // Override res.end to capture response
      res.end = function(chunk, encoding) {
        // Call original end function
        originalEnd.call(this, chunk, encoding);

        // Log the action after response is sent
        setImmediate(async () => {
          try {
            const entityId = getEntityId ? getEntityId(req) : null;
            const values = getValues ? getValues(req, res) : null;

            await AuditService.logUserAction(action, {
              req,
              entityType,
              entityId,
              newValues: values,
              result: res.statusCode >= 400 ? 'FAILURE' : 'SUCCESS',
              errorMessage: res.statusCode >= 400 ? `HTTP ${res.statusCode}` : null
            });
          } catch (error) {
            console.error('❌ Audit logging failed:', error);
          }
        });
      };

      next();
    };
  }

  /**
   * Sanitize sensitive data from audit logs
   * @param {Object} data - Data to sanitize
   * @returns {Object} Sanitized data
   */
  static sanitizeData(data) {
    if (!data || typeof data !== 'object') return data;

    const sensitiveFields = [
      'password', 'passwordHash', 'token', 'secret', 'key',
      'passwordResetToken', 'invitationToken', 'sessionId', 'apiKey'
    ];

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    const sanitized = { ...data };

    // Recursively sanitize all properties
    Object.keys(sanitized).forEach(key => {
      const value = sanitized[key];
      
      // Check if this field is sensitive
      if (sensitiveFields.includes(key)) {
        sanitized[key] = '[REDACTED]';
      }
      // Recursively sanitize nested objects and arrays
      else if (value && typeof value === 'object') {
        sanitized[key] = this.sanitizeData(value);
      }
    });

    return sanitized;
  }

  /**
   * Get formatted audit log for display
   * @param {AuditLog} auditLog - Audit log instance
   * @returns {Object} Formatted audit log
   */
  static formatAuditLog(auditLog) {
    return {
      id: auditLog.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      userId: auditLog.userId,
      userName: auditLog.user ? `${auditLog.user.firstName} ${auditLog.user.lastName}` : 'System',
      userEmail: auditLog.user?.email || 'support@oldmanfooty.au',
      result: auditLog.result,
      ipAddress: auditLog.ipAddress,
      timestamp: auditLog.createdAt,
      hasChanges: !!(auditLog.oldValues || auditLog.newValues),
      metadata: auditLog.metadata || {}
    };
  }
}

export default AuditService;