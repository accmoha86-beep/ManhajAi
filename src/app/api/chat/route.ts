import { NextRequest, NextResponse } from 'next/server';
import { getSecret } from '@/lib/secrets';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🧠 Enhanced System Prompt V2.0
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ENHANCED_SYSTEM_PROMPT = `أنت "منهج" — مدرّس ذكاء اصطناعي متطور من منصة Manhaj AI، أذكى مدرس خصوصي لطلاب الثانوية العامة في مصر. 🎓

━━━ 🧠 شخصيتك ━━━
- بتتكلم بأسلوب شبابي مصري طبيعي (مش رسمي زي الكتب)
- مرح وخفيف الظل بس محترم ومحترف
- محفّز ودايماً بتشجع الطالب — "برافو عليك! 🔥" / "كده تمام!" / "أنت جامد!"
- بتوصّل المعلومة بأبسط طريقة ممكنة
- بتستخدم إيموجي بشكل خفيف ومناسب

━━━ 📚 أسلوبك في التدريس ━━━

1. **الفهم قبل الحفظ**: اشرح "ليه" قبل "إيه" — الطالب لازم يفهم المنطق مش يحفظ وخلاص
2. **التبسيط التدريجي**: ابدأ بالفكرة السهلة → كبّر شوية شوية → وصّل للمعقد
3. **أمثلة من حياة الطالب المصري**:
   - فيزياء: "تخيل إنك راكب ميكروباص وفجأة فرمل — ده قانون نيوتن الأول 🚌"
   - كيمياء: "الأكسدة زي لما الحديد بيصدي في شتا إسكندرية ⛈️"
   - رياضيات: "لو عندك 3 أصحاب وكل واحد معاه 5 جنيه..."
   - أحياء: "DNA زي كود البرمجة بتاع جسمك 🧬"
4. **الأسئلة السقراطية**: أحياناً اسأل الطالب عشان يفكر بنفسه:
   - "طب لو غيرنا القيمة دي، إيه اللي هيحصل في رأيك؟ 🤔"
   - "فاكر لما قلنا إن...؟ طب ده بيأثر إزاي هنا؟"
5. **الخطوات المرقمة**: أي حل لازم يكون في خطوات واضحة
6. **الربط بالمنهج**: اربط كل معلومة بباقي الدروس — "ده هنحتاجه تاني في الباب الرابع"
7. **التلخيص**: في آخر كل شرح طويل:
   "📝 يعني باختصار:
   • النقطة الأولى
   • النقطة التانية"
8. **التكرار الذكي**: لو مش فاهم، اشرح بطريقة مختلفة تماماً
9. **الصبر المطلق**: لو الطالب سأل 10 مرات — اشرح 10 مرات بـ 10 طرق مختلفة بدون زهق

━━━ 🎯 أنماط الردود التلقائية ━━━

اكتشف نية الطالب وتصرف حسبها:

📖 لو عايز شرح ("اشرحلي" / "عايز أفهم" / "إيه معنى"):
→ اشرح بالتفصيل + مثال عملي + تلخيص في الآخر

❓ لو سأل سؤال محدد:
→ جاوب بوضوح → اشرح ليه → اربط بالمنهج

🤔 لو مش فاهم ("مش فاهم" / "مش واضح"):
→ اشرح بطريقة أبسط + مثال حياتي + خطوات بسيطة

📝 لو عايز تمارين ("عايز أتمرن" / "اديني أسئلة" / "امتحني"):
→ سهل → متوسط → صعب (تدريجي) + اشرح الحل بعد كل سؤال

📋 لو عايز تلخيص ("لخصلي" / "أهم النقط" / "مراجعة سريعة"):
→ نقط مرتبة + أهم القوانين والمعادلات

💪 لو محبط ("مش قادر" / "صعب" / "هسقط"):
→ شجعه بقوة + فكّره بقدراته + اديله خطة مذاكرة بسيطة

🧮 لو عايز حل مسألة:
→ خطوات مرقمة + كل خطوة مشروحة + القانون المستخدم + النتيجة

━━━ ⚠️ قواعد مهمة ━━━

1. 📚 متخصص في منهج الثانوية العامة المصري بس — لو حاجة برا المنهج:
   "أنا متخصص في منهج الثانوية العامة يا بطل 😊 لو عندك سؤال في المنهج أنا معاك!"
2. 🚫 لا تعطي إجابات بدون شرح — ساعد الطالب يفهم
3. 🏥 لا تنصح نصائح طبية/نفسية — "ده سؤال مهم بس الأفضل تكلم متخصص 💚"
4. 📏 طول الرد المناسب:
   - سؤال بسيط → 2-3 سطور
   - شرح درس → 10-20 سطر منظم
   - حل مسألة → خطوات بالقدر المطلوب
5. 🌐 دايماً بالعربي — مصطلحات علمية بالإنجليزي لو لازم

━━━ 🎓 خبراتك ━━━
بتدرّس كل مواد ثانوية عامة: رياضيات (تفاضل/تكامل/جبر/هندسة)، فيزياء، كيمياء، أحياء، عربي (نحو/بلاغة/أدب/نصوص)، إنجليزي، فرنساوي، تاريخ، جغرافيا، فلسفة/منطق، علم نفس/اجتماع.

لكل مادة فاهم: المنهج كامل + أنماط الامتحانات + الأخطاء الشائعة + أمثلة وتشبيهات.`;

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, subjectId, userId, conversationHistory = [] } = body;

    if (!message) {
      return NextResponse.json({ error: 'الرسالة مطلوبة' }, { status: 400 });
    }

    // ━━━ Try Python Service first (if configured) ━━━
    if (PYTHON_SERVICE_URL) {
      try {
        const pyResponse = await fetch(`${PYTHON_SERVICE_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            user_id: userId || '',
            subject_id: subjectId || '',
          }),
        });

        if (pyResponse.ok) {
          const pyData = await pyResponse.json();
          if (pyData.success) {
            return NextResponse.json({
              success: true,
              message: pyData.response,
              usage: { model: 'python-enhanced' },
            });
          }
        }
        // If Python service fails, fall through to direct Claude call
        console.warn('Python service failed, falling back to direct Claude');
      } catch {
        console.warn('Python service unreachable, using direct Claude');
      }
    }

    // ━━━ Direct Claude Call (Enhanced) ━━━

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

    // ━━━ Smart RAG: Build rich context ━━━
    let systemPrompt = ENHANCED_SYSTEM_PROMPT;
    let studentContext = '';

    const supabase = await createServerSupabaseClient();

    // 1. Get subject content for RAG
    if (subjectId) {
      try {
        const { data: context } = await supabase.rpc('get_subject_context', {
          p_subject_id: subjectId,
        });

        if (context) {
          const subjectName = context.subject_name || 'المادة';
          
          // Lessons + Summaries
          const lessonsContent = (context.lessons || [])
            .filter((l: any) => l.summary)
            .map((l: any) => `📚 درس: ${l.title}\n${l.summary}`)
            .join('\n\n---\n\n');

          if (lessonsContent) {
            systemPrompt += `\n\n━━━ 📖 المادة الحالية: "${subjectName}" ━━━\n\nمحتوى المنهج الرسمي:\n\n${lessonsContent.slice(0, 12000)}`;
          }
        }

        // Get sample questions for the subject
        const { data: questions } = await supabase
          .from('questions')
          .select('question_ar, options, correct_answer, difficulty, question_type')
          .eq('subject_id', subjectId)
          .limit(10);

        if (questions && questions.length > 0) {
          const qSamples = questions
            .map((q: any, i: number) => {
              let qStr = `سؤال ${i + 1} (${q.difficulty || 'متوسط'}): ${q.question_ar}`;
              if (q.options && Array.isArray(q.options)) {
                const labels = ['أ', 'ب', 'ج', 'د'];
                q.options.forEach((opt: string, j: number) => {
                  qStr += `\n  ${labels[j] || j}) ${opt}`;
                });
              }
              return qStr;
            })
            .join('\n\n');

          systemPrompt += `\n\n━━━ ❓ أمثلة أسئلة من المنهج ━━━\n\n${qSamples}`;
        }
      } catch (err) {
        console.error('RAG context error:', err);
      }
    }

    // 2. Get student profile for personalization
    if (userId) {
      try {
        const { data: student } = await supabase.rpc('get_auth_user', {
          p_user_id: userId,
        });

        if (student) {
          const name = student.full_name || 'طالب';
          const gov = student.governorate || '';
          studentContext = `\n👤 اسم الطالب: ${name}${gov ? ` (${gov})` : ''}`;

          // Get student performance
          const { data: performance } = await supabase
            .from('exam_results')
            .select('score, subject_id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);

          if (performance && performance.length > 0) {
            const avgScore = performance.reduce((s: number, r: any) => s + (r.score || 0), 0) / performance.length;
            studentContext += `\n📊 متوسط درجاته: ${Math.round(avgScore)}%`;
            studentContext += `\n📝 عدد امتحاناته: ${performance.length}`;

            if (avgScore >= 80) {
              studentContext += '\n✅ مستوى ممتاز — تحدّيه بأسئلة متقدمة';
            } else if (avgScore >= 50) {
              studentContext += '\n⚠️ مستوى متوسط — ركّز على الأساسيات مع تمارين';
            } else {
              studentContext += '\n🆘 مستوى يحتاج دعم — بسّط جداً وشجّعه كتير';
            }
          }
        }

        if (studentContext) {
          systemPrompt += `\n\n━━━ 👤 بيانات الطالب ━━━${studentContext}\n\n📌 استخدم اسمه أحياناً عشان يحس إنك بتكلمه شخصياً.`;
        }
      } catch (err) {
        console.error('Student context error:', err);
      }
    }

    // ━━━ Build messages ━━━
    const messages = [
      ...conversationHistory.slice(-10).map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    // ━━━ Call Claude ━━━
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        system: systemPrompt,
        messages,
        temperature: 0.7,
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
    const assistantMessage =
      data.content[0]?.text || 'معلش، مقدرتش أرد دلوقتي. حاول تاني!';

    const inputTokens = data.usage?.input_tokens || 0;
    const outputTokens = data.usage?.output_tokens || 0;

    // ━━━ Save chat messages to DB ━━━
    if (userId && subjectId) {
      try {
        await supabase.from('chat_messages').insert([
          { user_id: userId, subject_id: subjectId, role: 'user', content: message },
          { user_id: userId, subject_id: subjectId, role: 'assistant', content: assistantMessage },
        ]);
      } catch (err) {
        console.error('Failed to save chat messages:', err);
      }
    }

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
