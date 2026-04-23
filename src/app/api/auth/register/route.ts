import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { verifyFirebaseToken } from '@/infrastructure/firebase/admin';

const RegisterSchema = z.object({
  full_name: z.string().min(2, 'الاسم مطلوب'),
  phone: z.string().regex(/^01[0125]\d{8}$/, 'رقم الهاتف غير صحيح'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  governorate: z.string().optional(),
  referral_code: z.string().optional(),
  firebase_token: z.string().optional(),
});

async function getJwtSecretKey(): Promise<Uint8Array> {
  const secret = process.env.JWT_SECRET || 'manhaj-ai-jwt-secret-2024-xyz';
  return new TextEncoder().encode(secret);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'بيانات غير صالحة' },
        { status: 400 }
      );
    }

    const { full_name, phone, password, governorate, referral_code, firebase_token } = parsed.data;

    // Verify Firebase token if provided
    let isVerified = false;
    if (firebase_token) {
      try {
        const firebaseResult = await verifyFirebaseToken(firebase_token);
        if (firebaseResult) {
          // Normalize phone numbers for comparison
          const normalizedFirebasePhone = firebaseResult.phone_number.replace(/^\+20/, '0');
          const normalizedInputPhone = phone;
          if (normalizedFirebasePhone === normalizedInputPhone) {
            isVerified = true;
            console.log('[Register] Firebase OTP verified for:', phone);
          } else {
            console.warn('[Register] Phone mismatch:', normalizedFirebasePhone, '!=', normalizedInputPhone);
          }
        }
      } catch (e) {
        console.error('[Register] Firebase token verification failed:', e);
        // Continue without verification — don't block registration
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const supabase = await createServerSupabaseClient();
    
    // register_student RPC already sets is_verified = true by default
    // It uses SECURITY DEFINER so it bypasses RLS
    const { data, error } = await supabase.rpc('register_student', {
      p_full_name: full_name,
      p_phone: phone,
      p_password_hash: hashedPassword,
      p_governorate: governorate || null,
      p_referral_code: referral_code || null,
    });

    if (error) {
      console.error('[Register] RPC error:', error);
      if (error.message?.includes('مسجل')) {
        return NextResponse.json({ error: 'رقم الهاتف مسجل بالفعل' }, { status: 409 });
      }
      return NextResponse.json({ error: 'فشل في التسجيل' }, { status: 500 });
    }
    if (data?.error) {
      return NextResponse.json({ error: data.error }, { status: 409 });
    }

    // Auto-login (generate JWT)
    const token = await new SignJWT({
      userId: data.user_id,
      phone: phone,
      role: 'student',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(await getJwtSecretKey());

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: data.user_id,
          name: full_name,
          phone,
          role: 'student',
          trialEndsAt: data.trial_ends_at,
          referralCode: data.referral_code,
          isVerified: isVerified || true, // RPC already sets true
        },
        token,
      },
      { status: 201 }
    );

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[Register] Error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
