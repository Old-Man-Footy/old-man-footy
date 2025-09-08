/**
 * Clean up any database connections and temporary files
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

async function cleanupDatabaseConnections() {
    console.log('🧹 Cleaning up database connections and locks...');
    
    const e2eDbPath = path.join(process.cwd(), 'data', 'e2e-old-man-footy.db');
    
    // Kill any node processes that might be holding database connections
    try {
        console.log('🔍 Checking for node processes...');
        const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV');
        console.log('Node processes:', stdout);
    } catch (error) {
        console.log('No node processes or error checking:', error.message);
    }
    
    // Try to kill node processes related to old-man-footy
    try {
        console.log('🔪 Killing old-man-footy node processes...');
        await execAsync('taskkill /F /IM node.exe');
        console.log('✅ Node processes killed');
    } catch (error) {
        console.log('ℹ️ No node processes to kill or error:', error.message);
    }
    
    // Wait a moment for processes to fully terminate
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if database file exists and try to delete it
    try {
        if (fs.existsSync(e2eDbPath)) {
            console.log('🗑️ Attempting to delete E2E database file...');
            fs.unlinkSync(e2eDbPath);
            console.log('✅ E2E database file deleted');
        } else {
            console.log('ℹ️ E2E database file does not exist');
        }
    } catch (error) {
        console.error('❌ Error deleting E2E database file:', error.message);
        
        // Try to force delete with PowerShell
        try {
            console.log('🔨 Trying force delete with PowerShell...');
            await execAsync(`powershell -Command "Remove-Item '${e2eDbPath}' -Force"`);
            console.log('✅ Force deleted with PowerShell');
        } catch (psError) {
            console.error('❌ PowerShell force delete failed:', psError.message);
        }
    }
    
    // Also clean up any WAL or SHM files
    const walFile = e2eDbPath + '-wal';
    const shmFile = e2eDbPath + '-shm';
    
    for (const file of [walFile, shmFile]) {
        try {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
                console.log(`✅ Deleted ${path.basename(file)}`);
            }
        } catch (error) {
            console.log(`ℹ️ Could not delete ${path.basename(file)}:`, error.message);
        }
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    cleanupDatabaseConnections()
        .then(() => {
            console.log('🏁 Database cleanup complete');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Database cleanup failed:', error);
            process.exit(1);
        });
}
