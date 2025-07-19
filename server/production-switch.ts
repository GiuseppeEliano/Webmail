// Production Environment Switcher
// This file automatically switches between development and production storage

import { storage as memStorage } from './storage';

// Import production storage when available
let productionStorage: any;
try {
  // Use MySQL in production mode or when database variables are configured
  if (process.env.NODE_ENV === 'production' || process.env.DB_HOST || process.env.DATABASE_URL) {
    // Try to load production storage
    productionStorage = require('./storage-production-fixed-temp').productionStorage;
    console.log('✅ MySQL storage loaded');
  }
} catch (error) {
  console.log('ℹ️ MySQL storage not available, using memory storage');
  console.log('To enable MySQL storage:');
  console.log('1. Set NODE_ENV=production');
  console.log('2. Configure DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
  console.log('3. Or set DATABASE_URL for direct connection');
  console.log('4. Import database/production_schema.sql to your MySQL server');
}

// Export the appropriate storage
export const storage = productionStorage || memStorage;

// Export connection test function
export async function testProductionConnection() {
  if (productionStorage) {
    try {
      const { testConnection } = require('./db-production');
      return await testConnection();
    } catch (error) {
      console.error('Production database connection failed:', error);
      return false;
    }
  }
  return false;
}

// Log current storage mode
if (productionStorage) {
  if (process.env.NODE_ENV === 'production') {
    console.log('🚀 Running in PRODUCTION mode with MySQL database');
  } else {
    console.log('🔧 Running in DEVELOPMENT mode with MySQL database');
  }
} else {
  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️ Production mode requested but using memory storage (check database configuration)');
  } else {
    console.log('🔧 Running in DEVELOPMENT mode with memory storage');
  }
}