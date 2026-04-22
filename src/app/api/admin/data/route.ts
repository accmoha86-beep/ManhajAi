import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as jose from 'jose';

// Create anon Supabase client (for RPC calls that use SECURITY DEFINER)
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
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

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
    }

    const body = await request.json();
    const { action, ...params } = body;
    const supabase = getSupabase();
    const adminId = user.id;

    switch (action) {
      // ===== READ OPERATIONS =====
      
      case 'overview': {
        const { data, error } = await supabase.rpc('admin_overview', { p_admin_id: adminId });
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        if (data?.error) return NextResponse.json({ success: false, error: data.error }, { status: 403 });
        return NextResponse.json({ success: true, data });
      }

      case 'students': {
        const { data, error } = await supabase.rpc('admin_list_students', { p_admin_id: adminId });
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        if (data?.error) return NextResponse.json({ success: false, error: data.error }, { status: 403 });
        return NextResponse.json({ success: true, data });
      }

      case 'subjects': {
        const { data, error } = await supabase.rpc('admin_list_subjects', { p_admin_id: adminId });
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        if (data?.error) return NextResponse.json({ success: false, error: data.error }, { status: 403 });
        return NextResponse.json({ success: true, data });
      }

      case 'lessons': {
        const { data, error } = await supabase.rpc('admin_list_lessons', { 
          p_admin_id: adminId,
          p_subject_id: params.subject_id || null 
        });
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        if (data?.error) return NextResponse.json({ success: false, error: data.error }, { status: 403 });
        return NextResponse.json({ success: true, data });
      }

      case 'settings': {
        const { data, error } = await supabase.rpc('admin_list_settings', { p_admin_id: adminId });
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        if (data?.error) return NextResponse.json({ success: false, error: data.error }, { status: 403 });
        return NextResponse.json({ success: true, data });
      }

      case 'themes': {
        const { data, error } = await supabase.rpc('admin_list_themes', { p_admin_id: adminId });
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        if (data?.error) return NextResponse.json({ success: false, error: data.error }, { status: 403 });
        return NextResponse.json({ success: true, data });
      }

      case 'secrets': {
        const { data, error } = await supabase.rpc('admin_list_secrets', { p_admin_id: adminId });
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        if (data?.error) return NextResponse.json({ success: false, error: data.error }, { status: 403 });
        return NextResponse.json({ success: true, data });
      }

      case 'subscriptions': {
        const { data, error } = await supabase.rpc('admin_list_subscriptions', { p_admin_id: adminId });
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        if (data?.error) return NextResponse.json({ success: false, error: data.error }, { status: 403 });
        return NextResponse.json({ success: true, data });
      }

      case 'payments': {
        const { data, error } = await supabase.rpc('admin_list_payments', { p_admin_id: adminId });
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        if (data?.error) return NextResponse.json({ success: false, error: data.error }, { status: 403 });
        return NextResponse.json({ success: true, data });
      }

      // ===== WRITE OPERATIONS =====

      case 'update_setting': {
        const { data, error } = await supabase.rpc('admin_update_setting', {
          p_admin_id: adminId,
          p_key: params.key,
          p_value: params.value
        });
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        if (data?.error) return NextResponse.json({ success: false, error: data.error }, { status: 403 });
        return NextResponse.json({ success: true });
      }

      case 'update_secret': {
        const { data, error } = await supabase.rpc('admin_update_secret', {
          p_admin_id: adminId,
          p_key: params.key,
          p_value: params.value,
          p_description: params.description || null
        });
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        if (data?.error) return NextResponse.json({ success: false, error: data.error }, { status: 403 });
        return NextResponse.json({ success: true });
      }

      case 'update_theme': {
        const { data, error } = await supabase.rpc('admin_update_theme', {
          p_admin_id: adminId,
          p_theme_id: params.theme_id,
          p_is_active: params.is_active ?? null,
          p_schedule_start: params.schedule_start || null,
          p_schedule_end: params.schedule_end || null
        });
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        if (data?.error) return NextResponse.json({ success: false, error: data.error }, { status: 403 });
        return NextResponse.json({ success: true });
      }

      case 'toggle_student_ban': {
        const { data, error } = await supabase.rpc('admin_toggle_student_ban', {
          p_admin_id: adminId,
          p_student_id: params.student_id
        });
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        if (data?.error) return NextResponse.json({ success: false, error: data.error }, { status: 403 });
        return NextResponse.json({ success: true, data });
      }

      case 'toggle_subject': {
        const { data, error } = await supabase.rpc('admin_toggle_subject_publish', {
          p_admin_id: adminId,
          p_subject_id: params.subject_id
        });
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        if (data?.error) return NextResponse.json({ success: false, error: data.error }, { status: 403 });
        return NextResponse.json({ success: true, data });
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
