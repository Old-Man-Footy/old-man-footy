import cron from 'node-cron';
import { ContactReply, SyncLog } from '../models/index.mjs';

/**
 * Contact reply retention maintenance service.
 */
class ContactReplyRetentionService {
  constructor() {
    this.isRunning = false;
    this.retentionDays = Number.parseInt(process.env.CONTACT_REPLY_RETENTION_DAYS || '365', 10);
    this.schedule = process.env.CONTACT_REPLY_RETENTION_CRON || '30 3 * * *';
  }

  /**
   * Initialize daily retention cleanup schedule.
   */
  initializeScheduledCleanup() {
    cron.schedule(this.schedule, async () => {
      await this.runCleanup('scheduled');
    });

    console.log(`🗂️ Contact reply retention cleanup scheduled (${this.schedule})`);
  }

  /**
   * Execute retention cleanup.
   * @param {string} triggerSource
   * @returns {Promise<{success: boolean, deletedCount?: number, error?: string}>}
   */
  async runCleanup(triggerSource = 'manual') {
    if (this.isRunning) {
      return { success: false, error: 'Contact reply retention cleanup is already running' };
    }

    this.isRunning = true;

    const syncLog = await SyncLog.startSync('contact_reply_retention', {
      triggerSource,
      retentionDays: this.retentionDays,
      environment: process.env.NODE_ENV || 'development',
    });

    try {
      const deletedCount = await ContactReply.cleanupOldReplies(this.retentionDays);

      await syncLog.markCompleted({
        carnivalsProcessed: deletedCount,
        carnivalsCreated: 0,
        carnivalsUpdated: 0,
      });

      return { success: true, deletedCount };
    } catch (error) {
      await syncLog.markFailed(error.message);
      return { success: false, error: error.message };
    } finally {
      this.isRunning = false;
    }
  }
}

export default new ContactReplyRetentionService();
