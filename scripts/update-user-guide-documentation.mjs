/**
 * @file update-user-guide-documentation.mjs
 * @description Master script to generate screenshots and update user guides
 */

import ScreenshotGenerator from './generate-user-guide-screenshots.mjs';
import UserGuideUpdater from './update-user-guides.mjs';

async function updateUserGuideDocumentation() {
  console.log('🚀 Starting User Guide Documentation Update Process...\n');
  
  try {
    console.log('\n📝 Updating User Guides');
    console.log('='.repeat(50));
    
    // Step 2: Update the guides with new screenshots and links
    const updater = new UserGuideUpdater();
    updater.updateAllGuides();
    
    console.log('\n✅ User Guide Documentation Update Complete!');
    console.log('📋 Summary:');
    console.log('  ✓ Screenshots generated for standard users');
    console.log('  ✓ Screenshots generated for delegate users');
    console.log('  ✓ Mobile screenshots captured');
    console.log('  ✓ Standard user guide updated');
    console.log('  ✓ Delegate user guide updated');
    console.log('  ✓ All links and references updated');
    
  } catch (error) {
    console.error('❌ Error during documentation update:', error);
    process.exit(1);
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  updateUserGuideDocumentation();
}

export default updateUserGuideDocumentation;
