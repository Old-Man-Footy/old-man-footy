#!/usr/bin/env node

/**
 * Kill all node.js processes that might be running servers
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🚨 Terminating all Node.js processes...');

try {
  // Kill all node processes
  await execAsync('taskkill /F /IM node.exe');
  console.log('✅ All Node.js processes terminated.');
} catch (error) {
  if (error.message.includes('not found')) {
    console.log('✅ No Node.js processes were running.');
  } else {
    console.error('❌ Error terminating processes:', error.message);
  }
}

console.log('🎯 All clear for fresh startup.');
