import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { chat } from '@/infrastructure/claude/client';
import { buildChatSystemPrompt, canSendMessage, estimateCost } from '@/domain/ai';
import { getAuthUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }
    const user = authResult.data;
    const body = await request.json();
    
    // Accept both field naming conventions
    const subjectId = body.subjectId || body.subject_id;
    const message = body.message;

    if (!message || message.length > 2000) {
      return NextResponse.json({ error: 'الرسالة مطلوبة (حد أقصى 2000 حرف)' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Get limits from settings
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

    // Count usage
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

    const limitResult = canSendMessage(dailyCount ?? 0, monthlyCount ?? 0, limits);
    if (!limitResult.ok) {
      return NextResponse.json({ error: limitResult.error }, { status: 429 });
    }

    // Get subject info
    let subjectName = 'المنهج المصري';
    if (subjectId) {
      const { data: subject } = await supabase
        .from('subjects')
        .select('name')
        .eq('id', subjectId)
        .single();
      if (subject) subjectName = subject.name;
    }

    // Get conversation history
    const historyQuery = supabase
      .from('chat_messages')
      .select('role, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (subjectId) historyQuery.eq('subject_id', subjectId);
    
    const { data: historyMessages } = await historyQuery;

    const conversationHistory = (historyMessages ?? [])
      .reverse()
      .map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
    conversationHistory.push({ role: 'user', content: message });

    const systemPrompt = buildChatSystemPrompt(subjectName);

    const chatResult = await chat({
      systemPrompt,
      messages: conversationHistory,
      maxTokens: 2048,
    });

    if (!chatResult.ok) {
      return NextResponse.json({ error: chatResult.error }, { status: 500 });
    }

    const { content: aiResponse, inputTokens, outputTokens } = chatResult.data;
    const cost = estimateCost(inputTokens, outputTokens);

    // Save messages
    const now = new Date().toISOString();
    await supabase.from('chat_messages').insert([
      {
        user_id: user.id,
        subject_id: subjectId || null,
        role: 'user',
        content: message,
        created_at: now,
      },
      {
        user_id: user.id,
        subject_id: subjectId || null,
        role: 'assistant',
        content: aiResponse,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost,
        created_at: new Date(Date.now() + 1).toISOString(),
      },
    ]);

    return NextResponse.json({
      success: true,
      data: { reply: aiResponse },
      message: aiResponse,
      usage: {
        dailyRemaining: limits.daily - (dailyCount ?? 0) - 1,
        monthlyRemaining: limits.monthly - (monthlyCount ?? 0) - 1,
      },
    });
  } catch (error) {
    console.error('[AI Chat] Error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى' }, { status: 500 });
  }
}
