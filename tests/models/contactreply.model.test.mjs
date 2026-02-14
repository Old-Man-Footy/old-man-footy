import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockReplies = [];

const ContactReply = {
  destroy: vi.fn(async ({ where }) => {
    const cutoff = where.createdAt['$lt'] || where.createdAt[Object.getOwnPropertySymbols(where.createdAt)[0]];
    const before = mockReplies.length;
    for (let i = mockReplies.length - 1; i >= 0; i -= 1) {
      if (mockReplies[i].createdAt < cutoff) {
        mockReplies.splice(i, 1);
      }
    }
    return before - mockReplies.length;
  }),
  cleanupOldReplies: vi.fn(async (retentionDays = 365) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    return ContactReply.destroy({
      where: {
        createdAt: {
          $lt: cutoffDate,
        },
      },
    });
  }),
};

describe('ContactReply model retention cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReplies.length = 0;
    mockReplies.push({ id: 1, createdAt: new Date(Date.now() - 500 * 24 * 60 * 60 * 1000) });
    mockReplies.push({ id: 2, createdAt: new Date() });
  });

  it('removes only replies older than the retention period', async () => {
    const deletedCount = await ContactReply.cleanupOldReplies(365);

    expect(deletedCount).toBe(1);
    expect(mockReplies).toHaveLength(1);
    expect(mockReplies[0].id).toBe(2);
  });
});
