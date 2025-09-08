import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function killExistingServers() {
    console.log('🛑 Killing any existing servers...');
    
    try {
        // Kill any node processes running on port 3000 or 3055
        const commands = [
            'taskkill /F /IM node.exe',
            'netstat -ano | findstr :3000',
            'netstat -ano | findstr :3055'
        ];
        
        for (const cmd of commands) {
            try {
                const { stdout, stderr } = await execAsync(cmd);
                if (stdout) console.log(`Command output: ${stdout}`);
                if (stderr && !stderr.includes('not found')) console.log(`Command stderr: ${stderr}`);
            } catch (error) {
                // Ignore errors - processes may not exist
                console.log(`Command "${cmd}" completed (may have been no processes to kill)`);
            }
        }
        
        console.log('✅ Server termination commands completed');
        
        // Wait a moment for processes to fully terminate
        await new Promise(resolve => setTimeout(resolve, 2000));
        
    } catch (error) {
        console.error('Error killing servers:', error.message);
    }
}

await killExistingServers();
