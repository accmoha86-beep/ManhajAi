import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getSecret } from '@/lib/secrets';
import {
  checkLoginRateLimit,
  getClientIP,
  sanitizePhone,
  sanitizePassword,
  logAudit,
  getRequestInfo,
} from '@/lib/security';

export async function POST(request: NextRequest) {
  const { ip, userAgent } = getRequestInfo(request);
  
  try {
    const body = await request.json();
    const phone = sanitizePhone(body.phone || '');
    const password = sanitizePassword(body.password || '');

    // ═══ Validation ═══
    if (!phone || !password) {
      return NextResponse.json(
        { error: 'رقم الهاتف وكلمة المرور مطلوبين' },
        { status: 400 }
      );
    }

    // ═══ Rate Limiting ═══
    const rateLimit = checkLoginRateLimit(ip, phone);
    if (!rateLimit.allowed) {
      await logAudit({
        action: 'rate_limited',
        severity: 'warning',
        ip_address: ip,
        user_agent: userAgent,
        phone,
        details: { retryAfter: rateLimit.retryAfterSeconds },
      });

      return NextResponse.json(
        { 
          error: `محاولات كتير! جرب تاني بعد ${Math.ceil((rateLimit.retryAfterSeconds || 300) / 60)} دقيقة`,
          retryAfter: rateLimit.retryAfterSeconds 
        },
        { status: 429 }
      );
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // ═══ Check Account Lockout ═══
    const { data: isLocked } = await supabase.rpc('check_account_locked', { p_phone: cleanPhone });
    if (isLocked) {
      await logAudit({
        action: 'login_blocked',
        severity: 'warning',
        ip_address: ip,
        user_agent: userAgent,
        phone: cleanPhone,
        details: { reason: 'account_locked' },
      });

      return NextResponse.json(
        { error: 'الحساب مقفول مؤقتاً بسبب محاولات كتير. جرب بعد 30 دقيقة' },
        { status: 423 }
      );
    }

    // ═══ Get User ═══
    const { data: userData, error: userError } = await supabase
      .rpc('authenticate_user', { p_phone: cleanPhone });

    if (userError || !userData || userData.length === 0) {
      // Record failed attempt
      await supabase.rpc('record_login_attempt', {
        p_phone: cleanPhone,
        p_ip_address: ip,
        p_success: false,
      });

      await logAudit({
        action: 'login_failed',
        severity: 'warning',
        ip_address: ip,
        user_agent: userAgent,
        phone: cleanPhone,
        details: { reason: 'user_not_found' },
      });

      return NextResponse.json(
        { error: 'رقم الهاتف أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    const user = userData[0];

    // ═══ Check if banned ═══
    if (user.is_banned) {
      await logAudit({
        action: 'login_blocked',
        severity: 'warning',
        user_id: user.id,
        ip_address: ip,
        user_agent: userAgent,
        phone: cleanPhone,
        details: { reason: 'banned' },
      });

      return NextResponse.json(
        { error: 'تم حظر هذا الحساب. تواصل مع الدعم' },
        { status: 403 }
      );
    }

    // ═══ Verify Password ═══
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      // Record failed attempt
      const { data: lockResult } = await supabase.rpc('record_login_attempt', {
        p_phone: cleanPhone,
        p_ip_address: ip,
        p_success: false,
      });

      const lockInfo = lockResult as { is_locked: boolean; failed_count: number } | null;

      await logAudit({
        action: 'login_failed',
        severity: 'warning',
        user_id: user.id,
        ip_address: ip,
        user_agent: userAgent,
        phone: cleanPhone,
        details: { 
          reason: 'wrong_password',
          failed_count: lockInfo?.failed_count || 0,
          account_locked: lockInfo?.is_locked || false,
        },
      });

      // Warn user about remaining attempts
      const failedCount = lockInfo?.failed_count || 0;
      const remaining = 5 - failedCount;
      let errorMsg = 'رقم الهاتف أو كلمة المرور غير صحيحة';
      if (remaining <= 2 && remaining > 0) {
        errorMsg += ` — فاضلك ${remaining} محاولة قبل قفل الحساب`;
      } else if (lockInfo?.is_locked) {
        errorMsg = 'الحساب مقفول مؤقتاً. جرب بعد 30 دقيقة';
      }

      return NextResponse.json(
        { error: errorMsg },
        { status: 401 }
      );
    }

    // ═══ Record Successful Login ═══
    await supabase.rpc('record_login_attempt', {
      p_phone: cleanPhone,
      p_ip_address: ip,
      p_success: true,
    });

    // ═══ Get JWT Secret ═══
    const jwtSecret = await getSecret('jwt_secret');
    if (!jwtSecret) {
      console.error('JWT_SECRET not found in system_secrets');
      return NextResponse.json(
        { error: 'خطأ في إعدادات النظام' },
        { status: 500 }
      );
    }

    // ═══ Generate Token ═══
    const token = jwt.sign(
      {
        userId: user.id,
        phone: user.phone,
        role: user.role,
        name: user.full_name,
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // ═══ Update Last Login ═══
    try {
      await supabase.rpc('update_last_login', { p_user_id: user.id });
    } catch { /* ignore */ }

    // ═══ Audit Log: Success ═══
    await logAudit({
      action: user.role === 'admin' ? 'admin_login' : 'login_success',
      severity: 'info',
      user_id: user.id,
      ip_address: ip,
      user_agent: userAgent,
      phone: cleanPhone,
    });

    // ═══ Set Cookie + Return ═══
    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.full_name,
        phone: user.phone,
        role: user.role,
        governorate: user.governorate,
        is_verified: user.is_verified,
      },
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error instanceof Error ? error.message : 'unknown');
    
    await logAudit({
      action: 'login_failed',
      severity: 'critical',
      ip_address: ip,
      user_agent: userAgent,
      details: { error: error instanceof Error ? error.message : 'unknown' },
    });

    return NextResponse.json(
      { error: 'حدث خطأ. جرب تاني' },
      { status: 500 }
    );
  }
}
