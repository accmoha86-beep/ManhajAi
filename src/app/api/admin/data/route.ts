import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as jose from 'jose';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

async function getAuthUser(request: NextRequest): Promise<{ id: string; role: string } | null> {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return null;
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    const key = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, key);
    if (!payload.userId || !payload.role) return null;
    return { id: payload.userId as string, role: payload.role as string };
  } catch {
    return null;
  }
}

function ok(data: Record<string, unknown>) {
  return NextResponse.json({ success: true, data });
}
function err(msg: string, status = 500) {
  return NextResponse.json({ success: false, error: msg }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return err('Not authenticated', 401);
    if (user.role !== 'admin') return err('Not authorized', 403);

    const body = await request.json();
    const { action, ...params } = body;
    const sb = getSupabase();
    const aid = user.id;

    switch (action) {
      // ===== OVERVIEW =====
      case 'get_stats':
      case 'overview': {
        const { data, error } = await sb.rpc('admin_overview', { p_admin_id: aid });
        if (error) return err(error.message);
        if (data?.error) return err(data.error, 403);
        return ok(data);
      }

      // ===== STUDENTS =====
      case 'get_students': {
        const { data, error } = await sb.rpc('admin_list_students_v2', {
          p_admin_id: aid,
          p_search: params.search || null,
          p_page: params.page || 1,
          p_limit: params.limit || 50
        });
        if (error) return err(error.message);
        if (data?.error) return err(data.error, 403);
        return ok(data);
      }

      case 'update_student': {
        const { data, error } = await sb.rpc('admin_update_student', {
          p_admin_id: aid,
          p_student_id: params.student_id || params.id,
          p_updates: JSON.stringify(params.updates || { is_banned: params.is_banned })
        });
        if (error) return err(error.message);
        if (data?.error) return err(data.error, 403);
        return ok({ success: true });
      }

      case 'toggle_student_ban': {
        const { data, error } = await sb.rpc('admin_toggle_student_ban', {
          p_admin_id: aid,
          p_student_id: params.student_id
        });
        if (error) return err(error.message);
        if (data?.error) return err(data.error, 403);
        return ok(data);
      }

      // ===== SUBJECTS =====
      case 'get_subjects': {
        const { data, error } = await sb.rpc('admin_list_subjects', { p_admin_id: aid });
        if (error) return err(error.message);
        if (data?.error) return err(data.error, 403);
        return ok({ subjects: data });
      }

      case 'create_subject': {
        const { data, error } = await sb.rpc('admin_create_subject', {
          p_admin_id: aid,
          p_name_ar: params.name_ar,
          p_name_en: params.name_en || null,
          p_icon: params.icon || '📘',
          p_color: params.color || '#3B82F6',
          p_grade_level: params.grade_level || 3,
          p_is_published: params.is_published || false
        });
        if (error) return err(error.message);
        if (data?.error) return err(data.error, 403);
        return ok(data);
      }

      case 'update_subject': {
        const { data, error } = await sb.rpc('admin_update_subject', {
          p_admin_id: aid,
          p_subject_id: params.id || params.subject_id,
          p_updates: JSON.stringify({
            name_ar: params.name_ar,
            name_en: params.name_en,
            icon: params.icon,
            color: params.color,
            is_published: params.is_published,
            grade_level: params.grade_level
          })
        });
        if (error) return err(error.message);
        if (data?.error) return err(data.error, 403);
        return ok(data);
      }

      case 'delete_subject': {
        const { data, error } = await sb.rpc('admin_delete_subject', {
          p_admin_id: aid,
          p_subject_id: params.id || params.subject_id
        });
        if (error) return err(error.message);
        if (data?.error) return err(data.error, 403);
        return ok(data);
      }

      case 'toggle_subject': {
        const { data, error } = await sb.rpc('admin_toggle_subject_publish', {
          p_admin_id: aid,
          p_subject_id: params.subject_id
        });
        if (error) return err(error.message);
        if (data?.error) return err(data.error, 403);
        return ok(data);
      }

      // ===== LESSONS =====
      case 'get_lessons':
      case 'lessons': {
        const { data, error } = await sb.rpc('admin_list_lessons', {
          p_admin_id: aid,
          p_subject_id: params.subject_id || null
        });
        if (error) return err(error.message);
        if (data?.error) return err(data.error, 403);
        return ok({ lessons: data });
      }

      // ===== SUBSCRIPTIONS =====
      case 'get_subscriptions':
      case 'subscriptions': {
        const { data, error } = await sb.rpc('admin_list_subscriptions', { p_admin_id: aid });
        if (error) return err(error.message);
        if (data?.error) return err(data.error, 403);
        const arr = Array.isArray(data) ? data : [];
        return ok({ subscriptions: arr, total: arr.length });
      }

      // ===== PAYMENTS =====
      case 'get_payments':
      case 'payments': {
        const { data, error } = await sb.rpc('admin_list_payments', { p_admin_id: aid });
        if (error) return err(error.message);
        if (data?.error) return err(data.error, 403);
        const arr = Array.isArray(data) ? data : [];
        return ok({ payments: arr, total: arr.length });
      }

      // ===== SETTINGS =====
      case 'get_settings':
      case 'settings': {
        const { data, error } = await sb.rpc('admin_list_settings', { p_admin_id: aid });
        if (error) return err(error.message);
        if (data?.error) return err(data.error, 403);
        return ok({ settings: Array.isArray(data) ? data : [] });
      }

      case 'update_setting': {
        const { data, error } = await sb.rpc('admin_update_setting', {
          p_admin_id: aid,
          p_key: params.key,
          p_value: String(params.value)
        });
        if (error) return err(error.message);
        if (data?.error) return err(data.error, 403);
        return ok({ success: true });
      }

      // ===== THEMES =====
      case 'get_themes':
      case 'themes': {
        const { data, error } = await sb.rpc('admin_list_themes', { p_admin_id: aid });
        if (error) return err(error.message);
        if (data?.error) return err(data.error, 403);
        return ok({ themes: Array.isArray(data) ? data : [] });
      }

      case 'update_theme': {
        if (params.slug) {
          const { data, error } = await sb.rpc('admin_update_theme_by_slug', {
            p_admin_id: aid,
            p_slug: params.slug,
            p_updates: JSON.stringify(params.updates || { is_active: params.is_active })
          });
          if (error) return err(error.message);
          if (data?.error) return err(data.error, 403);
          return ok(data);
        } else {
          const { data, error } = await sb.rpc('admin_update_theme', {
            p_admin_id: aid,
            p_theme_id: params.theme_id || params.id,
            p_is_active: params.is_active ?? null,
            p_schedule_start: params.schedule_start || null,
            p_schedule_end: params.schedule_end || null
          });
          if (error) return err(error.message);
          if (data?.error) return err(data.error, 403);
          return ok(data);
        }
      }

      // ===== SECRETS =====
      case 'get_secrets':
      case 'secrets': {
        const { data, error } = await sb.rpc('admin_list_secrets', { p_admin_id: aid });
        if (error) return err(error.message);
        if (data?.error) return err(data.error, 403);
        return ok({ secrets: Array.isArray(data) ? data : [] });
      }

      case 'update_secret': {
        const { data, error } = await sb.rpc('admin_update_secret', {
          p_admin_id: aid,
          p_key: params.key,
          p_value: params.value,
          p_description: params.description || null
        });
        if (error) return err(error.message);
        if (data?.error) return err(data.error, 403);
        return ok({ success: true });
      }

      // ===== COUPONS =====
      case 'get_coupons': {
        const { data, error } = await sb
          .from('coupons')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) return err(error.message);
        return ok({ coupons: data || [] });
      }

      case 'create_coupon': {
        const { data, error } = await sb
          .from('coupons')
          .insert({
            code: (params.code || '').toUpperCase(),
            discount_percent: params.discount_percent || 10,
            max_uses: params.max_uses || null,
            used_count: 0,
            is_active: true,
            expires_at: params.expires_at || null,
            description_ar: params.description_ar || null,
          })
          .select()
          .single();
        if (error) return err(error.message);
        return ok({ coupon: data });
      }

      case 'update_coupon': {
        const updates: any = {};
        if (params.is_active !== undefined) updates.is_active = params.is_active;
        if (params.discount_percent !== undefined) updates.discount_percent = params.discount_percent;
        if (params.max_uses !== undefined) updates.max_uses = params.max_uses;
        if (params.expires_at !== undefined) updates.expires_at = params.expires_at;
        if (params.description_ar !== undefined) updates.description_ar = params.description_ar;
        if (params.code !== undefined) updates.code = params.code.toUpperCase();

        const { data, error } = await sb
          .from('coupons')
          .update(updates)
          .eq('id', params.id || params.coupon_id)
          .select()
          .single();
        if (error) return err(error.message);
        return ok({ coupon: data });
      }

      case 'delete_coupon': {
        const { error } = await sb
          .from('coupons')
          .delete()
          .eq('id', params.id || params.coupon_id);
        if (error) return err(error.message);
        return ok({ success: true });
      }

      // ===== GRADES =====
      case 'get_grades': {
        const { data, error } = await sb
          .from('grade_levels')
          .select('*')
          .order('level', { ascending: true });
        if (error) return err(error.message);
        return ok({ grades: data || [] });
      }

      case 'update_grade': {
        const updates: any = {};
        if (params.is_published !== undefined) updates.is_published = params.is_published;
        if (params.has_terms !== undefined) updates.has_terms = params.has_terms;
        if (params.term1_published !== undefined) updates.term1_published = params.term1_published;
        if (params.term2_published !== undefined) updates.term2_published = params.term2_published;

        const { data, error } = await sb
          .from('grade_levels')
          .update(updates)
          .eq('id', params.id || params.grade_id)
          .select()
          .single();
        if (error) return err(error.message);
        return ok({ grade: data });
      }

      // ===== CONTENT GENERATION =====
      case 'generate_content': {
        // Trigger content generation
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const contentRes = await fetch(`${baseUrl}/api/content/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('Cookie') || '',
            },
            body: JSON.stringify({
              subject_id: params.subject_id,
              lesson_id: params.lesson_id,
            }),
          });
          const contentData = await contentRes.json();
          return ok(contentData);
        } catch (e: any) {
          return err(e.message || 'فشل في توليد المحتوى');
        }
      }

      // ===== DOWNLOAD REPORT =====
      case 'download_report': {
        return ok({ redirect_url: '/api/admin/reports' });
      }

      default:
        return err(`Unknown action: ${action}`, 400);
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return err('Internal server error');
  }
}
