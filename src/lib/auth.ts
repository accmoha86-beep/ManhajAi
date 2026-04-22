// lib/auth.ts — Server-side auth helper for API routes
import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import type { Result } from '@/lib/result';
import { ok, err } from '@/lib/result';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export interface AuthenticatedUser {
  id: string;
  phone: string;
  role: 'student' | 'admin';
  fullName: string;
}

/**
 * Extract and verify the authenticated user from a request.
 * Checks cookie first, then Authorization header.
 */
export async function getAuthUser(
  request: NextRequest
): Promise<Result<AuthenticatedUser>> {
  // Get token from cookie or Authorization header
  const token =
    request.cookies.get('auth-token')?.value ??
    request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return err('يرجى تسجيل الدخول أولًا');
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (!payload.sub) {
      return err('رمز المصادقة غير صالح');
    }

    // Fetch fresh user data from DB
    const supabase = await createServerSupabaseClient();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, full_name, phone, role, is_verified')
      .eq('id', payload.sub)
      .single();

    if (error || !user) {
      return err('المستخدم غير موجود');
    }

    if (!user.is_verified) {
      return err('الحساب غير مُفعّل');
    }

    return ok({
      id: user.id,
      fullName: user.full_name,
      phone: user.phone,
      role: user.role as 'student' | 'admin',
    });
  } catch {
    return err('انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى');
  }
}
