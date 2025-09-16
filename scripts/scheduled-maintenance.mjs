/**
 * Scheduled Database Maintenance Script
 *
 * Runs regular maintenance tasks: performance analysis, optimization, and backup.
 * Uses node-cron for scheduling. Follows strict MVC and security best practices.
 *
 * @schedule Daily at 2:00 AM server time
 * @location scripts/scheduled-maintenance.mjs
 */

import cron from 'node-cron';
import DatabaseOptimizer from '../config/database-optimizer.mjs';
import { closeConnection } from '../config/database.mjs';

// Schedule: daily at 2:00 AM
cron.schedule('0 2 * * *', async () => {
  console.log('🔧 [Maintenance] Starting scheduled database maintenance...');
  try {
    await DatabaseOptimizer.performMaintenance();
    await DatabaseOptimizer.backupDatabase();
    const stats = await DatabaseOptimizer.analyzePerformance();
    console.log('📊 [Maintenance] Database performance stats:', stats);
  } catch (error) {
    console.error('❌ [Maintenance] Scheduled maintenance failed:', error);
  } finally {
    await closeConnection();
    console.log('🔌 [Maintenance] Database connection closed after maintenance.');
  }
});

console.log('⏰ [Maintenance] Scheduled database maintenance task set for daily at 2:00 AM.');

// Graceful shutdown handling for Docker
process.on('SIGTERM', async () => {
  console.log('🛑 [Maintenance] Received SIGTERM signal, shutting down gracefully...');
  await closeConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 [Maintenance] Received SIGINT signal, shutting down gracefully...');
  await closeConnection();
  process.exit(0);
});

// Keep the process alive
process.on('exit', () => {
  console.log('🔌 [Maintenance] Process exiting...');
});

console.log('🚀 [Maintenance] Scheduled maintenance service is now running...');
