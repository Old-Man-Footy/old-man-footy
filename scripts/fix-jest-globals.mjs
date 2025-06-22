#!/usr/bin/env node

/**
 * Fix Jest Globals for ES Modules
 * 
 * This script automatically adds Jest globals imports to all test files
 * to fix the "jest is not defined" errors in ES Modules.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JEST_GLOBALS_IMPORT = "import { jest, describe, test, it, expect, beforeAll, beforeEach, afterAll, afterEach } from '@jest/globals';\n";

/**
 * Fix Jest globals imports in test files
 */
async function fixJestGlobals() {
    const testsDir = path.join(__dirname, '..', 'tests');
    
    try {
        const files = await fs.readdir(testsDir);
        const testFiles = files.filter(file => file.endsWith('.test.mjs') || file.endsWith('.spec.mjs'));
        
        console.log(`📝 Found ${testFiles.length} test files to process`);
        
        for (const file of testFiles) {
            const filePath = path.join(testsDir, file);
            
            try {
                const content = await fs.readFile(filePath, 'utf8');
                
                // Check if Jest globals import is already present
                if (content.includes("from '@jest/globals'")) {
                    console.log(`✅ ${file} - Already has Jest globals import`);
                    continue;
                }
                
                // Check if file uses Jest globals (describe, test, expect, etc.)
                const usesJestGlobals = /\b(describe|test|it|expect|beforeAll|beforeEach|afterAll|afterEach|jest\.)\b/.test(content);
                
                if (!usesJestGlobals) {
                    console.log(`⏭️  ${file} - No Jest globals detected, skipping`);
                    continue;
                }
                
                // Find the position to insert the import (after existing imports)
                const lines = content.split('\n');
                let insertIndex = 0;
                let foundImports = false;
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    
                    // Skip comments and empty lines at the top
                    if (line.startsWith('/**') || line.startsWith('*') || line.startsWith('//') || line === '') {
                        continue;
                    }
                    
                    // If we find an import statement, mark that we found imports
                    if (line.startsWith('import ')) {
                        foundImports = true;
                        insertIndex = i + 1;
                    } else if (foundImports && !line.startsWith('import ')) {
                        // We've reached the end of imports
                        break;
                    } else if (!foundImports) {
                        // No imports found yet, insert after comments
                        insertIndex = i;
                        break;
                    }
                }
                
                // Insert the Jest globals import
                lines.splice(insertIndex, 0, JEST_GLOBALS_IMPORT);
                
                const newContent = lines.join('\n');
                await fs.writeFile(filePath, newContent, 'utf8');
                
                console.log(`🔧 ${file} - Added Jest globals import`);
                
            } catch (error) {
                console.error(`❌ Error processing ${file}:`, error.message);
            }
        }
        
        console.log('\n✅ Jest globals import fix completed!');
        
    } catch (error) {
        console.error('❌ Error reading tests directory:', error.message);
        process.exit(1);
    }
}

// Run the fix
fixJestGlobals().catch(console.error);