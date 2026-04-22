// app/api/auth/login/route.ts — Student login
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { validatePhone } from '@/domain/auth';

const LoginSchema = z.object({
  phone: z.string(),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const JWT_EXPIRY = '30d';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'بيانات غير صالحة' },
        { status: 400 }
      );
    }

    const { phone, password } = parsed.data;

    // Validate phone format
    const phoneResult = validatePhone(phone);
    if (!phoneResult.ok) {
      return NextResponse.json(
        { error: phoneResult.error },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Find user by phone
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(
        'id, full_name, phone, password_hash, role, is_verified, trial_ends_at, referral_code, avatar_url'
      )
      .eq('phone', phoneResult.data)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'رقم الهاتف أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    // Check if user is verified
    if (!user.is_verified) {
      return NextResponse.json(
        {
          error: 'الحساب غير مُفعّل. يرجى التحقق من رقم الهاتف أولًا',
          needsVerification: true,
        },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'رقم الهاتف أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    // Update last login timestamp
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    // Generate JWT token
    const token = await new SignJWT({
      sub: user.id,
      phone: user.phone,
      role: user.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRY)
      .sign(JWT_SECRET);

    // Set token in HTTP-only cookie
    const response = NextResponse.json({
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        phone: user.phone,
        role: user.role,
        trialEndsAt: user.trial_ends_at,
        referralCode: user.referral_code,
        avatarUrl: user.avatar_url,
      },
      message: 'تم تسجيل الدخول بنجاح',
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[Login] Unexpected error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى' },
      { status: 500 }
    );
  }
}
