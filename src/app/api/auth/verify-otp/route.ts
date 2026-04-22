// app/api/auth/verify-otp/route.ts — Verify OTP code
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SignJWT } from 'jose';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { validatePhone } from '@/domain/auth';
import { isOTPExpired } from '@/infrastructure/whatsapp/client';
import { getSecret } from '@/lib/secrets';

const VerifyOTPSchema = z.object({
  phone: z.string(),
  code: z.string().length(4, 'رمز التحقق يجب أن يكون 4 أرقام'),
});


const JWT_EXPIRY = '30d';

async function getJwtSecretKey(): Promise<Uint8Array> {
  const secret = process.env.JWT_SECRET || await getSecret('jwt_secret') || 'fallback-secret';
  return new TextEncoder().encode(secret);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = VerifyOTPSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'بيانات غير صالحة' },
        { status: 400 }
      );
    }

    const { phone, code } = parsed.data;

    // Validate phone format
    const phoneResult = validatePhone(phone);
    if (!phoneResult.ok) {
      return NextResponse.json(
        { error: phoneResult.error },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Find the latest unused OTP for this phone
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('phone', phoneResult.data)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpRecord) {
      return NextResponse.json(
        { error: 'لم يتم العثور على رمز التحقق. يرجى طلب رمز جديد' },
        { status: 400 }
      );
    }

    // Check if OTP has expired (10 minutes TTL)
    if (isOTPExpired(new Date(otpRecord.created_at), 10)) {
      return NextResponse.json(
        { error: 'رمز التحقق منتهي الصلاحية. يرجى طلب رمز جديد' },
        { status: 400 }
      );
    }

    // Verify code
    if (otpRecord.code !== code) {
      return NextResponse.json(
        { error: 'رمز التحقق غير صحيح' },
        { status: 400 }
      );
    }

    // Mark OTP as used
    await supabase
      .from('otp_codes')
      .update({ used: true })
      .eq('id', otpRecord.id);

    // Mark user as verified
    const { data: user, error: userError } = await supabase
      .from('users')
      .update({ is_verified: true, verified_at: new Date().toISOString() })
      .eq('phone', phoneResult.data)
      .select('id, full_name, phone, role, trial_ends_at, referral_code')
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'فشل في تأكيد الحساب' },
        { status: 500 }
      );
    }

    // Generate JWT token
    const token = await new SignJWT({
      sub: user.id,
      phone: user.phone,
      role: user.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRY)
      .sign(await getJwtSecretKey());

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
      },
      message: 'تم التحقق بنجاح',
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[VerifyOTP] Unexpected error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى' },
      { status: 500 }
    );
  }
}
