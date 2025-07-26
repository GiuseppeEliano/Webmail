/**
 * Client-side Date Utilities
 * Provides consistent date formatting matching server configuration
 */

import { format, formatDistanceToNow } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';

// Client-side date configuration to match server
export const CLIENT_DATE_CONFIG = {
  locale: 'pt-BR',
  dateFormat: 'dd/MM/yyyy',
  timeFormat: 'HH:mm:ss',
  datetimeFormat: 'dd/MM/yyyy HH:mm:ss',
  shortTimeFormat: 'HH:mm',
  timezone: 'America/Sao_Paulo',
} as const;

/**
 * Format a date according to Brazilian format (dd/MM/yyyy)
 */
export function formatBrazilianDate(date: Date | string | null): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    console.warn('Invalid date provided to formatBrazilianDate:', date);
    return '';
  }
  
  return format(dateObj, CLIENT_DATE_CONFIG.dateFormat, { locale: ptBR });
}

/**
 * Format a time according to Brazilian format (HH:mm:ss)
 */
export function formatBrazilianTime(date: Date | string | null): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    console.warn('Invalid date provided to formatBrazilianTime:', date);
    return '';
  }
  
  return format(dateObj, CLIENT_DATE_CONFIG.timeFormat, { locale: ptBR });
}

/**
 * Format a short time (HH:mm) for UI display
 */
export function formatShortTime(date: Date | string | null): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    console.warn('Invalid date provided to formatShortTime:', date);
    return '';
  }
  
  return format(dateObj, CLIENT_DATE_CONFIG.shortTimeFormat, { locale: ptBR });
}

/**
 * Format a datetime according to Brazilian format (dd/MM/yyyy HH:mm:ss)
 */
export function formatBrazilianDateTime(date: Date | string | null): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    console.warn('Invalid date provided to formatBrazilianDateTime:', date);
    return '';
  }
  
  return format(dateObj, CLIENT_DATE_CONFIG.datetimeFormat, { locale: ptBR });
}

/**
 * Format relative time for email listing (e.g., "2 horas atrás", "hoje", "ontem")
 */
export function formatRelativeTime(date: Date | string | null): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    console.warn('Invalid date provided to formatRelativeTime:', date);
    return '';
  }
  
  const now = new Date();
  const diffInHours = Math.abs(now.getTime() - dateObj.getTime()) / (1000 * 60 * 60);
  
  // If less than 24 hours, show time
  if (diffInHours < 24) {
    return formatShortTime(dateObj);
  }
  
  // If less than 7 days, show day of week
  if (diffInHours < 168) { // 7 days
    return format(dateObj, 'EEEE', { locale: ptBR });
  }
  
  // Otherwise show full date
  return formatBrazilianDate(dateObj);
}

/**
 * Get current Brazilian time
 */
export function getBrazilianNow(): Date {
  return new Date();
}

/**
 * Convert UTC date to Brazilian timezone display
 */
export function toBrazilianTimezone(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Convert to Brazilian timezone for display
  return new Date(dateObj.toLocaleString('en-US', { timeZone: CLIENT_DATE_CONFIG.timezone }));
}

/**
 * Format date with localization support for email display
 * @param date - Date to format
 * @param language - Language code ('en' or 'pt')
 * @returns Formatted date string
 */
export function formatEmailDate(date: Date | string | null, language: 'en' | 'pt' = 'pt'): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    console.warn('Invalid date provided to formatEmailDate:', date);
    return '';
  }

  if (language === 'pt') {
    // Brazilian format: "Ago 1, 2025, 01:37 AM"
    return dateObj.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: CLIENT_DATE_CONFIG.timezone
    });
  } else {
    // English format: "Aug 1, 2025, 01:37 AM"  
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: CLIENT_DATE_CONFIG.timezone
    });
  }
}

/**
 * Format relative time with localization support
 * @param date - Date to format
 * @param language - Language code ('en' or 'pt')
 * @returns Relative time string (e.g., "2 meses atrás" or "about 2 months ago")
 */
export function formatRelativeTimeLocalized(date: Date | string | null, language: 'en' | 'pt' = 'pt'): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    console.warn('Invalid date provided to formatRelativeTimeLocalized:', date);
    return '';
  }

  const locale = language === 'pt' ? ptBR : enUS;
  
  return formatDistanceToNow(dateObj, { 
    addSuffix: true,
    locale: locale
  });
}

/**
 * Parse Brazilian date format (dd/MM/yyyy) to Date object
 */
export function parseBrazilianDate(dateString: string): Date | null {
  if (!dateString) return null;
  
  // Try to parse dd/MM/yyyy format
  const parts = dateString.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  // Fallback to standard parsing
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}