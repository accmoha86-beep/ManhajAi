/**
 * 🛡️ Security Module — Central export
 * Import everything from '@/lib/security'
 */

export {
  checkRateLimit,
  getClientIP,
  checkLoginRateLimit,
  checkRegisterRateLimit,
  checkOTPRateLimit,
  checkChatRateLimit,
  checkAPIRateLimit,
  checkAdminRateLimit,
  checkContentGenRateLimit,
  checkDownloadRateLimit,
} from './rate-limiter';

export {
  sanitizeText,
  sanitizePhone,
  sanitizeName,
  sanitizePassword,
  sanitizeSearch,
  sanitizeUUID,
  sanitizeChatMessage,
  sanitizeObject,
  escapeHtml,
  stripHtml,
  isValidEmail,
  isValidEgyptianPhone,
} from './sanitize';

export {
  logAudit,
  getRequestInfo,
  getActionSeverity,
  type AuditAction,
  type AuditSeverity,
} from './audit-log';
