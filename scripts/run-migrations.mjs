#!/usr/bin/env node
/**
 * Run database migrations programmatically using the app's Umzug setup.
 * Safe to run repeatedly; will apply only pending migrations.
 */
import { setupDatabase, closeConnection } from '../config/database.mjs';

async function main() {
  try {
    console.log('🔧 Starting database setup (migrations + checks)...');
    await setupDatabase();
    console.log('✅ Migrations applied and schema verified.');
    process.exitCode = 0;
  } catch (err) {
    console.error('❌ Migration runner failed:', err?.stack || err?.message || err);
    process.exitCode = 1;
  } finally {
    await closeConnection();
  }
}

main();
