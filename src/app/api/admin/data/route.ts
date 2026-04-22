import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as jose from 'jose';

// Create anon Supabase client (for RPC calls with SECURITY DEFINER)
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Verify JWT and extract user info
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

// Helper to handle RPC responses
function rpcResponse(data: any, error: any) {
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  if (data?.error) return NextResponse.json({ success: false, error: data.error }, { status: 403 });
  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });

    const body = await request.json();
    const { action, ...params } = body;
    const supabase = getSupabase();
    const aid = user.id; // admin ID

    switch (action) {
      // ===== OVERVIEW =====
      case 'get_stats':
      case 'overview': {
        const { data, error } = await supabase.rpc('admin_overview', { p_admin_id: aid });
        return rpcResponse(data, error);
      }

      // ===== STUDENTS =====
      case 'get_students': {
        const { data, error } = await supabase.rpc('admin_list_students_v2', {
          p_admin_id: aid,
          p_search: params.search || null,
          p_page: params.page || 1,
          p_limit: params.limit || 50
        });
        return rpcResponse(data, error);
      }

      case 'update_student': {
        const { data, error } = await supabase.rpc('admin_update_student', {
          p_admin_id: aid,
          p_student_id: params.student_id || params.id,
          p_updates: JSON.stringify(params.updates || { is_banned: params.is_banned })
        });
        return rpcResponse(data, error);
      }

      case 'toggle_student_ban': {
        const { data, error } = await supabase.rpc('admin_toggle_student_ban', {
          p_admin_id: aid,
          p_student_id: params.student_id
        });
        return rpcResponse(data, error);
      }

      // ===== SUBJECTS =====
      case 'get_subjects': {
        const { data, error } = await supabase.rpc('admin_list_subjects', { p_admin_id: aid });
        return rpcResponse(data, error);
      }

      case 'create_subject': {
        const { data, error } = await supabase.rpc('admin_create_subject', {
          p_admin_id: aid,
          p_name_ar: params.name_ar,
          p_name_en: params.name_en || null,
          p_icon: params.icon || '📘',
          p_color: params.color || '#3B82F6',
          p_grade_level: params.grade_level || 'grade_3',
          p_is_published: params.is_published || false
        });
        return rpcResponse(data, error);
      }

      case 'update_subject': {
        const { data, error } = await supabase.rpc('admin_update_subject', {
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
        return rpcResponse(data, error);
      }

      case 'delete_subject': {
        const { data, error } = await supabase.rpc('admin_delete_subject', {
          p_admin_id: aid,
          p_subject_id: params.id || params.subject_id
        });
        return rpcResponse(data, error);
      }

      case 'toggle_subject': {
        const { data, error } = await supabase.rpc('admin_toggle_subject_publish', {
          p_admin_id: aid,
          p_subject_id: params.subject_id
        });
        return rpcResponse(data, error);
      }

      // ===== LESSONS =====
      case 'get_lessons':
      case 'lessons': {
        const { data, error } = await supabase.rpc('admin_list_lessons', {
          p_admin_id: aid,
          p_subject_id: params.subject_id || null
        });
        return rpcResponse(data, error);
      }

      // ===== SUBSCRIPTIONS =====
      case 'get_subscriptions':
      case 'subscriptions': {
        const { data, error } = await supabase.rpc('admin_list_subscriptions', { p_admin_id: aid });
        return rpcResponse(data, error);
      }

      // ===== PAYMENTS =====
      case 'get_payments':
      case 'payments': {
        const { data, error } = await supabase.rpc('admin_list_payments', { p_admin_id: aid });
        return rpcResponse(data, error);
      }

      // ===== SETTINGS =====
      case 'get_settings':
      case 'settings': {
        const { data, error } = await supabase.rpc('admin_list_settings', { p_admin_id: aid });
        return rpcResponse(data, error);
      }

      case 'update_setting': {
        const { data, error } = await supabase.rpc('admin_update_setting', {
          p_admin_id: aid,
          p_key: params.key,
          p_value: String(params.value)
        });
        return rpcResponse(data, error);
      }

      // ===== THEMES =====
      case 'get_themes':
      case 'themes': {
        const { data, error } = await supabase.rpc('admin_list_themes', { p_admin_id: aid });
        return rpcResponse(data, error);
      }

      case 'update_theme': {
        // Support both slug-based and id-based updates
        if (params.slug) {
          const { data, error } = await supabase.rpc('admin_update_theme_by_slug', {
            p_admin_id: aid,
            p_slug: params.slug,
            p_updates: JSON.stringify(params.updates || { is_active: params.is_active })
          });
          return rpcResponse(data, error);
        } else {
          const { data, error } = await supabase.rpc('admin_update_theme', {
            p_admin_id: aid,
            p_theme_id: params.theme_id || params.id,
            p_is_active: params.is_active ?? null,
            p_schedule_start: params.schedule_start || null,
            p_schedule_end: params.schedule_end || null
          });
          return rpcResponse(data, error);
        }
      }

      // ===== SECRETS =====
      case 'get_secrets':
      case 'secrets': {
        const { data, error } = await supabase.rpc('admin_list_secrets', { p_admin_id: aid });
        return rpcResponse(data, error);
      }

      case 'update_secret': {
        const { data, error } = await supabase.rpc('admin_update_secret', {
          p_admin_id: aid,
          p_key: params.key,
          p_value: params.value,
          p_description: params.description || null
        });
        return rpcResponse(data, error);
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
