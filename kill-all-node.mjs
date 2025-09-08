import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🛑 Killing all Node.js processes...');

try {
  await execAsync('taskkill /F /IM node.exe');
  console.log('✅ All Node.js processes terminated');
} catch (error) {
  console.log('ℹ️ No Node.js processes to kill');
}

console.log('⏳ Waiting for processes to close...');
await new Promise(resolve => setTimeout(resolve, 3000));
console.log('✅ Ready to continue');
