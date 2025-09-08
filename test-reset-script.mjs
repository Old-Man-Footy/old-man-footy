import { execSync } from 'child_process';

try {
  console.log('Testing the simple E2E reset script...');
  
  // Run the reset script
  execSync('node scripts/simple-e2e-reset.mjs', { 
    stdio: 'inherit', 
    cwd: process.cwd() 
  });
  
  console.log('✅ Reset script completed successfully');
  
} catch (error) {
  console.error('❌ Reset script failed:', error.message);
}
