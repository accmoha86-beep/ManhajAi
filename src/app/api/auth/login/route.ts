import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getSecret } from '@/lib/secrets';

export async function POST(request: NextRequest) {
  try {
    const { phone, password } = await request.json();

    if (!phone || !password) {
      return NextResponse.json(
        { error: 'رقم الهاتف وكلمة المرور مطلوبين' },
        { status: 400 }
      );
    }

    // Clean phone number
    const cleanPhone = phone.replace(/[^0-9]/g, '');

    // Use Supabase anon client with RPC function (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get user via RPC function (bypasses RLS)
    const { data: userData, error: userError } = await supabase
      .rpc('authenticate_user', { p_phone: cleanPhone });

    if (userError || !userData || userData.length === 0) {
      return NextResponse.json(
        { error: 'رقم الهاتف أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    const user = userData[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'رقم الهاتف أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    // Get JWT secret from DB
    const jwtSecret = await getSecret('jwt_secret');
    if (!jwtSecret) {
      console.error('JWT_SECRET not found in system_secrets');
      return NextResponse.json(
        { error: 'خطأ في إعدادات النظام' },
        { status: 500 }
      );
    }

    // Generate JWT token
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

    // Update last login
    try { await supabase.rpc('update_user_last_login', { p_user_id: user.id }); } catch { /* ignore */ }

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.full_name,
        phone: user.phone,
        role: user.role,
        isVerified: user.is_verified,
        trialEndsAt: user.trial_ends_at,
        referralCode: user.referral_code,
        avatarUrl: user.avatar_url,
      },
    });

    // Set httpOnly cookie for middleware auth
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في تسجيل الدخول' },
      { status: 500 }
    );
  }
}
