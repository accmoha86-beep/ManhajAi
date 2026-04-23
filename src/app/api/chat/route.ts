import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSecret } from '@/lib/secrets';

const SYSTEM_PROMPT = `أنت أستاذ AI اسمك منهج من منصة Manhaj AI لطلاب الثانوية العامة في مصر. بتتكلم بأسلوب شبابي مصري لطيف ومحفز. بتساعد الطالب في مواد الثانوية العامة بس. ردودك واضحة ومفيدة وبتستخدم إيموجي بشكل خفيف. لو سألوك عن حاجة مش في المنهج قولهم بلطف إنك متخصص في منهج الثانوية بس.`;

export async function POST(request: NextRequest) {
  try {
    const { message, subjectId, conversationHistory = [] } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'الرسالة مطلوبة' }, { status: 400 });
    }

    // Get API key from DB
    const apiKey = await getSecret('anthropic_api_key');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'مفتاح AI غير مهيأ - تواصل مع الأدمن' },
        { status: 500 }
      );
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
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API error:', errorData);
      return NextResponse.json(
        { error: 'حدث خطأ في الرد - حاول تاني' },
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
