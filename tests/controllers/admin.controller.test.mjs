/**
 * Admin Controller Tests
 * Focused tests for contact submissions and subscribers tab behavior.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../middleware/asyncHandler.mjs', () => ({
  wrapControllers: (controllers) => controllers
}));

vi.mock('../../services/email/AuthEmailService.mjs', () => ({
  default: {
    sendPasswordResetEmail: vi.fn()
  }
}));

vi.mock('../../services/email/ContactEmailService.mjs', () => ({
  default: {
    sendContactReply: vi.fn()
  }
}));

vi.mock('../../services/auditService.mjs', () => ({
  default: {
    ACTIONS: {},
    ENTITIES: {},
    sanitizeData: (data) => data,
    logAdminAction: vi.fn()
  }
}));

vi.mock('../../utils/uploadProcessor.mjs', () => ({
  processStructuredUploads: vi.fn(() => ({ processedFiles: [] }))
}));

vi.mock('../../models/index.mjs', () => ({
  User: { count: vi.fn(), findAll: vi.fn(), findByPk: vi.fn(), findOne: vi.fn() },
  Club: { count: vi.fn(), findAll: vi.fn(), findByPk: vi.fn(), findOne: vi.fn() },
  Carnival: { count: vi.fn(), findAll: vi.fn(), findByPk: vi.fn(), findOne: vi.fn() },
  Sponsor: { count: vi.fn(), findAll: vi.fn(), findByPk: vi.fn(), findOne: vi.fn() },
  EmailSubscription: { count: vi.fn(), findAndCountAll: vi.fn(), findAll: vi.fn(), findOne: vi.fn() },
  AuditLog: { count: vi.fn(), findAndCountAll: vi.fn() },
  ContactSubmission: { count: vi.fn(), findAndCountAll: vi.fn(), findByPk: vi.fn() },
  ContactReply: { count: vi.fn(), findAndCountAll: vi.fn(), findByPk: vi.fn() },
  sequelize: {}
}));

import * as adminController from '../../controllers/admin.controller.mjs';
import { ContactSubmission, EmailSubscription } from '../../models/index.mjs';

describe('Admin Controller - Contact submissions page', () => {
  let req;
  let res;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      query: {}
    };

    res = {
      render: vi.fn()
    };

    ContactSubmission.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: [
        {
          toJSON: () => ({
            id: 101,
            firstName: 'Sam',
            lastName: 'Sender',
            email: 'sam@example.com',
            subject: 'general',
            status: 'new',
            emailDeliveryStatus: 'sent',
            submittedAt: new Date('2026-01-01T10:00:00Z'),
            replies: [{ id: 1 }, { id: 2 }]
          })
        }
      ]
    });

    EmailSubscription.findAndCountAll.mockResolvedValue({
      count: 2,
      rows: [
        {
          toJSON: () => ({
            id: 201,
            email: 'sub1@example.com',
            createdAt: new Date('2026-01-02T08:00:00Z'),
            notificationPreferences: ['Carnival_Notifications', 'Website_Updates']
          })
        },
        {
          toJSON: () => ({
            id: 202,
            email: 'sub2@example.com',
            createdAt: new Date('2026-01-03T09:00:00Z'),
            notificationPreferences: []
          })
        }
      ]
    });
  });

  it('defaults to messages tab and renders both datasets', async () => {
    await adminController.getContactSubmissions(req, res);

    expect(ContactSubmission.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 20,
        offset: 0
      })
    );

    expect(EmailSubscription.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
        limit: 20,
        offset: 0
      })
    );

    expect(res.render).toHaveBeenCalledWith(
      'admin/contact-submissions',
      expect.objectContaining({
        activeTab: 'messages',
        submissions: expect.any(Array),
        subscribers: expect.any(Array),
        pagination: expect.objectContaining({ currentPage: 1 }),
        subscribersPagination: expect.objectContaining({ currentPage: 1 })
      })
    );
  });

  it('uses independent page params for messages and subscribers', async () => {
    req.query = {
      tab: 'subscribers',
      messagesPage: '3',
      subscribersPage: '2'
    };

    await adminController.getContactSubmissions(req, res);

    expect(ContactSubmission.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        offset: 40
      })
    );

    expect(EmailSubscription.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        offset: 20
      })
    );

    expect(res.render).toHaveBeenCalledWith(
      'admin/contact-submissions',
      expect.objectContaining({
        activeTab: 'subscribers',
        pagination: expect.objectContaining({ currentPage: 3 }),
        subscribersPagination: expect.objectContaining({ currentPage: 2 })
      })
    );
  });

  it('falls back to legacy page query for messages pagination', async () => {
    req.query = {
      tab: 'messages',
      page: '2'
    };

    await adminController.getContactSubmissions(req, res);

    expect(ContactSubmission.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        offset: 20
      })
    );

    expect(res.render).toHaveBeenCalledWith(
      'admin/contact-submissions',
      expect.objectContaining({
        activeTab: 'messages',
        pagination: expect.objectContaining({ currentPage: 2 })
      })
    );
  });

  it('maps subscriber notification type values for view output', async () => {
    await adminController.getContactSubmissions(req, res);

    const renderPayload = res.render.mock.calls[0][1];

    expect(renderPayload.subscribers[0]).toMatchObject({
      email: 'sub1@example.com',
      notificationType: 'Carnival_Notifications, Website_Updates'
    });

    expect(renderPayload.subscribers[1]).toMatchObject({
      email: 'sub2@example.com',
      notificationType: 'All Notifications'
    });
  });
});
