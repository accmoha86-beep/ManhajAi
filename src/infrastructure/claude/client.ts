// infrastructure/claude/client.ts — Claude AI API client (Enhanced with batch generation)
import Anthropic from '@anthropic-ai/sdk';
import type { Result } from '@/lib/result';
import { ok, err } from '@/lib/result';
import { getSecret } from '@/lib/secrets';
import {
  buildSummaryPrompt,
  buildQuestionBatchPrompt,
  QUESTION_ROUNDS,
} from '@/domain/ai';
import type { QuestionRound } from '@/domain/ai';

let cachedClient: Anthropic | null = null;
let cachedKeyHash: string | null = null;

async function getClient(): Promise<Anthropic> {
  let apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    apiKey = (await getSecret('anthropic_api_key')) || '';
  }
  if (!apiKey) {
    throw new Error('Anthropic API key not configured');
  }
  const keyHash = apiKey.substring(0, 10);
  if (cachedClient && cachedKeyHash === keyHash) {
    return cachedClient;
  }
  cachedClient = new Anthropic({ apiKey });
  cachedKeyHash = keyHash;
  return cachedClient;
}

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = 4096;

function extractJSON(text: string): string {
  let jsonText = text.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```$/, '');
  }
  return jsonText;
}

/**
 * Send a chat message to Claude and return the response.
 */
export async function chat(params: {
  systemPrompt: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  maxTokens?: number;
}): Promise<Result<{ content: string; inputTokens: number; outputTokens: number }>> {
  try {
    const client = await getClient();
    const response = await client.messages.create({
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
      if (error.status === 429) return err('الخدمة مشغولة حاليًا. يرجى المحاولة بعد قليل');
      if (error.status === 401) return err('خطأ في إعدادات الذكاء الاصطناعي. يرجى التواصل مع الدعم');
      return err(`خطأ في خدمة الذكاء الاصطناعي: ${error.message}`);
    }
    const message = error instanceof Error ? error.message : 'خطأ غير معروف';
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
    const client = await getClient();
    const prompt = buildSummaryPrompt(lessonTitle, pdfText);

    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 8192,
      system: 'أنت مُعلِّم خبير في إعداد الملخصات التعليمية. أجب بصيغة JSON فقط.',
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return err('لم يتم إنشاء الملخص');
    }

    const summary = JSON.parse(extractJSON(textBlock.text));
    return ok(summary);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return err('فشل في تحليل رد الذكاء الاصطناعي. يرجى المحاولة مرة أخرى');
    }
    const message = error instanceof Error ? error.message : 'خطأ غير معروف';
    return err(`فشل في إنشاء الملخص: ${message}`);
  }
}

interface GeneratedQuestion {
  question_ar: string;
  type: 'mcq' | 'true_false' | 'essay';
  options: string[];
  correct_answer: number;
  explanation_ar: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

/**
 * Generate a single batch of questions for a specific round.
 */
export async function generateQuestionBatch(
  lessonTitle: string,
  content: string,
  round: QuestionRound,
  previousQuestions: string[] = []
): Promise<Result<GeneratedQuestion[]>> {
  try {
    const client = await getClient();
    const prompt = buildQuestionBatchPrompt(lessonTitle, content, round, previousQuestions);

    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 8192,
      system: `أنت خبير في إعداد بنوك الأسئلة — الجولة ${round.id}: ${round.name}. أجب بصيغة JSON فقط.`,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return err('لم يتم إنشاء الأسئلة');
    }

    const parsed = JSON.parse(extractJSON(textBlock.text));
    const questions: GeneratedQuestion[] = parsed.questions || [];

    // Validate each question
    const validQuestions = questions.filter(
      (q) =>
        q.question_ar &&
        q.type &&
        Array.isArray(q.options) &&
        typeof q.correct_answer === 'number' &&
        q.explanation_ar
    );

    return ok(validQuestions);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return err('فشل في تحليل الأسئلة المُولّدة. يرجى المحاولة مرة أخرى');
    }
    const message = error instanceof Error ? error.message : 'خطأ غير معروف';
    return err(`فشل في إنشاء دفعة الأسئلة: ${message}`);
  }
}

/**
 * Generate a full question bank with 200+ questions across multiple rounds.
 */
export async function generateFullQuestionBank(
  lessonTitle: string,
  content: string,
  maxRounds: number = 5,
  onProgress?: (round: number, totalRounds: number, questionsGenerated: number) => void
): Promise<Result<GeneratedQuestion[]>> {
  const allQuestions: GeneratedQuestion[] = [];
  const previousQuestionTexts: string[] = [];
  const roundsToRun = QUESTION_ROUNDS.slice(0, maxRounds);

  for (const round of roundsToRun) {
    const batchResult = await generateQuestionBatch(
      lessonTitle,
      content,
      round,
      previousQuestionTexts.slice(-100) // Send last 100 questions for anti-duplication
    );

    if (batchResult.ok) {
      allQuestions.push(...batchResult.data);
      // Track question texts for anti-duplication
      for (const q of batchResult.data) {
        previousQuestionTexts.push(q.question_ar);
      }
    } else {
      console.error(`[QuestionBank] Round ${round.id} failed:`, batchResult.error);
      // Continue with other rounds even if one fails
    }

    if (onProgress) {
      onProgress(round.id, roundsToRun.length, allQuestions.length);
    }

    // Brief delay between rounds to avoid rate limiting
    if (round.id < roundsToRun.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  if (allQuestions.length === 0) {
    return err('فشل في إنشاء أي أسئلة. يرجى المحاولة مرة أخرى');
  }

  return ok(allQuestions);
}

/**
 * Legacy compatibility — generates questions from a summary object.
 */
export async function generateQuestions(
  lessonTitle: string,
  summary: object
): Promise<Result<GeneratedQuestion[]>> {
  const content = JSON.stringify(summary, null, 2);
  return generateQuestionBatch(lessonTitle, content, QUESTION_ROUNDS[0], []);
}
