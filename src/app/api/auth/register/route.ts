import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getSecret } from '@/lib/secrets';
import {
  checkRegisterRateLimit,
  getClientIP,
  sanitizeName,
  sanitizePhone,
  sanitizePassword,
  sanitizeText,
  isValidEgyptianPhone,
  logAudit,
  getRequestInfo,
} from '@/lib/security';

export async function POST(request: NextRequest) {
  const { ip, userAgent } = getRequestInfo(request);
  
  try {
    const body = await request.json();
    
    // ═══ Sanitize ALL inputs ═══
    const fullName = sanitizeName(body.fullName || body.full_name || body.name || '');
    const phone = sanitizePhone(body.phone || '');
    const password = sanitizePassword(body.password || '');
    const governorate = sanitizeText(body.governorate || '', 50);
    const gradeLevel = parseInt(body.gradeLevel) || 3;

    // ═══ Validation ═══
    if (!fullName || fullName.length < 2) {
      return NextResponse.json(
        { error: 'الاسم مطلوب (حرفين على الأقل)' },
        { status: 400 }
      );
    }

    if (!phone) {
      return NextResponse.json(
        { error: 'رقم الهاتف مطلوب' },
        { status: 400 }
      );
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!isValidEgyptianPhone(cleanPhone)) {
      return NextResponse.json(
        { error: 'رقم الهاتف لازم يكون رقم مصري صحيح (01xxxxxxxxx)' },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'كلمة المرور لازم تكون 6 حروف على الأقل' },
        { status: 400 }
      );
    }

    // ═══ Rate Limiting ═══
    const rateLimit = checkRegisterRateLimit(ip);
    if (!rateLimit.allowed) {
      await logAudit({
        action: 'rate_limited',
        severity: 'warning',
        ip_address: ip,
        user_agent: userAgent,
        phone: cleanPhone,
        details: { endpoint: 'register', retryAfter: rateLimit.retryAfterSeconds },
      });

      return NextResponse.json(
        { error: 'محاولات تسجيل كتير. جرب بعد ساعة' },
        { status: 429 }
      );
    }

    // ═══ Hash Password (12 rounds for extra security) ═══
    const passwordHash = await bcrypt.hash(password, 12);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // ═══ Register via RPC ═══
    const { data, error } = await supabase.rpc('register_student', {
      p_full_name: fullName,
      p_phone: cleanPhone,
      p_password_hash: passwordHash,
      p_governorate: governorate || 'القاهرة',
    });

    if (error) {
      if (error.message?.includes('already') || error.message?.includes('مسجل')) {
        return NextResponse.json(
          { error: 'رقم الهاتف مسجل بالفعل' },
          { status: 409 }
        );
      }
      console.error('Register error:', error.message);
      return NextResponse.json(
        { error: 'حدث خطأ في التسجيل' },
        { status: 500 }
      );
    }

    const userId = data?.user_id || data?.id || data?.[0]?.id || data;

    // ═══ Get JWT Secret ═══
    const jwtSecret = await getSecret('jwt_secret');
    if (!jwtSecret) {
      return NextResponse.json(
        { error: 'خطأ في إعدادات النظام' },
        { status: 500 }
      );
    }

    // ═══ Generate Token ═══
    const token = jwt.sign(
      {
        userId,
        phone: cleanPhone,
        role: 'student',
        name: fullName,
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // ═══ Create Trial Subscription ═══
    try {
      await supabase.rpc('create_trial_subscription', { p_user_id: userId });
    } catch { /* ignore if trial creation fails */ }

    // ═══ Audit Log ═══
    await logAudit({
      action: 'register',
      severity: 'info',
      user_id: userId,
      ip_address: ip,
      user_agent: userAgent,
      phone: cleanPhone,
      details: { governorate, gradeLevel },
    });

    // ═══ Set Cookie + Return ═══
    const response = NextResponse.json({
      success: true,
      token,
      userId,
      user: {
        id: userId,
        name: fullName,
        phone: cleanPhone,
        role: 'student',
        governorate,
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
    console.error('Register error:', error instanceof Error ? error.message : 'unknown');
    
    await logAudit({
      action: 'register',
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
