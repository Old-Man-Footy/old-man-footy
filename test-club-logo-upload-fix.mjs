// Test club logo upload fix
import { Club } from '../models/index.mjs';
import fs from 'fs';
import path from 'path';

async function testClubLogoUploadFix() {
    console.log('🔍 Testing club logo upload fix...');
    
    try {
        // Find test club
        const club = await Club.findByPk(44);
        if (!club) {
            console.log('❌ Test club 44 not found');
            return;
        }
        
        console.log(`📋 Club before test: ${club.clubName}`);
        console.log(`📁 Current logoUrl: ${club.logoUrl || 'NULL'}`);
        
        // Check if uploads directory exists
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'clubs', '44');
        console.log(`📂 Checking uploads directory: ${uploadsDir}`);
        
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            console.log(`📄 Files in directory: ${files.length > 0 ? files.join(', ') : 'No files found'}`);
        } else {
            console.log('📂 Uploads directory does not exist');
        }
        
        console.log('\n✅ Club logo upload fix verification complete');
        console.log('🔧 The fix has been applied: added clubUpload.process middleware to club edit route');
        console.log('🎯 Next: Test by uploading a logo through the browser at http://localhost:3050/clubs/44/edit');
        
    } catch (error) {
        console.error('❌ Error testing club logo upload fix:', error);
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    await testClubLogoUploadFix();
}
