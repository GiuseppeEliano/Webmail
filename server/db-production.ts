import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '@shared/schema';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create connection pool for production
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'eliano_webmail',
  charset: 'utf8mb4',
  timezone: '+00:00',
  connectionLimit: 20,
  queueLimit: 0,
});

// Test database connection
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Initialize database with proper configuration
export const db = drizzle(pool, { 
  schema, 
  mode: 'default',
  logger: process.env.NODE_ENV === 'development'
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing database connection pool...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing database connection pool...');
  await pool.end();
  process.exit(0);
});