import fs from 'fs';
import path from 'path';

console.log('🗑️ Removing corrupted E2E database...');

// Remove the corrupted E2E database
const e2eDbPath = path.join(process.cwd(), 'data', 'e2e-old-man-footy.db');
if (fs.existsSync(e2eDbPath)) {
  fs.unlinkSync(e2eDbPath);
  console.log('✅ Removed corrupted E2E database');
} else {
  console.log('ℹ️ E2E database file not found');
}

// Also clean up any WAL/SHM files
const walPath = e2eDbPath + '-wal';
const shmPath = e2eDbPath + '-shm';

if (fs.existsSync(walPath)) {
  fs.unlinkSync(walPath);
  console.log('✅ Removed WAL file');
}

if (fs.existsSync(shmPath)) {
  fs.unlinkSync(shmPath);
  console.log('✅ Removed SHM file');
}

console.log('🎉 Database cleanup complete!');
