import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';

// Create a JSDOM window for server-side DOMPurify
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window as any);

// Configure DOMPurify for email content security
const EMAIL_PURIFY_CONFIG = {
  // Allowed tags for rich email content
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'span', 'div',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'a', 'img'
  ],
  
  // Allowed attributes
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'style',
    'target', 'rel', 'width', 'height'
  ],
  
  // Additional security options
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button', 'iframe'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  SANITIZE_DOM: true
};

/**
 * Sanitize HTML content for email storage and display
 * Removes potentially dangerous tags and attributes while preserving formatting
 */
export function sanitizeEmailContent(htmlContent: string): string {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return '';
  }

  try {
    // First pass: Remove obviously dangerous content
    let sanitized = htmlContent
      // Remove script tags and their content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove style tags that could contain malicious CSS
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      // Remove javascript: protocols
      .replace(/javascript:/gi, '')
      // Remove data: protocols except for safe image formats
      .replace(/data:(?!image\/(png|jpg|jpeg|gif|webp|svg))/gi, '')
      // Remove vbscript: protocols
      .replace(/vbscript:/gi, '');

    // Second pass: Use DOMPurify for comprehensive sanitization
    sanitized = DOMPurify.sanitize(sanitized, EMAIL_PURIFY_CONFIG);

    // Third pass: Additional custom cleaning
    sanitized = sanitized
      // Remove any remaining event handlers
      .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
      // Remove expression() CSS which can execute JavaScript
      .replace(/expression\s*\([^)]*\)/gi, '')
      // Remove -moz-binding which can load external content
      .replace(/-moz-binding\s*:[^;]*/gi, '');

    console.log('🔒 HTML content sanitized:', {
      originalLength: htmlContent.length,
      sanitizedLength: sanitized.length,
      dangerousContentRemoved: htmlContent.length - sanitized.length > 0
    });

    return sanitized;
  } catch (error) {
    console.error('❌ Error sanitizing HTML content:', error);
    // In case of error, strip all HTML tags as fallback
    return htmlContent.replace(/<[^>]*>/g, '');
  }
}

/**
 * Sanitize plain text content to prevent injection attacks
 */
export function sanitizeTextContent(textContent: string): string {
  if (!textContent || typeof textContent !== 'string') {
    return '';
  }

  // Remove null bytes and control characters except newlines and tabs
  return textContent
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Validate and sanitize email addresses
 */
export function sanitizeEmailAddress(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }

  // Basic email format validation and sanitization
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleaned = email.toLowerCase().trim();
  
  if (!emailRegex.test(cleaned)) {
    throw new Error('Invalid email format');
  }

  return cleaned;
}

/**
 * Sanitize email subject lines
 */
export function sanitizeSubject(subject: string): string {
  if (!subject || typeof subject !== 'string') {
    return '';
  }

  // Remove control characters and limit length
  return sanitizeTextContent(subject).substring(0, 255);
}

/**
 * Comprehensive email sanitization for storage
 */
export function sanitizeEmailForStorage(emailData: any): any {
  const sanitized: any = {
    ...emailData,
    subject: sanitizeSubject(emailData.subject || ''),
    body: sanitizeEmailContent(emailData.body || ''),
    fromAddress: sanitizeEmailAddress(emailData.fromAddress || ''),
    fromName: sanitizeTextContent(emailData.fromName || ''),
    toAddress: emailData.toAddress ? sanitizeTextContent(emailData.toAddress) : '',
    ccAddress: emailData.ccAddress ? sanitizeTextContent(emailData.ccAddress) : '',
    bccAddress: emailData.bccAddress ? sanitizeTextContent(emailData.bccAddress) : ''
  };

  // Only include attachments if they're explicitly provided (not undefined)
  // This allows storage layer to preserve existing attachments when not updating them
  if (emailData.attachments !== undefined) {
    sanitized.attachments = emailData.attachments || null;
  }
  
  if (emailData.hasAttachments !== undefined) {
    sanitized.hasAttachments = emailData.hasAttachments || false;
  }

  return sanitized;
}

/**
 * Check if content contains potentially dangerous elements
 */
export function detectSuspiciousContent(content: string): { suspicious: boolean; reasons: string[] } {
  const reasons: string[] = [];
  
  if (content.includes('<script')) reasons.push('Script tags detected');
  if (content.includes('javascript:')) reasons.push('JavaScript protocol detected');
  if (content.includes('vbscript:')) reasons.push('VBScript protocol detected');
  if (/on\w+\s*=/i.test(content)) reasons.push('Event handlers detected');
  if (content.includes('expression(')) reasons.push('CSS expressions detected');
  if (content.includes('<iframe')) reasons.push('Iframe tags detected');
  if (content.includes('<object')) reasons.push('Object tags detected');
  if (content.includes('<embed')) reasons.push('Embed tags detected');
  
  return {
    suspicious: reasons.length > 0,
    reasons
  };
}