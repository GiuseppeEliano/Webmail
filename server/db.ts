import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from "@shared/schema";
import { getMySQLTimezone } from './date-config';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Example: mysql://user:password@host:port/database",
  );
}

// Create connection pool for better performance with timezone configuration
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: getMySQLTimezone(), // Configure timezone for all connections
});

// Set timezone for all connections in the pool
pool.on('connection', async (connection) => {
  try {
    await connection.execute(`SET time_zone = '${getMySQLTimezone()}'`);
    console.log(`🕐 MySQL connection configured with timezone: ${getMySQLTimezone()}`);
  } catch (error) {
    console.warn('⚠️ Failed to set timezone for MySQL connection:', error);
  }
});

export const db = drizzle(pool, { schema, mode: 'default' });
