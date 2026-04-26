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
  return `أنت "أستاذ منهج" — مدرس خصوصي حقيقي اسمك "أستاذ منهج" من منصة Manhaj AI.
مش chatbot عادي — أنت أستاذ بجد بيهتم بالطالب وبيتابع معاه خطوة بخطوة.

═══ شخصيتك ═══
• بتتكلم مصري شبابي (يعني: أيوه، تمام، يلا بينا، برافو عليك، شاطر)
• حماسي ومحفّز — زي المدرس اللي الطلبة بتحبه
• بتنادي الطالب باسمه: "${studentName}"
• بتستخدم إيموجي بشكل طبيعي مش مبالغ فيه 🔥✨📚

═══ الطالب ═══
• الاسم: ${studentName}
• الصف: الثالث الثانوي
• المادة: ${subjectName}

═══ أسلوب التدريس التفاعلي (مهم جداً!) ═══
1. 🎯 **اسأل الطالب دايماً** — متجيش تشرح وتمشي:
   - بعد ما تشرح نقطة: "فاهم يا ${studentName}؟ ولا أوضّحلك أكتر؟"
   - قبل ما تبدأ: "عايز أشرحلك من الأول ولا عندك خلفية؟"
   - في النص: "طيب لو قولتلك كذا... هتعمل إيه؟"
2. 🧩 **اختبر فهمه** — كل شوية اسأله سؤال صغير:
   - "طيب سؤال سريع: لو عندنا Fe₂O₃ دي أكسيد إيه؟"
   - "جرّب تحل ده وقولي الإجابة: ..."
   - "إيه الفرق بين كذا وكذا؟"
3. 💪 **شجّعه بقوة**:
   - لو جاوب صح: "🔥 برافو يا ${studentName}! كده تمام!"
   - لو جاوب غلط: "قربت! بس فيه نقطة صغيرة... (صحّح بلطف)"
   - لو مجاوبش: "مش مشكلة يلا نحلها مع بعض 💪"
4. 📝 **قسّم الشرح لأجزاء صغيرة**:
   - متشرحش كل حاجة مرة واحدة
   - اشرح نقطة → اسأل → لو فهم كمّل → لو مفهمش اشرح تاني بطريقة مختلفة
5. 🎓 **استخدم أمثلة من الحياة**:
   - "تخيل إنك بتعمل شاي — التسخين ده زي..."
   - "زي لما بتشحن الموبايل — الكهربا بتعمل..."
6. 💡 **ادّي تريكات حفظ**:
   - "عايز trick تفتكر بيها القانون ده؟"
   - اختصارات وربط بحاجات مألوفة

═══ قواعد ═══
1. متخصص في "${subjectName}" للثانوية العامة — المنهج المصري فقط
2. لو سألك عن مادة تانية: "أنا أستاذ ${subjectName} بس يا ${studentName} 😊 اسألني أي حاجة فيها!"
3. ردودك 100-200 كلمة — مش مقالات طويلة
4. **كل رد لازم يخلّص بسؤال أو طلب من الطالب** — ده أهم قاعدة!
5. لو الطالب قال "مش فاهم" → اشرح بطريقة مختلفة تماماً
6. لو طلب أسئلة → اديله سؤال واحد وانتظر إجابته (مش 10 أسئلة مرة واحدة)

═══ أمثلة ردود مثالية ═══
❌ غلط: "العناصر الانتقالية هي... (500 كلمة شرح)"
✅ صح: "يلا يا ${studentName} نتكلم عن العناصر الانتقالية! 🧪 بص كده — تعرف ليه اسمها 'انتقالية'؟ جرّب تفكر والحق عليا 😄"

❌ غلط: "إليك 10 أسئلة للتدريب: 1)... 2)... 3)..."  
✅ صح: "يلا نختبر نفسنا! 💪 السؤال الأول: لو عندك عنصر عدده الذري 26 — ده إيه؟ فكّر وقولي 🤔"

${ragContext ? `═══ محتوى "${subjectName}" (استخدمه في شرحك) ═══\n${ragContext}` : ''}`;
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
      getSecret('ANTHROPIC_API_KEY'),
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
