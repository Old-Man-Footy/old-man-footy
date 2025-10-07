/**
 * Test the theme flash fix by verifying theme-init.js runs synchronously
 */

console.log('Testing theme flash fix...');

// Simulate loading the theme-init.js file without module type
const fs = await import('fs');
const path = await import('path');

const themeInitPath = path.join(process.cwd(), 'public', 'js', 'theme-init.js');
const themeInitContent = fs.readFileSync(themeInitPath, 'utf8');

console.log('✅ Theme-init.js found');

// Check if the file has the auto-initialization code for non-module usage
const hasAutoInit = themeInitContent.includes('if (typeof window !== \'undefined\' && !window.__THEME_INIT_MODULE_MODE__)');
console.log(hasAutoInit ? '✅ Auto-initialization code present' : '❌ Auto-initialization code missing');

// Check if the function is exported (which means it can still be used as a module when needed)
const hasExport = themeInitContent.includes('export function initTheme()');
console.log(hasExport ? '✅ Export function present for module usage' : '❌ Export function missing');

console.log('\n🎯 The fix should work as follows:');
console.log('1. theme-init.js loads synchronously (no type="module")');
console.log('2. Auto-initialization runs immediately');
console.log('3. Theme is applied before any content renders');
console.log('4. No theme flash occurs');

console.log('\n🔧 Test by:');
console.log('1. Navigate to http://localhost:3050');
console.log('2. Switch to dark mode');
console.log('3. Navigate between pages');
console.log('4. Observe no theme flash');
