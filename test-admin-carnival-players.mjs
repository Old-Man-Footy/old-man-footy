import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('Testing admin carnival players route...');

// Create a simple test to check the admin route functionality
const testAdminRoute = `
import request from 'supertest';
import app from '../app.mjs';

console.log('✅ Testing admin carnival players route access...');

// Test that the route exists and is properly configured
try {
    const response = await request(app)
        .get('/admin/carnivals/2/players')
        .expect(302); // Should redirect to login since no auth

    console.log('✅ Admin carnival players route is properly configured');
    console.log('✅ Route correctly requires authentication (redirects to login)');
} catch (error) {
    console.log('❌ Route test failed:', error.message);
}

console.log('🎉 Admin route test completed!');
`;

// Write and run the test
await import('fs/promises').then(fs => fs.writeFile('test-route.mjs', testAdminRoute));

try {
    const { stdout, stderr } = await execAsync('node test-route.mjs');
    console.log(stdout);
    if (stderr) console.error(stderr);
} catch (error) {
    console.error('Test failed:', error.message);
}

// Clean up
await import('fs/promises').then(fs => fs.unlink('test-route.mjs').catch(() => {}));
