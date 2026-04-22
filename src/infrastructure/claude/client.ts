// infrastructure/claude/client.ts — Claude AI API client
import Anthropic from '@anthropic-ai/sdk';
import type { Result } from '@/lib/result';
import { ok, err } from '@/lib/result';
import type { Question } from '@/types';
import { buildSummaryPrompt, buildQuestionBankPrompt } from '@/domain/ai';

function getClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });
}

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = 4096;

/**
 * Send a chat message to Claude and return the response.
 */
export async function chat(params: {
  systemPrompt: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  maxTokens?: number;
}): Promise<
  Result<{ content: string; inputTokens: number; outputTokens: number }>
> {
  try {
    const response = await getClient().messages.create({
      model: DEFAULT_MODEL,
      max_tokens: params.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: params.systemPrompt,
      messages: params.messages,
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return err('لم يتم الحصول على رد نصي من الذكاء الاصطناعي');
    }

    return ok({
      content: textBlock.text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        return err(
          'الخدمة مشغولة حاليًا. يرجى المحاولة بعد قليل'
        );
      }
      if (error.status === 401) {
        return err('خطأ في إعدادات الذكاء الاصطناعي. يرجى التواصل مع الدعم');
      }
      return err(`خطأ في خدمة الذكاء الاصطناعي: ${error.message}`);
    }

    const message =
      error instanceof Error ? error.message : 'خطأ غير معروف';
    return err(`فشل الاتصال بالذكاء الاصطناعي: ${message}`);
  }
}

/**
 * Generate a structured lesson summary from PDF text using Claude.
 */
export async function generateSummary(
  lessonTitle: string,
  pdfText: string
): Promise<Result<object>> {
  try {
    const prompt = buildSummaryPrompt(lessonTitle, pdfText);

    const response = await getClient().messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 8192,
      system:
        'أنت مُعلِّم خبير في إعداد الملخصات التعليمية. أجب بصيغة JSON فقط.',
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return err('لم يتم إنشاء الملخص');
    }

    // Parse JSON response — handle possible markdown code fences
    let jsonText = textBlock.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText
        .replace(/^```(?:json)?\n?/, '')
        .replace(/\n?```$/, '');
    }

    const summary = JSON.parse(jsonText);
    return ok(summary);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return err('فشل في تحليل رد الذكاء الاصطناعي. يرجى المحاولة مرة أخرى');
    }

    const message =
      error instanceof Error ? error.message : 'خطأ غير معروف';
    return err(`فشل في إنشاء الملخص: ${message}`);
  }
}

/**
 * Generate a question bank from a lesson summary using Claude.
 */
export async function generateQuestions(
  lessonTitle: string,
  summary: object
): Promise<Result<Question[]>> {
  try {
    const prompt = buildQuestionBankPrompt(lessonTitle, summary);

    const response = await getClient().messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 8192,
      system:
        'أنت خبير في إعداد بنوك الأسئلة. أجب بصيغة JSON فقط.',
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return err('لم يتم إنشاء الأسئلة');
    }

    // Parse JSON response
    let jsonText = textBlock.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText
        .replace(/^```(?:json)?\n?/, '')
        .replace(/\n?```$/, '');
    }

    const bank = JSON.parse(jsonText);

    // Flatten all question types into a single array
    const questions: Question[] = [];

    if (bank.mcq && Array.isArray(bank.mcq)) {
      for (const q of bank.mcq) {
        questions.push({
          ...q,
          type: 'mcq',
          id: crypto.randomUUID(),
        });
      }
    }

    if (bank.trueFalse && Array.isArray(bank.trueFalse)) {
      for (const q of bank.trueFalse) {
        questions.push({
          ...q,
          type: 'true_false',
          id: crypto.randomUUID(),
        });
      }
    }

    if (bank.essay && Array.isArray(bank.essay)) {
      for (const q of bank.essay) {
        questions.push({
          ...q,
          type: 'essay',
          id: crypto.randomUUID(),
        });
      }
    }

    return ok(questions);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return err('فشل في تحليل الأسئلة المُولّدة. يرجى المحاولة مرة أخرى');
    }

    const message =
      error instanceof Error ? error.message : 'خطأ غير معروف';
    return err(`فشل في إنشاء بنك الأسئلة: ${message}`);
  }
}
