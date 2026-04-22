// app/api/ai/chat/route.ts — AI chat endpoint
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { chat } from '@/infrastructure/claude/client';
import { buildChatSystemPrompt, canSendMessage, estimateCost } from '@/domain/ai';
import { getAuthUser } from '@/lib/auth';

const ChatSchema = z.object({
  subjectId: z.string().uuid('معرف المادة غير صالح'),
  message: z
    .string()
    .min(1, 'الرسالة مطلوبة')
    .max(2000, 'الرسالة طويلة جدًا (الحد الأقصى 2000 حرف)'),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await getAuthUser(request);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }
    const user = authResult.data;

    const body = await request.json();

    // Validate input
    const parsed = ChatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'بيانات غير صالحة' },
        { status: 400 }
      );
    }

    const { subjectId, message } = parsed.data;
    const supabase = await createServerSupabaseClient();

    // Get message limits from settings
    const { data: settings } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['ai_daily_limit', 'ai_monthly_limit']);

    const settingsMap = new Map(
      (settings ?? []).map((s: { key: string; value: string }) => [s.key, s.value] as const)
    );
    const limits = {
      daily: parseInt(String(settingsMap.get('ai_daily_limit') ?? '50'), 10),
      monthly: parseInt(String(settingsMap.get('ai_monthly_limit') ?? '500'), 10),
    };

    // Get user's usage counts
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const { count: dailyCount } = await supabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('role', 'user')
      .gte('created_at', today.toISOString());

    const { count: monthlyCount } = await supabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('role', 'user')
      .gte('created_at', monthStart.toISOString());

    // Check limits
    const limitResult = canSendMessage(
      dailyCount ?? 0,
      monthlyCount ?? 0,
      limits
    );
    if (!limitResult.ok) {
      return NextResponse.json(
        { error: limitResult.error },
        { status: 429 }
      );
    }

    // Fetch subject info for context
    const { data: subject } = await supabase
      .from('subjects')
      .select('id, name, grade')
      .eq('id', subjectId)
      .single();

    if (!subject) {
      return NextResponse.json(
        { error: 'المادة غير موجودة' },
        { status: 404 }
      );
    }

    // Get conversation history (last 20 messages for context)
    const { data: historyMessages } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('user_id', user.id)
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: false })
      .limit(20);

    const conversationHistory = (historyMessages ?? [])
      .reverse()
      .map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // Add current message
    conversationHistory.push({ role: 'user', content: message });

    // Build system prompt with subject context
    const systemPrompt = buildChatSystemPrompt(subject.name);

    // Call Claude
    const chatResult = await chat({
      systemPrompt,
      messages: conversationHistory,
      maxTokens: 2048,
    });

    if (!chatResult.ok) {
      return NextResponse.json(
        { error: chatResult.error },
        { status: 500 }
      );
    }

    const { content: aiResponse, inputTokens, outputTokens } = chatResult.data;
    const cost = estimateCost(inputTokens, outputTokens);

    // Save both user message and AI response
    const now = new Date().toISOString();
    await supabase.from('chat_messages').insert([
      {
        user_id: user.id,
        subject_id: subjectId,
        role: 'user',
        content: message,
        created_at: now,
      },
      {
        user_id: user.id,
        subject_id: subjectId,
        role: 'assistant',
        content: aiResponse,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost,
        created_at: new Date(Date.now() + 1).toISOString(), // +1ms for ordering
      },
    ]);

    return NextResponse.json({
      message: aiResponse,
      usage: {
        dailyRemaining: limits.daily - (dailyCount ?? 0) - 1,
        monthlyRemaining: limits.monthly - (monthlyCount ?? 0) - 1,
      },
    });
  } catch (error) {
    console.error('[AI Chat] Unexpected error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى' },
      { status: 500 }
    );
  }
}
