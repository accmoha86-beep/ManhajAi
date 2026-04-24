/**
 * 📝 Audit Logger — Track all sensitive operations
 * Logs security events to the database for monitoring
 */

import { createClient } from '@supabase/supabase-js';

export type AuditAction =
  | 'login_success'
  | 'login_failed'
  | 'login_blocked'
  | 'register'
  | 'logout'
  | 'password_change'
  | 'otp_sent'
  | 'otp_verified'
  | 'otp_failed'
  | 'admin_login'
  | 'admin_action'
  | 'admin_delete_student'
  | 'admin_ban_student'
  | 'admin_update_setting'
  | 'admin_update_secret'
  | 'payment_initiated'
  | 'payment_completed'
  | 'payment_failed'
  | 'subscription_created'
  | 'subscription_expired'
  | 'content_generated'
  | 'content_uploaded'
  | 'download'
  | 'suspicious_activity'
  | 'rate_limited'
  | 'account_locked'
  | 'account_unlocked';

export type AuditSeverity = 'info' | 'warning' | 'critical';

interface AuditLogEntry {
  action: AuditAction;
  severity: AuditSeverity;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, unknown>;
  phone?: string;
}

/**
 * Log a security event to the audit_logs table
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    await supabase.rpc('insert_audit_log', {
      p_action: entry.action,
      p_severity: entry.severity,
      p_user_id: entry.user_id || null,
      p_ip_address: entry.ip_address || null,
      p_user_agent: entry.user_agent?.substring(0, 500) || null,
      p_details: entry.details ? JSON.stringify(entry.details) : null,
      p_phone: entry.phone || null,
    }).then(() => {}).catch((err) => {
      // Fallback: log to console if DB logging fails
      console.error('[AUDIT-FALLBACK]', JSON.stringify({
        ...entry,
        timestamp: new Date().toISOString(),
        error: err.message,
      }));
    });
  } catch (error) {
    // Never let audit logging break the application
    console.error('[AUDIT-ERROR]', entry.action, error instanceof Error ? error.message : 'unknown');
  }
}

/**
 * Get request info for audit logging
 */
export function getRequestInfo(request: Request): {
  ip: string;
  userAgent: string;
} {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 
    request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  return { ip, userAgent };
}

/**
 * Determine severity based on action type
 */
export function getActionSeverity(action: AuditAction): AuditSeverity {
  const criticalActions: AuditAction[] = [
    'admin_delete_student',
    'admin_update_secret',
    'payment_failed',
    'suspicious_activity',
    'account_locked',
  ];
  
  const warningActions: AuditAction[] = [
    'login_failed',
    'login_blocked',
    'otp_failed',
    'rate_limited',
    'admin_ban_student',
    'subscription_expired',
  ];
  
  if (criticalActions.includes(action)) return 'critical';
  if (warningActions.includes(action)) return 'warning';
  return 'info';
}
