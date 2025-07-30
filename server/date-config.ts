/**
 * Date and Time Configuration Module
 * Centralizes all date/time formatting and timezone handling
 */

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Load configuration from environment variables
export const DATE_CONFIG = {
  timezone: process.env.SERVER_TIMEZONE || 'America/Sao_Paulo',
  locale: process.env.SERVER_LOCALE || 'pt-BR',
  dateFormat: process.env.DATE_FORMAT || 'dd/MM/yyyy',
  timeFormat: process.env.TIME_FORMAT || 'HH:mm:ss',
  datetimeFormat: process.env.DATETIME_FORMAT || 'dd/MM/yyyy HH:mm:ss',
} as const;

// Configure Node.js timezone globally
process.env.TZ = DATE_CONFIG.timezone;

/**
 * Format a date according to server configuration
 */
export function formatServerDate(date: Date | string | null): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    console.warn('Invalid date provided to formatServerDate:', date);
    return '';
  }
  
  return format(dateObj, DATE_CONFIG.dateFormat, { locale: ptBR });
}

/**
 * Format a time according to server configuration
 */
export function formatServerTime(date: Date | string | null): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    console.warn('Invalid date provided to formatServerTime:', date);
    return '';
  }
  
  return format(dateObj, DATE_CONFIG.timeFormat, { locale: ptBR });
}

/**
 * Format a datetime according to server configuration
 */
export function formatServerDateTime(date: Date | string | null): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    console.warn('Invalid date provided to formatServerDateTime:', date);
    return '';
  }
  
  return format(dateObj, DATE_CONFIG.datetimeFormat, { locale: ptBR });
}

/**
 * Get current server time in configured timezone
 */
export function getServerNow(): Date {
  return new Date();
}

/**
 * Convert a date to server timezone
 */
export function toServerTimezone(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Since we've set process.env.TZ, new Date() operations will be in server timezone
  return new Date(dateObj.toLocaleString('en-US', { timeZone: DATE_CONFIG.timezone }));
}

/**
 * MySQL date format helper
 */
export function toMySQLDateTime(date: Date | string | null): string {
  if (!date) return 'NULL';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    console.warn('Invalid date provided to toMySQLDateTime:', date);
    return 'NULL';
  }
  
  // MySQL datetime format: YYYY-MM-DD HH:mm:ss
  return format(dateObj, 'yyyy-MM-dd HH:mm:ss');
}

/**
 * Get MySQL timezone setting
 */
export function getMySQLTimezone(): string {
  // Convert timezone to MySQL format
  const offset = new Date().getTimezoneOffset();
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  const sign = offset > 0 ? '-' : '+';
  
  return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Initialize server date configuration
 */
export function initializeDateConfig(): void {
  console.log(`🕐 Date/Time Configuration Initialized:`);
  console.log(`   Timezone: ${DATE_CONFIG.timezone}`);
  console.log(`   Locale: ${DATE_CONFIG.locale}`);
  console.log(`   Date Format: ${DATE_CONFIG.dateFormat}`);
  console.log(`   Time Format: ${DATE_CONFIG.timeFormat}`);
  console.log(`   DateTime Format: ${DATE_CONFIG.datetimeFormat}`);
  console.log(`   Current Server Time: ${formatServerDateTime(getServerNow())}`);
  console.log(`   MySQL Timezone: ${getMySQLTimezone()}`);
}

// Log configuration on module load
initializeDateConfig();