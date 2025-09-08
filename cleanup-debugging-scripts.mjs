/**
 * @file cleanup-debugging-scripts.mjs
 * @description Clean up all temporary debugging scripts created during E2E testing implementation
 */

import { unlink } from 'fs/promises';
import { existsSync } from 'fs';

// List of all debugging scripts to remove
const debuggingScripts = [
  // Root level debugging scripts
  'debug-database-config.mjs',
  'debug-e2e-table-issue.mjs', 
  'delete-e2e-database.mjs',
  'diagnose-carnival-table.mjs',
  'force-kill-all-node.mjs',
  'investigate-database-corruption.mjs',
  'kill-all-node-processes.mjs',
  'kill-all-node.mjs',
  'kill-all-servers-now.mjs',
  'kill-existing-servers.mjs',
  'kill-servers.mjs',
  'recreate-e2e-database-fresh.mjs',
  'recreate-e2e-database.mjs',
  'simple-e2e-setup.mjs',
  'temp-fix-carnival.mjs',
  'test-e2e-database-setup.mjs',
  'test-e2e-reset.mjs',
  'test-e2e-server-startup.mjs',
  'test-e2e-setup.mjs',
  'test-production-maintenance.mjs',
  'test-reset-script.mjs',
  'test-startup-integration.mjs',
  'cleanup-temp-scripts.mjs',
  
  // Scripts folder debugging scripts
  'scripts/setup-e2e-database-clean.mjs',
  'scripts/start-e2e-server.mjs',
  'scripts/start-e2e-server-isolated.mjs'
];

async function cleanupDebuggingScripts() {
  console.log('🧹 Cleaning up debugging scripts created during E2E testing implementation...');
  
  let deletedCount = 0;
  let skippedCount = 0;
  
  for (const script of debuggingScripts) {
    try {
      if (existsSync(script)) {
        await unlink(script);
        console.log(`✅ Deleted: ${script}`);
        deletedCount++;
      } else {
        console.log(`⏭️  Skipped (not found): ${script}`);
        skippedCount++;
      }
    } catch (error) {
      console.error(`❌ Error deleting ${script}:`, error.message);
    }
  }
  
  console.log(`\n📊 Cleanup Summary:`);
  console.log(`   Deleted: ${deletedCount} files`);
  console.log(`   Skipped: ${skippedCount} files (already deleted)`);
  console.log(`✅ Debugging script cleanup completed`);
}

// Run cleanup
cleanupDebuggingScripts().catch(console.error);
