// app/api/admin/settings/route.ts — Admin settings management
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { getAuthUser } from '@/lib/auth';

/**
 * GET: Fetch all site settings.
 * Public settings are available to all authenticated users.
 * Admin-only settings require admin role.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }
    const user = authResult.data;

    const supabase = await createServerSupabaseClient();

    // Admin gets all settings; regular users get only public settings
    let query = supabase.from('settings').select('key, value, is_public, updated_at');

    if (user.role !== 'admin') {
      query = query.eq('is_public', true);
    }

    const { data: settings, error } = await query;

    if (error) {
      console.error('[AdminSettings] Fetch failed:', error);
      return NextResponse.json(
        { error: 'فشل في تحميل الإعدادات' },
        { status: 500 }
      );
    }

    // Transform to key-value map
    const settingsMap: Record<
      string,
      { value: string; isPublic: boolean; updatedAt: string | null }
    > = {};
    for (const s of settings ?? []) {
      settingsMap[s.key] = {
        value: s.value,
        isPublic: s.is_public,
        updatedAt: s.updated_at,
      };
    }

    return NextResponse.json({ settings: settingsMap });
  } catch (error) {
    console.error('[AdminSettings] Unexpected error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}

const UpdateSettingSchema = z.object({
  key: z
    .string()
    .min(1, 'مفتاح الإعداد مطلوب')
    .max(100, 'مفتاح الإعداد طويل جدًا'),
  value: z.string().max(10000, 'قيمة الإعداد طويلة جدًا'),
});

/**
 * PUT: Update a single setting. Admin only.
 */
export async function PUT(request: NextRequest) {
  try {
    // Authenticate and authorize admin
    const authResult = await getAuthUser(request);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }
    const user = authResult.data;

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'غير مصرح لك بهذا الإجراء' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input
    const parsed = UpdateSettingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'بيانات غير صالحة' },
        { status: 400 }
      );
    }

    const { key, value } = parsed.data;
    const supabase = await createServerSupabaseClient();

    // Upsert the setting
    const { error } = await supabase.from('settings').upsert(
      {
        key,
        value,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      },
      { onConflict: 'key' }
    );

    if (error) {
      console.error('[AdminSettings] Update failed:', error);
      return NextResponse.json(
        { error: 'فشل في تحديث الإعداد' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'تم تحديث الإعداد بنجاح',
      key,
      value,
    });
  } catch (error) {
    console.error('[AdminSettings] Unexpected error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}
