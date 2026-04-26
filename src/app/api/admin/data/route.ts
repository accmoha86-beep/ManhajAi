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
        const lessonsArr = data?.lessons || (Array.isArray(data) ? data : []);
        return ok({ lessons: lessonsArr });
      }

      case 'create_lesson': {
        const { data, error } = await sb.rpc('admin_create_lesson', {
          p_admin_id: aid,
          p_subject_id: params.subject_id,
          p_title_ar: params.title_ar || params.title,
          p_sort_order: params.sort_order || 0,
        });
        if (error) return err(error.message);
        if (data?.error) return err(data.error, 403);
        return ok(data);
      }

      case 'delete_lesson': {
        const { data, error } = await sb.rpc('admin_delete_lesson', {
          p_admin_id: aid,
          p_lesson_id: params.lesson_id,
        });
        if (error) return err(error.message);
        if (data?.error) return err(data.error, 403);
        return ok(data);
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
            code: (params.code || '').toUpperCase().trim(),
            discount_percent: params.discount_percent || 10,
            max_uses: params.max_uses || null,
            used_count: 0,
            is_active: true,
            valid_from: params.valid_from || new Date().toISOString(),
            valid_until: params.valid_until || null,
            description_ar: params.description_ar || null,
          })
          .select()
          .single();
        if (error) return err(error.message);
        return ok({ coupon: data });
      }

      case 'update_coupon': {
        const couponUpdates: Record<string, unknown> = {};
        if (params.is_active !== undefined) couponUpdates.is_active = params.is_active;
        if (params.discount_percent !== undefined) couponUpdates.discount_percent = params.discount_percent;
        if (params.max_uses !== undefined) couponUpdates.max_uses = params.max_uses;
        if (params.valid_from !== undefined) couponUpdates.valid_from = params.valid_from;
        if (params.valid_until !== undefined) couponUpdates.valid_until = params.valid_until;
        if (params.description_ar !== undefined) couponUpdates.description_ar = params.description_ar;
        if (params.code !== undefined) couponUpdates.code = params.code.toUpperCase().trim();

        const { data, error } = await sb
          .from('coupons')
          .update(couponUpdates)
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

      case 'toggle_grade': {
        const gradeUpd: Record<string, unknown> = {};
        if (params.published !== undefined) gradeUpd.is_published = params.published;
        const { data: gData, error: gErr } = await sb
          .from('grade_levels')
          .update(gradeUpd)
          .eq('id', params.grade_id || params.id)
          .select()
          .single();
        if (gErr) return err(gErr.message);
        return ok({ grade: gData });
      }
      case 'update_grade': {
        const gradeUpdates: Record<string, unknown> = {};
        if (params.is_published !== undefined) gradeUpdates.is_published = params.is_published;
        if (params.has_terms !== undefined) gradeUpdates.has_terms = params.has_terms;
        if (params.term1_published !== undefined) gradeUpdates.term1_published = params.term1_published;
        if (params.term2_published !== undefined) gradeUpdates.term2_published = params.term2_published;

        const { data, error } = await sb
          .from('grade_levels')
          .update(gradeUpdates)
          .eq('id', params.id || params.grade_id)
          .select()
          .single();
        if (error) return err(error.message);
        return ok({ grade: data });
      }

      // ===== CONTENT GENERATION =====
      case 'generate_content': {
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
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'فشل في توليد المحتوى';
          return err(msg);
        }
      }

      // ===== DOWNLOAD REPORT =====
      case 'download_report': {
        return ok({ redirect_url: '/api/admin/reports' });
      }

      // ===== PAYMENT CONFIG =====
      case 'get_payment_config': {
        const { data: secrets } = await sb.rpc('admin_list_secrets', { p_admin_id: aid });
        const paymentSecretKeys = [
          'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PUBLISHABLE_KEY',
          'PAYMOB_API_KEY', 'PAYMOB_VODAFONE_INTEGRATION_ID', 'PAYMOB_FAWRY_INTEGRATION_ID',
          'PAYMOB_INSTAPAY_INTEGRATION_ID', 'PAYMOB_IFRAME_ID', 'PAYMOB_HMAC_SECRET'
        ];
        const paymentSecrets = (secrets || []).filter((s: Record<string, unknown>) =>
          paymentSecretKeys.includes(s.key as string)
        );
        const { data: settings } = await sb.rpc('admin_list_settings', { p_admin_id: aid });
        const paymentSettings = (settings || []).filter((s: Record<string, unknown>) => {
          const k = s.key as string;
          return k?.startsWith('payment_') || k?.startsWith('stripe_') || k?.startsWith('paymob_');
        });
        return ok({ secrets: paymentSecrets, settings: paymentSettings });
      }

      case 'update_payment_config': {
        if (params.secret_key && params.secret_value !== undefined) {
          const { error } = await sb.rpc('admin_update_secret', {
            p_admin_id: aid,
            p_key: params.secret_key,
            p_value: params.secret_value,
            p_description: params.description || null
          });
          if (error) return err(error.message);
        }
        if (params.setting_key && params.setting_value !== undefined) {
          const { error } = await sb.rpc('admin_update_setting', {
            p_admin_id: aid,
            p_key: params.setting_key,
            p_value: String(params.setting_value)
          });
          if (error) return err(error.message);
        }
        return ok({ success: true });
      }

      // ===== SUBSCRIPTION PLANS =====
      case 'get_plans': {
        const { data, error } = await sb
          .from('subscription_plans')
          .select('*')
          .order('max_subjects', { ascending: true });
        if (error) return err(error.message);
        return ok({ plans: data || [] });
      }

      case 'create_plan': {
        const { data, error } = await sb.rpc('admin_create_plan', {
          p_admin_id: user.id,
          p_name_ar: params.name_ar || 'خطة جديدة',
          p_price_monthly: params.price_monthly || 89,
          p_duration_days: params.duration_days || 30,
          p_max_subjects: params.max_subjects || 1,
          p_discount_percent: params.discount_percent || 0,
          p_features_ar: params.features_ar || params.features || [],
          p_features: Array.isArray(params.features) ? JSON.stringify(params.features) : (params.features || '[]'),
          p_description: params.description || '',
          p_is_active: params.is_active !== false,
          p_is_popular: params.is_popular || false,
        });
        if (error) return err(error.message);
        return ok({ plan: data });
      }

      case 'update_plan': {
        const rpcParams: Record<string, unknown> = {
          p_admin_id: user.id,
          p_plan_id: params.id || params.plan_id,
        };
        if (params.name_ar !== undefined) rpcParams.p_name_ar = params.name_ar;
        if (params.price_monthly !== undefined) rpcParams.p_price_monthly = Number(params.price_monthly);
        if (params.price_term !== undefined) rpcParams.p_price_term = Number(params.price_term);
        if (params.price_annual !== undefined) rpcParams.p_price_annual = Number(params.price_annual);
        if (params.duration_days !== undefined) rpcParams.p_duration_days = Number(params.duration_days);
        if (params.max_subjects !== undefined) rpcParams.p_max_subjects = Number(params.max_subjects);
        if (params.discount_percent !== undefined) rpcParams.p_discount_percent = Number(params.discount_percent);
        if (params.features_ar !== undefined) rpcParams.p_features_ar = params.features_ar;
        if (params.features !== undefined) rpcParams.p_features = Array.isArray(params.features) ? JSON.stringify(params.features) : params.features;
        if (params.description !== undefined) rpcParams.p_description = params.description;
        if (params.is_active !== undefined) rpcParams.p_is_active = params.is_active;
        if (params.is_popular !== undefined) rpcParams.p_is_popular = params.is_popular;
        const { data, error } = await sb.rpc('admin_update_plan', rpcParams);
        if (error) return err(error.message);
        return ok({ plan: data });
      }

      case 'delete_plan': {
        const { data, error } = await sb.rpc('admin_delete_plan', {
          p_admin_id: user.id,
          p_plan_id: params.id || params.plan_id,
        });
        if (error) return err(error.message);
        return ok({ success: data || { success: true } });
      }

      // ===== EXAMS (admin) =====
      case 'get_exams': {
        const { data, error } = await sb
          .from('exam_results')
          .select('*, users!inner(full_name), subjects!inner(name_ar)')
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) {
          const { data: d2, error: e2 } = await sb
            .from('exam_results')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
          if (e2) return err(e2.message);
          return ok({ exams: d2 || [] });
        }
        return ok({ exams: (data || []).map((e: Record<string, unknown>) => ({
          ...e,
          user_name: (e.users as Record<string, unknown>)?.full_name,
          subject_name: (e.subjects as Record<string, unknown>)?.name_ar,
        }))});
      }

      case 'get_questions': {
        const { data, error } = await sb
          .from('questions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);
        if (error) return err(error.message);
        return ok({ questions: data || [] });
      }

      // Ban/Unban shortcuts
      case 'ban_student': {
        const { error } = await sb.rpc('admin_update_student', {
          p_admin_id: aid,
          p_student_id: params.user_id || params.student_id,
          p_updates: JSON.stringify({ is_banned: true })
        });
        if (error) return err(error.message);
        return ok({ success: true });
      }

      case 'unban_student': {
        const { error } = await sb.rpc('admin_update_student', {
          p_admin_id: aid,
          p_student_id: params.user_id || params.student_id,
          p_updates: JSON.stringify({ is_banned: false })
        });
        if (error) return err(error.message);
        return ok({ success: true });
      }

      case 'delete_student': {
        const { data, error } = await sb.rpc('admin_delete_student', {
          p_admin_id: aid,
          p_student_id: params.user_id || params.student_id
        });
        if (error) return err(error.message);
        if (data?.error) return err(data.error, 403);
        return ok(data);
      }

      // ===== 💰 PROFITABILITY =====
      case 'profitability': {
        const { data, error } = await sb.rpc('admin_students_profitability', { p_admin_id: aid });
        if (error) return err(error.message);
        return ok(data || {});
      }

      case 'student_profitability': {
        const { data, error } = await sb.rpc('get_student_profitability', { p_user_id: params.user_id || params.student_id });
        if (error) return err(error.message);
        return ok(data || {});
      }

      default:
        return err(`Unknown action: ${action}`, 400);
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return err('Internal server error');
  }
}
