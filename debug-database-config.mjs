#!/usr/bin/env node

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Debugging Database Configuration');
console.log('=====================================');

// Check current environment
console.log(`📍 Current NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
console.log(`📍 Working directory: ${process.cwd()}`);

// Check different database configuration approaches
const databaseConfigs = {
  development: path.join(__dirname, 'data', 'dev-old-man-footy.db'),
  test: path.join(__dirname, 'data', 'test-old-man-footy.db'),
  e2e: path.join(__dirname, 'data', 'e2e-old-man-footy.db')
};

console.log('\n📊 Database Path Configuration:');
for (const [env, dbPath] of Object.entries(databaseConfigs)) {
  console.log(`  ${env}: ${dbPath}`);
  console.log(`    Exists: ${fs.existsSync(dbPath) ? '✅' : '❌'}`);
  if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    console.log(`    Size: ${stats.size} bytes`);
    console.log(`    Modified: ${stats.mtime}`);
  }
}

// Try to load the actual config
console.log('\n🔧 Loading Database Config:');
try {
  const { databaseConfig } = await import('./config/database.mjs');
  console.log('✅ Database config loaded successfully');
  console.log('Config object:', JSON.stringify(databaseConfig, null, 2));
} catch (error) {
  console.log('❌ Failed to load database config:', error.message);
}

// Check sequelize configuration
console.log('\n⚙️ Checking Sequelize Configuration:');
try {
  const configModule = await import('./config/config.mjs');
  console.log('✅ Sequelize config loaded successfully');
  console.log('Available environments:', Object.keys(configModule.default || configModule));
  
  const config = configModule.default || configModule;
  const currentEnv = process.env.NODE_ENV || 'development';
  const envConfig = config[currentEnv];
  
  if (envConfig) {
    console.log(`Configuration for ${currentEnv}:`, JSON.stringify(envConfig, null, 2));
  } else {
    console.log(`❌ No configuration found for environment: ${currentEnv}`);
  }
} catch (error) {
  console.log('❌ Failed to load sequelize config:', error.message);
}

// Check data directory
console.log('\n📁 Data Directory Contents:');
const dataDir = path.join(__dirname, 'data');
if (fs.existsSync(dataDir)) {
  const files = fs.readdirSync(dataDir);
  files.forEach(file => {
    const filePath = path.join(dataDir, file);
    const stats = fs.statSync(filePath);
    console.log(`  ${file} - ${stats.size} bytes - ${stats.mtime}`);
  });
} else {
  console.log('❌ Data directory does not exist');
}

console.log('\n🏁 Debug complete');
