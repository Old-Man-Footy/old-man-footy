#!/usr/bin/env node

/**
 * Secure Secret Generator Script
 * 
 * Generates cryptographically secure random secrets for use in environment variables
 * Default length is 64 characters (hex) = 128 bits of entropy
 * 
 * Usage:
 * npm run generate:secret                  // Generate 6+4-char hex secret
 * npm run generate:secret -- --length 128  // Generate custom length
 * npm run generate:secret -- --base64      // Generate base64 encoded secret
 * npm run generate:secret -- --help        // Show help
 */

import { randomBytes } from 'crypto';

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  length: 64,
  format: 'hex',
  help: false
};

// Process arguments
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--length':
    case '-l':
      options.length = parseInt(args[++i]);
      if (isNaN(options.length) || options.length < 8) {
        console.error('❌ Error: Length must be a number >= 8');
        process.exit(1);
      }
      break;
    case '--base64':
    case '-b':
      options.format = 'base64';
      break;
    case '--hex':
    case '-h':
      options.format = 'hex';
      break;
    case '--help':
      options.help = true;
      break;
    default:
      if (args[i].startsWith('-')) {
        console.error(`❌ Error: Unknown option: ${args[i]}`);
        process.exit(1);
      }
  }
}

// Show help
if (options.help) {
  console.log(`
🔐 Secure Secret Generator

Usage: npm run generate:secret [options]

Options:
  --length, -l <number>   Length of secret (default: 32, minimum: 8)
  --base64, -b           Output in base64 format (default: hex)
  --hex, -h              Output in hex format
  --help                 Show this help message

Examples:
  npm run generate:secret                    # Generate 32-char hex secret
  npm run generate:secret -- --length 64    # Generate 64-char hex secret
  npm run generate:secret -- --base64       # Generate base64 secret
  npm run generate:secret -- --length 16 --base64  # 16-char base64 secret

Common Use Cases:
  SESSION_SECRET (32+ chars):  npm run generate:secret
  JWT_SECRET (32+ chars):      npm run generate:secret
  ENCRYPTION_KEY (32 chars):   npm run generate:secret
  API_KEY (64 chars):          npm run generate:secret -- --length 64
`);
  process.exit(0);
}

// Generate the secret
try {
  const bytes = Math.ceil(options.length * (options.format === 'base64' ? 0.75 : 0.5));
  const secret = randomBytes(bytes).toString(options.format).substring(0, options.length);
  
  console.log('🔐 Generated Secure Secret:');
  console.log('=' .repeat(50));
  console.log(`Format: ${options.format.toUpperCase()}`);
  console.log(`Length: ${secret.length} characters`);
  console.log(`Entropy: ~${Math.floor(secret.length * (options.format === 'base64' ? 6 : 4))} bits`);
  console.log('');
  console.log('Secret:');
  console.log(secret);
  console.log('');
  console.log('💡 Tips:');
  console.log('- Store this in your .env file or environment variables');
  console.log('- Never commit secrets to version control');
  console.log('- Use different secrets for different environments');
  console.log('- Regenerate secrets periodically for better security');
  
} catch (error) {
  console.error('❌ Error generating secret:', error.message);
  process.exit(1);
}
