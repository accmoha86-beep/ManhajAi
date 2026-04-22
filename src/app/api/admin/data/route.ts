import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getServiceSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase service-role credentials not configured');
  }
  return createClient(url, key);
}

function ok(data: unknown) {
  return NextResponse.json({ success: true, data }, { status: 200 });
}

function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function maskSecret(value: string): string {
  if (!value) return '••••••••';
  if (value.length > 12) {
    return value.slice(0, 8) + '...' + value.slice(-4);
  }
  return '••••••••';
}

async function verifyAdmin(req: NextRequest): Promise<{ valid: true; userId: string } | { valid: false; response: NextResponse }> {
  const token = req.cookies.get('auth-token')?.value;
  if (!token) {
    return { valid: false, response: err('Not authenticated', 401) };
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return { valid: false, response: err('JWT_SECRET not configured', 500) };
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    if (payload.role !== 'admin') {
      return { valid: false, response: err('Forbidden – admin only', 403) };
    }
    return { valid: true, userId: payload.sub as string };
  } catch {
    return { valid: false, response: err('Invalid or expired token', 401) };
  }
}

// ---------------------------------------------------------------------------
// Action handlers
// ---------------------------------------------------------------------------

async function getStats(sb: SupabaseClient) {
  const [
    { count: totalStudents },
    { count: activeSubs },
    { count: trialSubs },
    { count: totalPayments },
    revenueResult,
    { count: totalSubjects },
    { count: totalLessons },
    { count: totalQuestions },
    { count: chatMessagesCount },
  ] = await Promise.all([
    sb.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    sb.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    sb.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'trial'),
    sb.from('payments').select('*', { count: 'exact', head: true }),
    sb.from('payments').select('amount_egp').eq('status', 'completed'),
    sb.from('subjects').select('*', { count: 'exact', head: true }),
    sb.from('lessons').select('*', { count: 'exact', head: true }),
    sb.from('questions').select('*', { count: 'exact', head: true }),
    sb.from('chat_messages').select('*', { count: 'exact', head: true }),
  ]);

  const totalRevenue = (revenueResult.data ?? []).reduce(
    (sum: number, p: { amount_egp: number }) => sum + Number(p.amount_egp ?? 0),
    0,
  );

  return ok({
    total_students: totalStudents ?? 0,
    active_subscriptions: activeSubs ?? 0,
    trial_subscriptions: trialSubs ?? 0,
    total_payments: totalPayments ?? 0,
    total_revenue: totalRevenue,
    total_subjects: totalSubjects ?? 0,
    total_lessons: totalLessons ?? 0,
    total_questions: totalQuestions ?? 0,
    chat_messages_count: chatMessagesCount ?? 0,
  });
}

// ---- Students -------------------------------------------------------------

async function getStudents(sb: SupabaseClient, params: Record<string, unknown>) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const search = (params.search as string) ?? '';

  let query = sb
    .from('users')
    .select('id, full_name, phone, role, governorate, is_verified, is_banned, avatar_url, created_at, trial_ends_at, referral_code, referred_by, last_login_at', { count: 'exact' })
    .eq('role', 'student')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data: students, count, error } = await query;
  if (error) return err(error.message, 500);

  // Fetch latest subscription for each student
  const studentIds = (students ?? []).map((s: { id: string }) => s.id);
  let subscriptions: Record<string, unknown>[] = [];
  if (studentIds.length > 0) {
    const { data: subs } = await sb
      .from('subscriptions')
      .select('id, user_id, status, plan_type, starts_at, expires_at')
      .in('user_id', studentIds)
      .order('created_at', { ascending: false });
    subscriptions = subs ?? [];
  }

  // Group subscriptions by user_id (take first = latest)
  const subMap: Record<string, unknown> = {};
  for (const s of subscriptions) {
    const uid = (s as Record<string, unknown>).user_id as string;
    if (!subMap[uid]) subMap[uid] = s;
  }

  const enriched = (students ?? []).map((st: Record<string, unknown>) => ({
    ...st,
    subscription: subMap[st.id as string] ?? null,
  }));

  return ok({ students: enriched, total: count ?? 0 });
}

async function updateStudent(sb: SupabaseClient, params: Record<string, unknown>) {
  const { id, updates } = params as { id: string; updates: Record<string, unknown> };
  if (!id) return err('Missing student id');
  if (!updates || typeof updates !== 'object') return err('Missing updates object');

  const allowed = ['is_banned', 'is_verified', 'governorate', 'trial_ends_at'];
  const filtered: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in updates) filtered[key] = updates[key];
  }
  if (Object.keys(filtered).length === 0) return err('No valid fields to update');

  filtered.updated_at = new Date().toISOString();

  const { data, error } = await sb.from('users').update(filtered).eq('id', id).select().single();
  if (error) return err(error.message, 500);
  return ok(data);
}

// ---- Subjects -------------------------------------------------------------

async function getSubjects(sb: SupabaseClient) {
  const { data: subjects, error } = await sb
    .from('subjects')
    .select('*')
    .order('grade_level')
    .order('sort_order');

  if (error) return err(error.message, 500);

  // Get lesson counts and question counts per subject
  const subjectIds = (subjects ?? []).map((s: { id: string }) => s.id);
  const lessonCounts: Record<string, number> = {};
  const questionCounts: Record<string, number> = {};

  if (subjectIds.length > 0) {
    const { data: lessons } = await sb
      .from('lessons')
      .select('subject_id');

    if (lessons) {
      for (const l of lessons) {
        const sid = (l as Record<string, unknown>).subject_id as string;
        lessonCounts[sid] = (lessonCounts[sid] || 0) + 1;
      }
    }

    const { data: questions } = await sb
      .from('questions')
      .select('subject_id');

    if (questions) {
      for (const q of questions) {
        const sid = (q as Record<string, unknown>).subject_id as string;
        questionCounts[sid] = (questionCounts[sid] || 0) + 1;
      }
    }
  }

  const enriched = (subjects ?? []).map((s: Record<string, unknown>) => ({
    ...s,
    lesson_count: lessonCounts[s.id as string] || 0,
    question_count: questionCounts[s.id as string] || 0,
  }));

  return ok(enriched);
}

async function createSubject(sb: SupabaseClient, params: Record<string, unknown>) {
  const { name_ar, name_en, icon, color, grade_level, is_published, sort_order, description_ar, description_en } = params;
  if (!name_ar) return err('name_ar is required');

  const { data, error } = await sb
    .from('subjects')
    .insert({
      name_ar,
      name_en: name_en ?? null,
      description_ar: description_ar ?? null,
      description_en: description_en ?? null,
      icon: icon ?? null,
      color: color ?? null,
      grade_level: grade_level ?? 1,
      is_published: is_published ?? false,
      sort_order: sort_order ?? 0,
    })
    .select()
    .single();

  if (error) return err(error.message, 500);
  return ok(data);
}

async function updateSubject(sb: SupabaseClient, params: Record<string, unknown>) {
  const { id, updates } = params as { id: string; updates: Record<string, unknown> };
  if (!id) return err('Missing subject id');
  if (!updates || typeof updates !== 'object') return err('Missing updates object');

  const allowed = ['name_ar', 'name_en', 'description_ar', 'description_en', 'icon', 'color', 'grade_level', 'is_published', 'sort_order'];
  const filtered: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in updates) filtered[key] = updates[key];
  }
  if (Object.keys(filtered).length === 0) return err('No valid fields to update');

  const { data, error } = await sb.from('subjects').update(filtered).eq('id', id).select().single();
  if (error) return err(error.message, 500);
  return ok(data);
}

async function deleteSubject(sb: SupabaseClient, params: Record<string, unknown>) {
  const { id } = params as { id: string };
  if (!id) return err('Missing subject id');

  // Check for existing lessons
  const { count } = await sb.from('lessons').select('*', { count: 'exact', head: true }).eq('subject_id', id);
  if (count && count > 0) {
    return err(`Cannot delete subject: it has ${count} lesson(s). Remove them first.`);
  }

  const { error } = await sb.from('subjects').delete().eq('id', id);
  if (error) return err(error.message, 500);
  return ok({ deleted: true });
}

// ---- Subscriptions --------------------------------------------------------

async function getSubscriptions(sb: SupabaseClient, params: Record<string, unknown>) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const status = params.status as string | undefined;
  const search = (params.search as string) ?? '';

  let query = sb
    .from('subscriptions')
    .select('*, user:users(id, full_name, phone)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status) {
    query = query.eq('status', status);
  }

  // If searching, we need to get matching user ids first
  if (search) {
    const { data: matchingUsers } = await sb
      .from('users')
      .select('id')
      .or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
    const userIds = (matchingUsers ?? []).map((u: { id: string }) => u.id);
    if (userIds.length === 0) return ok({ subscriptions: [], total: 0 });
    query = query.in('user_id', userIds);
  }

  const { data, count, error } = await query;
  if (error) return err(error.message, 500);
  return ok({ subscriptions: data ?? [], total: count ?? 0 });
}

async function updateSubscription(sb: SupabaseClient, params: Record<string, unknown>) {
  const { id, updates } = params as { id: string; updates: Record<string, unknown> };
  if (!id) return err('Missing subscription id');
  if (!updates || typeof updates !== 'object') return err('Missing updates object');

  const allowed = ['status', 'expires_at', 'auto_renew'];
  const filtered: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in updates) filtered[key] = updates[key];
  }
  if (Object.keys(filtered).length === 0) return err('No valid fields to update');

  filtered.updated_at = new Date().toISOString();

  const { data, error } = await sb.from('subscriptions').update(filtered).eq('id', id).select().single();
  if (error) return err(error.message, 500);
  return ok(data);
}

// ---- Payments -------------------------------------------------------------

async function getPayments(sb: SupabaseClient, params: Record<string, unknown>) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await sb
    .from('payments')
    .select('*, user:users(id, full_name, phone)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) return err(error.message, 500);
  return ok({ payments: data ?? [], total: count ?? 0 });
}

// ---- Settings -------------------------------------------------------------

async function getSettings(sb: SupabaseClient) {
  const { data, error } = await sb.from('settings').select('*').order('key');
  if (error) return err(error.message, 500);
  return ok(data ?? []);
}

async function updateSetting(sb: SupabaseClient, params: Record<string, unknown>) {
  const { key, value } = params;
  if (!key) return err('Missing key');
  if (value === undefined) return err('Missing value');

  const { data, error } = await sb
    .from('settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select()
    .single();

  if (error) return err(error.message, 500);
  return ok(data);
}

// ---- Secrets --------------------------------------------------------------

async function getSecrets(sb: SupabaseClient) {
  const { data, error } = await sb.from('system_secrets').select('*').order('key');
  if (error) return err(error.message, 500);

  const masked = (data ?? []).map((s: Record<string, unknown>) => ({
    ...s,
    value: maskSecret(s.value as string),
  }));

  return ok(masked);
}

async function updateSecret(sb: SupabaseClient, params: Record<string, unknown>, userId: string) {
  const { key, value, description } = params as { key: string; value: string; description?: string };
  if (!key) return err('Missing key');
  if (!value) return err('Missing value');

  const updateData: Record<string, unknown> = {
    key,
    value,
    updated_at: new Date().toISOString(),
    updated_by: userId,
  };
  if (description !== undefined) updateData.description = description;

  const { data, error } = await sb
    .from('system_secrets')
    .upsert(updateData, { onConflict: 'key' })
    .select()
    .single();

  if (error) return err(error.message, 500);

  // Return with masked value
  return ok({ ...data, value: maskSecret(value) });
}

// ---- Themes ---------------------------------------------------------------

async function getThemes(sb: SupabaseClient) {
  const { data, error } = await sb.from('themes').select('*').order('created_at', { ascending: false });
  if (error) return err(error.message, 500);
  return ok(data ?? []);
}

async function updateTheme(sb: SupabaseClient, params: Record<string, unknown>) {
  const { slug, updates } = params as { slug: string; updates: Record<string, unknown> };
  if (!slug) return err('Missing theme slug');
  if (!updates || typeof updates !== 'object') return err('Missing updates object');

  const allowed = ['is_active', 'auto_activate_at', 'auto_deactivate_at', 'config', 'name_ar', 'name_en'];
  const filtered: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in updates) filtered[key] = updates[key];
  }
  if (Object.keys(filtered).length === 0) return err('No valid fields to update');

  filtered.updated_at = new Date().toISOString();

  const { data, error } = await sb.from('themes').update(filtered).eq('slug', slug).select().single();
  if (error) return err(error.message, 500);
  return ok(data);
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const auth = await verifyAdmin(req);
    if (!auth.valid) return auth.response;

    const body = await req.json();
    const { action, ...params } = body;

    if (!action) return err('Missing action parameter');

    const sb = getServiceSupabase();

    switch (action) {
      // Stats
      case 'get_stats':
        return await getStats(sb);

      // Students
      case 'get_students':
        return await getStudents(sb, params);
      case 'update_student':
        return await updateStudent(sb, params);

      // Subjects
      case 'get_subjects':
        return await getSubjects(sb);
      case 'create_subject':
        return await createSubject(sb, params);
      case 'update_subject':
        return await updateSubject(sb, params);
      case 'delete_subject':
        return await deleteSubject(sb, params);

      // Subscriptions
      case 'get_subscriptions':
        return await getSubscriptions(sb, params);
      case 'update_subscription':
        return await updateSubscription(sb, params);

      // Payments
      case 'get_payments':
        return await getPayments(sb, params);

      // Settings
      case 'get_settings':
        return await getSettings(sb);
      case 'update_setting':
        return await updateSetting(sb, params);

      // Secrets
      case 'get_secrets':
        return await getSecrets(sb);
      case 'update_secret':
        return await updateSecret(sb, params, auth.userId);

      // Themes
      case 'get_themes':
        return await getThemes(sb);
      case 'update_theme':
        return await updateTheme(sb, params);

      default:
        return err(`Unknown action: ${action}`);
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal server error';
    console.error('[Admin API Error]', e);
    return err(message, 500);
  }
}
