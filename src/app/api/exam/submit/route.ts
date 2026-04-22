// app/api/exam/submit/route.ts — Submit and grade an exam
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { gradeExam, calculatePoints, updateStreak } from '@/domain/exam';
import { getAuthUser } from '@/lib/auth';

const SubmitExamSchema = z.object({
  subjectId: z.string().uuid('معرف المادة غير صالح'),
  lessonId: z.string().uuid('معرف الدرس غير صالح').optional(),
  answers: z
    .array(
      z.object({
        questionId: z.string(),
        selected: z.string(),
      })
    )
    .min(1, 'يجب الإجابة على سؤال واحد على الأقل'),
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
    const parsed = SubmitExamSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'بيانات غير صالحة' },
        { status: 400 }
      );
    }

    const { subjectId, lessonId, answers } = parsed.data;
    const supabase = await createServerSupabaseClient();

    // Fetch the questions for grading
    const questionIds = answers.map((a) => a.questionId);
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, correct_answer, difficulty, type')
      .in('id', questionIds);

    if (questionsError || !questions?.length) {
      return NextResponse.json(
        { error: 'فشل في تحميل الأسئلة' },
        { status: 400 }
      );
    }

    // Map DB format to domain format
    const domainQuestions = questions.map((q: { id: string; correct_answer: string | null; difficulty: string; type: string }) => ({
      id: q.id,
      correctAnswer: q.correct_answer,
      difficulty: q.difficulty,
      type: q.type,
    }));

    // Grade the exam
    const gradeResult = gradeExam(answers, domainQuestions as any);

    // Determine difficulty (use the most common difficulty among questions)
    const difficultyCount: Record<string, number> = {};
    for (const q of questions) {
      difficultyCount[q.difficulty] = (difficultyCount[q.difficulty] ?? 0) + 1;
    }
    const primaryDifficulty = Object.entries(difficultyCount).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] ?? 'medium';

    // Calculate points
    const points = calculatePoints(
      gradeResult.correct,
      gradeResult.total,
      primaryDifficulty
    );

    // Save exam result
    const { data: examResult, error: saveError } = await supabase
      .from('exam_results')
      .insert({
        user_id: user.id,
        subject_id: subjectId,
        lesson_id: lessonId || null,
        score: gradeResult.score,
        total: gradeResult.total,
        correct: gradeResult.correct,
        percentage: gradeResult.percentage,
        points_earned: points,
        details: gradeResult.details,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (saveError) {
      console.error('[ExamSubmit] Save result failed:', saveError);
      // Don't fail — return the grade even if saving fails
    }

    // Update user's leaderboard points
    const { data: currentProfile } = await supabase
      .from('user_profiles')
      .select('total_points, streak_days, last_activity_at')
      .eq('user_id', user.id)
      .single();

    const newTotalPoints = (currentProfile?.total_points ?? 0) + points;

    // Update activity streak
    const streakResult = updateStreak(
      currentProfile?.last_activity_at
        ? new Date(currentProfile.last_activity_at)
        : null
    );

    const newStreakDays = streakResult.isNewDay
      ? (currentProfile?.streak_days ?? 0) + streakResult.streakDays
      : currentProfile?.streak_days ?? 0;

    await supabase.from('user_profiles').upsert(
      {
        user_id: user.id,
        total_points: newTotalPoints,
        streak_days: newStreakDays,
        last_activity_at: new Date().toISOString(),
        exams_taken: (currentProfile as any)?.exams_taken
          ? (currentProfile as any).exams_taken + 1
          : 1,
      },
      { onConflict: 'user_id' }
    );

    // Update subject-specific leaderboard
    const { data: subjectScore } = await supabase
      .from('leaderboard')
      .select('points')
      .eq('user_id', user.id)
      .eq('subject_id', subjectId)
      .single();

    await supabase.from('leaderboard').upsert(
      {
        user_id: user.id,
        subject_id: subjectId,
        points: (subjectScore?.points ?? 0) + points,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,subject_id' }
    );

    return NextResponse.json({
      examId: examResult?.id,
      result: {
        score: gradeResult.score,
        total: gradeResult.total,
        correct: gradeResult.correct,
        percentage: gradeResult.percentage,
        details: gradeResult.details,
      },
      pointsEarned: points,
      totalPoints: newTotalPoints,
      streak: {
        days: newStreakDays,
        isNewDay: streakResult.isNewDay,
      },
    });
  } catch (error) {
    console.error('[ExamSubmit] Unexpected error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى' },
      { status: 500 }
    );
  }
}
