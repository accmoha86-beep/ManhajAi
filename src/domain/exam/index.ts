// domain/exam/index.ts — Pure business logic for exams and grading
import type { Question } from '@/types';

export interface GradeResult {
  score: number;
  total: number;
  correct: number;
  percentage: number;
  details: {
    questionId: string;
    selected: string;
    correct: string;
    isCorrect: boolean;
  }[];
}

/**
 * Grade an exam by comparing submitted answers against question bank.
 */
export function gradeExam(
  answers: { questionId: string; selected: string }[],
  questions: Question[]
): GradeResult {
  const questionMap = new Map(questions.map((q) => [q.id, q]));
  const details: GradeResult['details'] = [];
  let correct = 0;

  for (const answer of answers) {
    const question = questionMap.get(answer.questionId);
    if (!question) {
      details.push({
        questionId: answer.questionId,
        selected: answer.selected,
        correct: '',
        isCorrect: false,
      });
      continue;
    }

    const isCorrect =
      answer.selected.trim().toLowerCase() ===
      (question.correct_answer ?? '').trim().toLowerCase();

    if (isCorrect) {
      correct++;
    }

    details.push({
      questionId: answer.questionId,
      selected: answer.selected,
      correct: question.correct_answer ?? '',
      isCorrect,
    });
  }

  const total = answers.length;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  const score = correct;

  return { score, total, correct, percentage, details };
}

/**
 * Calculate points earned from an exam based on score, total, and difficulty.
 * Higher difficulty = more points per correct answer.
 */
export function calculatePoints(
  score: number,
  total: number,
  difficulty: string
): number {
  if (total === 0) return 0;

  const difficultyMultiplier: Record<string, number> = {
    easy: 1,
    medium: 1.5,
    hard: 2,
    expert: 3,
  };

  const multiplier = difficultyMultiplier[difficulty.toLowerCase()] ?? 1;
  const percentage = score / total;

  // Base points: 10 per correct answer * difficulty multiplier
  let points = Math.round(score * 10 * multiplier);

  // Bonus for perfect score
  if (percentage === 1) {
    points += Math.round(20 * multiplier);
  }
  // Bonus for 80%+ score
  else if (percentage >= 0.8) {
    points += Math.round(10 * multiplier);
  }

  return points;
}

/**
 * Update a user's activity streak.
 * Returns the new streak count and whether this is a new day.
 */
export function updateStreak(lastActivity: Date | null): {
  streakDays: number;
  isNewDay: boolean;
} {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (!lastActivity) {
    return { streakDays: 1, isNewDay: true };
  }

  const lastDate = new Date(lastActivity);
  const lastDay = new Date(
    lastDate.getFullYear(),
    lastDate.getMonth(),
    lastDate.getDate()
  );

  const diffMs = today.getTime() - lastDay.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Same day — no change
    return { streakDays: 0, isNewDay: false };
  }

  if (diffDays === 1) {
    // Consecutive day — streak continues
    return { streakDays: 1, isNewDay: true };
  }

  // Gap > 1 day — streak resets
  return { streakDays: 1, isNewDay: true };
}
