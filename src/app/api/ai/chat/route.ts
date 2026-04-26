import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getSecret } from '@/lib/secrets';
import { canSendMessage, estimateCost } from '@/domain/ai';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';

function buildSmartPrompt(
  subjectName: string,
  studentName: string,
  ragContext: string | null
): string {
  return `أنت أستاذ AI اسمك "منهج" من منصة Manhaj AI لطلاب الثانوية العامة في مصر.
بتتكلم بأسلوب شبابي مصري لطيف ومحفز.

═══ معلومات الطالب ═══
• الاسم: ${studentName}
• الصف: الثالث الثانوي
• المادة: ${subjectName}

═══ قواعد صارمة ═══
1. أنت متخصص حصرياً في مادة "${subjectName}" للصف الثالث الثانوي — المنهج المصري فقط
2. لو سألوك عن مادة تانية أو موضوع خارج المنهج → قول بلطف "أنا متخصص في ${subjectName} بس يا ${studentName} 😊 اسألني أي حاجة فيها!"
3. لو الطالب سأل عن حاجة شخصية أو مش دراسية → وجّهه بلطف للتركيز على المذاكرة
4. استخدم محتوى المادة المرفق أدناه في إجاباتك — دي الدروس الفعلية
5. ردودك مختصرة ومفيدة — مش أكتر من 250 كلمة إلا لو محتاج شرح مفصل
6. استخدم إيموجي بشكل خفيف 📚✨
7. شجّع الطالب دايماً
8. لو غلط → صححله بلطف مع توضيح السبب
9. قسّم الشرح لخطوات بسيطة
10. اسأله في الآخر لو محتاج توضيح أكتر

═══ أساليب التدريس ═══
شرح مبسط • أمثلة عملية • سؤال وجواب • ملخص سريع • خطوة بخطوة
مقارنة • تطبيق • ربط بمعلومات سابقة • تريكات حفظ • مراجعة

${ragContext ? `═══ محتوى دروس "${subjectName}" ═══\n${ragContext}` : ''}`;
}

export async function POST(request: NextRequest) {
  try {
    // ━━━ Auth ━━━
    const authResult = await getAuthUser(request);
    if (!authResult.ok) {
      return Response.json({ error: authResult.error }, { status: 401 });
    }
    const user = authResult.data;
    const body = await request.json();
    const subjectId = body.subjectId || body.subject_id;
    const message = body.message;

    if (!message || typeof message !== 'string' || message.length > 2000) {
      return Response.json({ error: 'الرسالة مطلوبة (حد أقصى 2000 حرف)' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // ━━━ ALL queries in parallel — max speed ━━━
    const [
      settingsRes,
      usageRes,
      historyRes,
      contextRes,
      apiKey,
      modelFromDB,
    ] = await Promise.all([
      supabase.from('settings').select('key, value').in('key', ['ai_daily_limit', 'ai_monthly_limit']),
      supabase.rpc('get_chat_usage', { p_user_id: user.id }),
      supabase.rpc('get_chat_history', {
        p_user_id: user.id,
        p_subject_id: subjectId || null,
        p_limit: 6,
      }),
      subjectId
        ? supabase.rpc('get_subject_context', { p_subject_id: subjectId })
        : Promise.resolve({ data: null }),
      getSecret('anthropic_api_key'),
      getSecret('AI_MODEL'),
    ]);

    // ━━━ Limits check ━━━
    const settingsMap = new Map(
      (settingsRes.data ?? []).map((s: any) => [s.key, s.value])
    );
    const limits = {
      daily: parseInt(String(settingsMap.get('ai_daily_limit') ?? '50'), 10),
      monthly: parseInt(String(settingsMap.get('ai_monthly_limit') ?? '500'), 10),
    };
    const usage = usageRes.data ?? { daily: 0, monthly: 0 };
    const dailyCount = typeof usage === 'object' ? (usage.daily ?? 0) : 0;
    const monthlyCount = typeof usage === 'object' ? (usage.monthly ?? 0) : 0;

    const limitCheck = canSendMessage(dailyCount, monthlyCount, limits);
    if (!limitCheck.ok) {
      return Response.json({ error: limitCheck.error }, { status: 429 });
    }

    // ━━━ API Key ━━━
    const cleanApiKey = apiKey?.replace(/^"|"$/g, '').trim();
    if (!cleanApiKey) {
      return Response.json({ error: 'مفتاح AI غير مهيأ — تواصل مع الأدمن' }, { status: 500 });
    }

    // ━━━ Build RAG context (truncated to ~6000 chars) ━━━
    let ragContext: string | null = null;
    const ctxData = contextRes.data;
    if (ctxData && typeof ctxData === 'object') {
      const lessons = (ctxData as any).lessons ?? [];
      let contextText = '';
      for (const lesson of lessons) {
        const entry = `📖 ${lesson.title || 'درس'}:\n${(lesson.summary || '').slice(0, 500)}\n\n`;
        if (contextText.length + entry.length > 4000) break;
        contextText += entry;
      }
      if (contextText) ragContext = contextText;
    }

    // ━━━ Build conversation ━━━
    const subjectName = ctxData?.subject_name || 'المنهج المصري';
    const systemPrompt = buildSmartPrompt(subjectName, user.fullName || 'طالب', ragContext);

    const history = (historyRes.data ?? []) as { role: string; content: string }[];
    const conversationMessages = [
      ...history.reverse().map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    const model = (modelFromDB || DEFAULT_MODEL).replace(/^"|"$/g, '').trim();

    // ━━━ STREAMING response ━━━
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': cleanApiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model,
              max_tokens: 1024,
              system: systemPrompt,
              messages: conversationMessages,
              temperature: 0.7,
              stream: true,
            }),
          });

          if (!claudeRes.ok) {
            const errText = await claudeRes.text();
            console.error('[Chat] Claude error:', claudeRes.status, errText);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'خطأ في الاتصال بالذكاء الاصطناعي' })}\n\n`));
            controller.close();
            return;
          }

          const reader = claudeRes.body?.getReader();
          if (!reader) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'فشل البث' })}\n\n`));
            controller.close();
            return;
          }

          const decoder = new TextDecoder();
          let fullResponse = '';
          let inputTokens = 0;
          let outputTokens = 0;
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (data === '[DONE]' || !data) continue;

              try {
                const event = JSON.parse(data);

                if (event.type === 'content_block_delta' && event.delta?.text) {
                  fullResponse += event.delta.text;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'delta', text: event.delta.text })}\n\n`)
                  );
                }

                if (event.type === 'message_start' && event.message?.usage) {
                  inputTokens = event.message.usage.input_tokens || 0;
                }

                if (event.type === 'message_delta' && event.usage) {
                  outputTokens = event.usage.output_tokens || 0;
                }
              } catch {
                // Skip malformed lines
              }
            }
          }

          // ━━━ Send done event ━━━
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'done',
              usage: {
                dailyRemaining: limits.daily - dailyCount - 1,
                monthlyRemaining: limits.monthly - monthlyCount - 1,
              },
            })}\n\n`)
          );
          controller.close();

          // ━━━ Save messages (fire-and-forget after stream closes) ━━━
          try {
            const totalTokens = inputTokens + outputTokens;
            await Promise.all([
              supabase.rpc('save_chat_message', {
                p_user_id: user.id,
                p_subject_id: subjectId || null,
                p_role: 'user',
                p_content: message,
                p_tokens_used: 0,
              }),
              supabase.rpc('save_chat_message', {
                p_user_id: user.id,
                p_subject_id: subjectId || null,
                p_role: 'assistant',
                p_content: fullResponse,
                p_tokens_used: totalTokens,
              }),
            ]);
          } catch (saveErr) {
            console.error('[Chat] Save error:', saveErr);
          }

        } catch (error) {
          console.error('[Chat Stream] Error:', error);
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'حدث خطأ غير متوقع' })}\n\n`)
            );
            controller.close();
          } catch {
            // Controller already closed
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('[AI Chat] Unexpected:', error);
    return Response.json({ error: 'حدث خطأ. يرجى المحاولة مرة أخرى' }, { status: 500 });
  }
}
