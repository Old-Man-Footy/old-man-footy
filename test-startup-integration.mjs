/**
 * @file test-startup-integration.mjs
 * @description Test the help content seeding integration during app startup
 */

import { spawn } from 'child_process';

async function testStartupIntegration() {
  console.log('Testing help content seeding during application startup...\n');

  return new Promise((resolve, reject) => {
    // Start the application
    const appProcess = spawn('node', ['app.mjs'], {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'development' }
    });

    let stdout = '';
    let stderr = '';
    let startupCompleted = false;

    // Collect output
    appProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log('STDOUT:', output.trim());
      
      // Check for help content seeding messages
      if (output.includes('📚 Seeding help content...') || 
          output.includes('✅ Help content seeded:') ||
          output.includes('Help content is already up to date')) {
        console.log('✅ Help content seeding detected in startup');
      }
      
      // Check for server startup completion
      if (output.includes('🚀 Server is running on') || output.includes('Server running')) {
        startupCompleted = true;
        console.log('✅ Server startup completed');
        
        // Give it a moment then kill the process
        setTimeout(() => {
          appProcess.kill('SIGTERM');
        }, 2000);
      }
    });

    appProcess.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.log('STDERR:', output.trim());
    });

    appProcess.on('close', (code) => {
      console.log(`\nApplication process exited with code: ${code}`);
      
      // Analyze the output
      const hasHelpSeeding = stdout.includes('📚 Seeding help content') || 
                            stdout.includes('✅ Help content seeded') ||
                            stdout.includes('Help content is already up to date');
      
      if (hasHelpSeeding && startupCompleted) {
        console.log('✅ SUCCESS: Help content seeding is working during startup');
        resolve({ success: true, stdout, stderr });
      } else {
        console.log('❌ FAILURE: Help content seeding not detected or startup failed');
        console.log('Help seeding detected:', hasHelpSeeding);
        console.log('Startup completed:', startupCompleted);
        resolve({ success: false, stdout, stderr });
      }
    });

    appProcess.on('error', (error) => {
      console.error('❌ Error starting application:', error);
      reject(error);
    });

    // Safety timeout
    setTimeout(() => {
      if (!startupCompleted) {
        console.log('❌ Timeout waiting for startup completion');
        appProcess.kill('SIGKILL');
        resolve({ success: false, stdout, stderr, timeout: true });
      }
    }, 30000); // 30 second timeout
  });
}

// Run the test
try {
  const result = await testStartupIntegration();
  
  if (result.success) {
    console.log('\n🎉 Help content startup integration is working correctly!');
    process.exit(0);
  } else {
    console.log('\n❌ Help content startup integration test failed');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
}
