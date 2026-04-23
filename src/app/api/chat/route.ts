import { NextRequest, NextResponse } from 'next/server';
import { getSecret } from '@/lib/secrets';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';

const BASE_SYSTEM_PROMPT = `أنت أستاذ AI اسمك منهج من منصة Manhaj AI لطلاب الثانوية العامة في مصر. بتتكلم بأسلوب شبابي مصري لطيف ومحفز. بتساعد الطالب في مواد الثانوية العامة بس. ردودك واضحة ومفيدة وبتستخدم إيموجي بشكل خفيف. لو سألوك عن حاجة مش في المنهج قولهم بلطف إنك متخصص في منهج الثانوية بس.`;

const DEFAULT_MODEL = 'claude-opus-4-7';

export async function POST(request: NextRequest) {
  try {
    const { message, subjectId, conversationHistory = [] } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'الرسالة مطلوبة' }, { status: 400 });
    }

    // Get API key and model from DB
    const [apiKey, modelFromDB] = await Promise.all([
      getSecret('anthropic_api_key'),
      getSecret('AI_MODEL'),
    ]);
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'مفتاح AI غير مهيأ - تواصل مع الأدمن' },
        { status: 500 }
      );
    }

    const model = modelFromDB || DEFAULT_MODEL;

    // RAG: Fetch subject content if subjectId provided
    let systemPrompt = BASE_SYSTEM_PROMPT;
    
    if (subjectId) {
      try {
        const supabase = await createServerSupabaseClient();
        const { data: context } = await supabase.rpc('get_subject_context', {
          p_subject_id: subjectId,
        });

        if (context && context.lessons && context.lessons.length > 0) {
          const subjectName = context.subject_name || 'المادة';
          const lessonsContent = context.lessons
            .filter((l: any) => l.summary)
            .map((l: any) => `📚 درس: ${l.title}\n${l.summary}`)
            .join('\n\n---\n\n');

          if (lessonsContent) {
            systemPrompt = `${BASE_SYSTEM_PROMPT}

📖 أنت دلوقتي بتساعد الطالب في مادة "${subjectName}". 
استخدم المحتوى ده من المنهج الرسمي عشان تجاوب:

${lessonsContent.slice(0, 12000)}

⚠️ تعليمات مهمة:
- جاوب من المحتوى اللي فوق قدر الإمكان
- لو السؤال مش في المحتوى ده، قول للطالب إنك هتساعده بمعلوماتك العامة عن المنهج
- خلي إجاباتك مرتبطة بمنهج الثانوية العامة المصري`;
          }
        }
      } catch (err) {
        console.error('RAG context error:', err);
        // Continue without RAG — still useful
      }
    }

    const messages = [
      ...conversationHistory.slice(-10),
      { role: 'user', content: message }
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API error:', response.status, errorData);
      return NextResponse.json(
        { error: `خطأ AI (${response.status}): ${errorData.slice(0, 200)}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const assistantMessage = data.content[0]?.text || 'معلش، مقدرتش أرد دلوقتي. حاول تاني!';

    const inputTokens = data.usage?.input_tokens || 0;
    const outputTokens = data.usage?.output_tokens || 0;

    return NextResponse.json({
      success: true,
      message: assistantMessage,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        model,
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ - حاول تاني' },
      { status: 500 }
    );
  }
}
