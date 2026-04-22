import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import type { Result } from '@/lib/result';
import { ok, err } from '@/lib/result';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { getSecret } from '@/lib/secrets';

export interface AuthenticatedUser {
  id: string;
  phone: string;
  role: 'student' | 'admin';
  fullName: string;
}

async function getJwtSecret(): Promise<Uint8Array> {
  // Try env var first, then DB
  const envSecret = process.env.JWT_SECRET;
  if (envSecret) return new TextEncoder().encode(envSecret);
  
  const dbSecret = await getSecret('jwt_secret');
  if (dbSecret) return new TextEncoder().encode(dbSecret);
  
  throw new Error('JWT_SECRET not configured');
}

export async function getAuthUser(
  request: NextRequest
): Promise<Result<AuthenticatedUser>> {
  const token =
    request.cookies.get('auth-token')?.value ??
    request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return err('يرجى تسجيل الدخول أولًا');
  }

  try {
    const secret = await getJwtSecret();
    const { payload } = await jwtVerify(token, secret);

    if (!payload.sub) {
      return err('رمز المصادقة غير صالح');
    }

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
