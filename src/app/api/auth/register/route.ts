// app/api/auth/register/route.ts — Register a new student
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { validatePhone, validatePassword, generateReferralCode, calculateTrialEnd } from '@/domain/auth';
import { generateOTP, sendOTP } from '@/infrastructure/whatsapp/client';

const RegisterSchema = z.object({
  fullName: z
    .string()
    .min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل')
    .max(100, 'الاسم طويل جدًا'),
  phone: z.string(),
  password: z.string(),
  referralCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input schema
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'بيانات غير صالحة' },
        { status: 400 }
      );
    }

    const { fullName, phone, password, referralCode } = parsed.data;

    // Validate phone
    const phoneResult = validatePhone(phone);
    if (!phoneResult.ok) {
      return NextResponse.json(
        { error: phoneResult.error },
        { status: 400 }
      );
    }

    // Validate password
    const passwordResult = validatePassword(password);
    if (!passwordResult.ok) {
      return NextResponse.json(
        { error: passwordResult.error },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Check if phone already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phoneResult.data)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'رقم الهاتف مسجل بالفعل' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Get trial settings from admin settings
    const { data: trialSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'trial_days')
      .single();

    const trialDays = trialSetting ? parseInt(trialSetting.value, 10) : 7;
    const trialEndsAt = calculateTrialEnd(trialDays);

    // Generate referral code
    const userReferralCode = generateReferralCode(fullName);

    // Create user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        full_name: fullName,
        phone: phoneResult.data,
        password_hash: hashedPassword,
        role: 'student',
        is_verified: false,
        referral_code: userReferralCode,
        referred_by: referralCode || null,
        trial_ends_at: trialEndsAt.toISOString(),
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (createError || !newUser) {
      console.error('[Register] Create user failed:', createError);
      return NextResponse.json(
        { error: 'فشل في إنشاء الحساب. يرجى المحاولة مرة أخرى' },
        { status: 500 }
      );
    }

    // Generate and send OTP
    const otp = generateOTP();
    const otpExpiresAt = new Date();
    otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + 10);

    await supabase.from('otp_codes').insert({
      user_id: newUser.id,
      phone: phoneResult.data,
      code: otp,
      expires_at: otpExpiresAt.toISOString(),
      used: false,
    });

    // Send OTP via WhatsApp
    const sendResult = await sendOTP(phoneResult.data, otp);
    if (!sendResult.ok) {
      console.error('[Register] OTP send failed:', sendResult.error);
      // Don't fail registration — user can request a new OTP
    }

    return NextResponse.json(
      {
        userId: newUser.id,
        message: 'تم إنشاء الحساب بنجاح. تم إرسال رمز التحقق إلى الواتساب',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Register] Unexpected error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى' },
      { status: 500 }
    );
  }
}
