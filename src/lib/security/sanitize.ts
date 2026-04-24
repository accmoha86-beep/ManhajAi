/**
 * 🧹 Input Sanitization — Prevent XSS, SQL Injection, and data abuse
 */

/**
 * Strip HTML tags from a string
 */
export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
}

/**
 * Escape HTML special characters (for safe display)
 */
export function escapeHtml(input: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return input.replace(/[&<>"'/]/g, (char) => map[char] || char);
}

/**
 * Sanitize user text input — remove dangerous characters but keep Arabic text
 */
export function sanitizeText(input: string, maxLength: number = 500): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters (except newline, tab)
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Strip HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove potential script injections
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:\s*text\/html/gi, '')
    // Trim and limit length
    .trim()
    .substring(0, maxLength);
}

/**
 * Sanitize phone number — only digits allowed
 */
export function sanitizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  return phone.replace(/[^0-9+]/g, '').substring(0, 15);
}

/**
 * Sanitize name — allow Arabic, English, spaces, basic punctuation
 */
export function sanitizeName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  return name
    // Allow Arabic characters, English letters, numbers, spaces, dots, dashes
    .replace(/[^\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z0-9\s.\-']/g, '')
    .trim()
    .substring(0, 100);
}

/**
 * Sanitize password — no restrictions on characters but limit length
 */
export function sanitizePassword(password: string): string {
  if (!password || typeof password !== 'string') return '';
  // Remove null bytes only, allow everything else
  return password.replace(/\0/g, '').substring(0, 128);
}

/**
 * Sanitize search/filter input
 */
export function sanitizeSearch(query: string): string {
  if (!query || typeof query !== 'string') return '';
  return query
    .replace(/[<>]/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .trim()
    .substring(0, 200);
}

/**
 * Sanitize UUID — must be valid UUID format
 */
export function sanitizeUUID(id: string): string | null {
  if (!id || typeof id !== 'string') return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id.trim()) ? id.trim().toLowerCase() : null;
}

/**
 * Sanitize chat message — allow Arabic text but limit length and remove scripts
 */
export function sanitizeChatMessage(message: string): string {
  if (!message || typeof message !== 'string') return '';
  return message
    .replace(/\0/g, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .trim()
    .substring(0, 2000);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate Egyptian phone number
 */
export function isValidEgyptianPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  // Egyptian phone: 01xxxxxxxxx (11 digits starting with 01)
  return /^01[0-9]{9}$/.test(cleanPhone);
}

/**
 * Validate and sanitize an object's string fields
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  rules: Record<string, { maxLength?: number; type?: 'text' | 'phone' | 'name' | 'uuid' | 'email' }>
): T {
  const result = { ...obj };
  
  for (const [key, rule] of Object.entries(rules)) {
    const value = result[key];
    if (typeof value !== 'string') continue;
    
    switch (rule.type) {
      case 'phone':
        (result as Record<string, unknown>)[key] = sanitizePhone(value);
        break;
      case 'name':
        (result as Record<string, unknown>)[key] = sanitizeName(value);
        break;
      case 'uuid':
        (result as Record<string, unknown>)[key] = sanitizeUUID(value) || '';
        break;
      default:
        (result as Record<string, unknown>)[key] = sanitizeText(value, rule.maxLength || 500);
    }
  }
  
  return result;
}
