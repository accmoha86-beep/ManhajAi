import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: 401 });

    const body = await request.json();
    const { subject_id, lesson_id, count = 15, difficulty = 'mixed' } = body;

    if (!subject_id) {
      return NextResponse.json({ error: 'المادة مطلوبة' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Get AI model + API key from DB
    const [modelRes, keyRes] = await Promise.all([
      supabase.rpc('get_system_secret', { p_key: 'AI_CONTENT_MODEL' }),
      supabase.rpc('get_system_secret', { p_key: 'ANTHROPIC_API_KEY' }),
    ]);

    const model = modelRes.data || 'claude-sonnet-4-5-20250929';
    const apiKey = keyRes.data;
    if (!apiKey) {
      return NextResponse.json({ error: 'مفتاح AI غير مضبوط' }, { status: 500 });
    }

    // Get subject summaries as context
    const { data: summaries } = await supabase.rpc('get_subject_summaries_for_exam', {
      p_subject_id: subject_id,
      p_lesson_id: lesson_id || null,
    });

    const contextText = Array.isArray(summaries)
      ? summaries.map((s: any) => `## ${s.lesson_title}\n${s.summary}`).join('\n\n---\n\n')
      : '';

    if (!contextText || contextText.length < 50) {
      return NextResponse.json({ 
        error: 'لا يوجد محتوى كافٍ لتوليد امتحان. ارفع المنهج أولاً.' 
      }, { status: 400 });
    }

    // Get subject name
    const { data: subjectData } = await supabase
      .from('subjects')
      .select('name_ar')
      .eq('id', subject_id)
      .single();

    const subjectName = subjectData?.name_ar || 'المادة';

    const difficultyInstruction = difficulty === 'easy'
      ? 'اجعل كل الأسئلة سهلة — تعريفات ومفاهيم أساسية'
      : difficulty === 'hard'
        ? 'اجعل كل الأسئلة صعبة — تطبيقية وتحليلية ومقارنات'
        : difficulty === 'medium'
          ? 'اجعل كل الأسئلة متوسطة الصعوبة — فهم وتطبيق'
          : 'نوّع الصعوبة: 30% سهل، 40% متوسط، 30% صعب';

    const prompt = `أنت خبير في إعداد امتحانات الثانوية العامة المصرية لمادة "${subjectName}".

المطلوب: أنشئ ${count} سؤال اختيار من متعدد (MCQ) بناءً على المحتوى التالي.

${difficultyInstruction}

قواعد صارمة:
1. كل سؤال له 4 خيارات بالظبط
2. الإجابة الصحيحة = رقم الخيار (0-3)
3. كل سؤال يجب أن يكون واضح ومحدد
4. أضف تفسير قصير (جملة أو اثنين) لكل إجابة
5. الأسئلة يجب أن تختبر الفهم مش الحفظ
6. لا تكرر أفكار الأسئلة
7. اكتب بالعربية الفصحى البسيطة
8. نوّع أنماط الأسئلة: (تعريف، مقارنة، تطبيق، تحليل، استنتاج، ترتيب)

المحتوى:
${contextText.substring(0, 25000)}

أرجع JSON array فقط بدون أي نص آخر:
[{
  "question_ar": "نص السؤال",
  "options": ["خيار أ", "خيار ب", "خيار ج", "خيار د"],
  "correct_answer": 0,
  "explanation_ar": "التفسير",
  "difficulty": "easy|medium|hard",
  "type": "mcq"
}]`;

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model,
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';

    // Parse JSON from response
    let questions: any[] = [];
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      }
    } catch {
      return NextResponse.json({ error: 'فشل في معالجة أسئلة AI' }, { status: 500 });
    }

    if (!questions.length) {
      return NextResponse.json({ error: 'لم يتم توليد أسئلة' }, { status: 500 });
    }

    // Format questions for frontend
    const formatted = questions.map((q: any, i: number) => ({
      id: `ai-${Date.now()}-${i}`,
      question_text: q.question_ar || '',
      type: 'mcq',
      options: Array.isArray(q.options) ? q.options : ['أ', 'ب', 'ج', 'د'],
      correct_answer: typeof q.correct_answer === 'number' ? String(q.correct_answer) : '0',
      explanation: q.explanation_ar || '',
      difficulty: q.difficulty || 'medium',
      is_ai_generated: true,
    }));

    // Log cost
    try {
      const inputTokens = response.usage?.input_tokens || 0;
      const outputTokens = response.usage?.output_tokens || 0;
      await supabase.rpc('log_ai_chat_cost', {
        p_user_id: authResult.data.id,
        p_input_tokens: inputTokens,
        p_output_tokens: outputTokens,
        p_model: model,
      });
    } catch { /* ignore */ }

    return NextResponse.json({
      success: true,
      questions: formatted,
      ai_generated: true,
      count: formatted.length,
    });
  } catch (error: any) {
    console.error('[AI Exam Generate] Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في توليد الامتحان' }, { status: 500 });
  }
}
