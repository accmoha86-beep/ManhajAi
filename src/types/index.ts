// =============================================================================
// Manhaj AI — Zod Schemas & TypeScript Types
// =============================================================================

import { z } from 'zod';

// =============================================================================
// ENUMS
// =============================================================================

export const UserRole = z.enum(['student', 'admin']);
export const GradeLevel = z.enum(['3sec', '2sec', '1sec']);
export const QuestionType = z.enum(['mcq', 'true_false', 'essay']);
export const Difficulty = z.enum(['easy', 'medium', 'hard']);
export const SubscriptionStatus = z.enum(['trial', 'active', 'expired', 'cancelled']);
export const BillingPeriod = z.enum(['monthly', 'term', 'annual']);
export const PaymentStatus = z.enum(['pending', 'completed', 'failed', 'refunded']);
export const PaymentMethod = z.enum(['stripe', 'paymob_vodafone', 'paymob_fawry', 'paymob_instapay']);
export const ChatRole = z.enum(['user', 'assistant']);
export const NotificationType = z.enum(['announcement', 'discount', 'new_content', 'reminder']);
export const NotificationAudience = z.enum(['all', 'subject', 'governorate', 'expiring', 'trial', 'inactive']);
export const NotificationChannel = z.enum(['whatsapp', 'site', 'both']);
export const DownloadType = z.enum(['summary', 'questions']);

// =============================================================================
// TABLE SCHEMAS
// =============================================================================

// 1. Users
export const userSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().min(2, 'الاسم مطلوب'),
  phone: z.string().regex(/^01[0125]\d{8}$/, 'رقم الهاتف غير صحيح'),
  password_hash: z.string(),
  role: UserRole.default('student'),
  governorate: z.string().nullable(),
  grade_level: GradeLevel.default('3sec'),
  avatar_url: z.string().url().nullable(),
  referral_code: z.string().nullable(),
  referred_by: z.string().uuid().nullable(),
  is_verified: z.boolean().default(false),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type User = z.infer<typeof userSchema>;

// Public user (no sensitive fields)
export const publicUserSchema = userSchema.omit({
  password_hash: true,
});

export type PublicUser = z.infer<typeof publicUserSchema>;

// 2. Grades
export const gradeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string(),
  is_published: z.boolean().default(false),
  has_terms: z.boolean().default(false),
  term1_published: z.boolean().default(false),
  term2_published: z.boolean().default(false),
  sort_order: z.number().int().default(0),
  created_at: z.string().datetime(),
});

export type Grade = z.infer<typeof gradeSchema>;

// 3. Subjects
export const subjectSchema = z.object({
  id: z.string().uuid(),
  grade_id: z.string().uuid(),
  name: z.string().min(1),
  icon: z.string().nullable(),
  description: z.string().nullable(),
  is_published: z.boolean().default(false),
  sort_order: z.number().int().default(0),
  created_at: z.string().datetime(),
});

export type Subject = z.infer<typeof subjectSchema>;

// 4. Lessons
export const lessonSchema = z.object({
  id: z.string().uuid(),
  subject_id: z.string().uuid(),
  title: z.string().min(1),
  sort_order: z.number().int().default(0),
  is_published: z.boolean().default(false),
  created_at: z.string().datetime(),
});

export type Lesson = z.infer<typeof lessonSchema>;

// 5. Summaries
export const summaryContentSchema = z.object({
  key_points: z.array(z.string()),
  definitions: z.array(z.object({
    term: z.string(),
    definition: z.string(),
  })),
  laws: z.array(z.object({
    name: z.string(),
    formula: z.string().optional(),
    description: z.string(),
  })).optional(),
  examples: z.array(z.object({
    title: z.string(),
    content: z.string(),
  })).optional(),
});

export type SummaryContent = z.infer<typeof summaryContentSchema>;

export const summarySchema = z.object({
  id: z.string().uuid(),
  lesson_id: z.string().uuid(),
  content: summaryContentSchema,
  source_pdf_url: z.string().url().nullable(),
  ai_model: z.string().default('claude-sonnet'),
  generation_cost: z.number().default(0),
  is_published: z.boolean().default(false),
  created_at: z.string().datetime(),
});

export type Summary = z.infer<typeof summarySchema>;

// 6. Questions
export const mcqOptionSchema = z.object({
  text: z.string(),
  is_correct: z.boolean(),
});

export type MCQOption = z.infer<typeof mcqOptionSchema>;

export const questionSchema = z.object({
  id: z.string().uuid(),
  lesson_id: z.string().uuid(),
  type: QuestionType,
  question_text: z.string().min(1),
  options: z.array(mcqOptionSchema).nullable(),
  correct_answer: z.string().nullable(),
  explanation: z.string().nullable(),
  difficulty: Difficulty.default('medium'),
  is_published: z.boolean().default(false),
  created_at: z.string().datetime(),
});

export type Question = z.infer<typeof questionSchema>;

// 7. Subscription Plans
export const planFeatureSchema = z.object({
  text: z.string(),
  included: z.boolean(),
});

export type PlanFeature = z.infer<typeof planFeatureSchema>;

export const subscriptionPlanSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  price_monthly: z.number().nullable(),
  price_term: z.number().nullable(),
  price_annual: z.number().nullable(),
  max_subjects: z.number().int().nullable(),
  features: z.array(planFeatureSchema).nullable(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
  created_at: z.string().datetime(),
});

export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;

// 8. Subscriptions
export const subscriptionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  status: SubscriptionStatus.default('trial'),
  billing_period: BillingPeriod.nullable(),
  trial_ends_at: z.string().datetime().nullable(),
  current_period_start: z.string().datetime().nullable(),
  current_period_end: z.string().datetime().nullable(),
  payment_method: z.string().nullable(),
  stripe_subscription_id: z.string().nullable(),
  paymob_order_id: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Subscription = z.infer<typeof subscriptionSchema>;

// 9. Subscription Subjects
export const subscriptionSubjectSchema = z.object({
  id: z.string().uuid(),
  subscription_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  created_at: z.string().datetime(),
});

export type SubscriptionSubject = z.infer<typeof subscriptionSubjectSchema>;

// 10. Payments
export const paymentSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  subscription_id: z.string().uuid().nullable(),
  amount: z.number(),
  currency: z.string().default('EGP'),
  status: PaymentStatus.default('pending'),
  payment_method: z.string(),
  stripe_payment_id: z.string().nullable(),
  paymob_transaction_id: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  created_at: z.string().datetime(),
});

export type Payment = z.infer<typeof paymentSchema>;

// 11. Exam Results
export const examAnswerSchema = z.object({
  question_id: z.string().uuid(),
  selected: z.string(),
  is_correct: z.boolean(),
});

export type ExamAnswer = z.infer<typeof examAnswerSchema>;

export const examResultSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  lesson_id: z.string().uuid().nullable(),
  score: z.number(),
  total_questions: z.number().int(),
  correct_answers: z.number().int(),
  time_taken_seconds: z.number().int().nullable(),
  answers: z.array(examAnswerSchema).nullable(),
  created_at: z.string().datetime(),
});

export type ExamResult = z.infer<typeof examResultSchema>;

// 12. Chat Messages
export const chatMessageSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  subject_id: z.string().uuid().nullable(),
  role: ChatRole,
  content: z.string().min(1),
  tokens_used: z.number().int().default(0),
  cost: z.number().default(0),
  created_at: z.string().datetime(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

// 13. Chat Limits
export const chatLimitSchema = z.object({
  id: z.string().uuid(),
  daily_limit: z.number().int().default(50),
  monthly_limit: z.number().int().default(1000),
  updated_at: z.string().datetime(),
});

export type ChatLimit = z.infer<typeof chatLimitSchema>;

// 14. Downloads Log
export const downloadLogSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  lesson_id: z.string().uuid(),
  download_type: DownloadType,
  watermark_data: z.object({
    name: z.string(),
    phone: z.string(),
    date: z.string(),
  }).nullable(),
  created_at: z.string().datetime(),
});

export type DownloadLog = z.infer<typeof downloadLogSchema>;

// 15. Notifications
export const notificationSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  body: z.string().min(1),
  type: NotificationType,
  audience: NotificationAudience,
  audience_filter: z.record(z.unknown()).nullable(),
  channel: NotificationChannel.default('both'),
  scheduled_at: z.string().datetime().nullable(),
  sent_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
});

export type Notification = z.infer<typeof notificationSchema>;

// 16. User Notifications
export const userNotificationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  notification_id: z.string().uuid(),
  is_read: z.boolean().default(false),
  created_at: z.string().datetime(),
});

export type UserNotification = z.infer<typeof userNotificationSchema>;

// 17. Site Settings
export const siteSettingSchema = z.object({
  key: z.string(),
  value: z.unknown(),
  updated_at: z.string().datetime(),
});

export type SiteSetting = z.infer<typeof siteSettingSchema>;

// 18. Themes
export const themeVariablesSchema = z.object({
  '--color-primary': z.string(),
  '--color-primary-light': z.string(),
  '--color-primary-dark': z.string(),
  '--color-secondary': z.string(),
  '--color-accent': z.string(),
  '--color-bg': z.string(),
  '--color-bg-card': z.string(),
  '--color-bg-sidebar': z.string(),
  '--color-text': z.string(),
  '--color-text-secondary': z.string(),
  '--color-border': z.string(),
  '--color-success': z.string(),
  '--color-error': z.string(),
  '--color-warning': z.string(),
  '--gradient-primary': z.string(),
  '--gradient-hero': z.string(),
});

export type ThemeVariables = z.infer<typeof themeVariablesSchema>;

export const themeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string(),
  variables: themeVariablesSchema,
  is_active: z.boolean().default(false),
  schedule_start: z.string().datetime().nullable(),
  schedule_end: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
});

export type Theme = z.infer<typeof themeSchema>;

// 19. Coupons
export const couponSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1),
  discount_percent: z.number().int().min(1).max(100).nullable(),
  discount_amount: z.number().nullable(),
  max_uses: z.number().int().nullable(),
  used_count: z.number().int().default(0),
  valid_from: z.string().datetime().nullable(),
  valid_until: z.string().datetime().nullable(),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime(),
});

export type Coupon = z.infer<typeof couponSchema>;

// 20. Leaderboard Scores
export const leaderboardScoreSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  points: z.number().int().default(0),
  streak_days: z.number().int().default(0),
  last_activity: z.string().datetime().nullable(),
  updated_at: z.string().datetime(),
});

export type LeaderboardScore = z.infer<typeof leaderboardScoreSchema>;

// =============================================================================
// API REQUEST SCHEMAS
// =============================================================================

// Auth
export const loginRequestSchema = z.object({
  phone: z.string().regex(/^01[0125]\d{8}$/, 'رقم الهاتف غير صحيح'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const registerRequestSchema = z.object({
  full_name: z.string().min(2, 'الاسم مطلوب').max(100),
  phone: z.string().regex(/^01[0125]\d{8}$/, 'رقم الهاتف غير صحيح'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  governorate: z.string().min(1, 'المحافظة مطلوبة'),
  grade_level: GradeLevel.default('3sec'),
  referral_code: z.string().optional(),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const otpVerifyRequestSchema = z.object({
  phone: z.string().regex(/^01[0125]\d{8}$/, 'رقم الهاتف غير صحيح'),
  otp: z.string().length(6, 'كود التفعيل يجب أن يكون 6 أرقام'),
});

export type OTPVerifyRequest = z.infer<typeof otpVerifyRequestSchema>;

export const otpSendRequestSchema = z.object({
  phone: z.string().regex(/^01[0125]\d{8}$/, 'رقم الهاتف غير صحيح'),
});

export type OTPSendRequest = z.infer<typeof otpSendRequestSchema>;

// Exams
export const createExamRequestSchema = z.object({
  subject_id: z.string().uuid(),
  lesson_id: z.string().uuid().optional(),
  question_count: z.number().int().min(5).max(50).default(20),
  difficulty: Difficulty.optional(),
  types: z.array(QuestionType).optional(),
});

export type CreateExamRequest = z.infer<typeof createExamRequestSchema>;

export const submitExamRequestSchema = z.object({
  subject_id: z.string().uuid(),
  lesson_id: z.string().uuid().optional(),
  answers: z.array(z.object({
    question_id: z.string().uuid(),
    selected: z.string(),
  })),
  time_taken_seconds: z.number().int(),
});

export type SubmitExamRequest = z.infer<typeof submitExamRequestSchema>;

// Chat
export const chatRequestSchema = z.object({
  message: z.string().min(1, 'الرسالة مطلوبة').max(2000),
  subject_id: z.string().uuid().optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

// Subscriptions
export const subscribeRequestSchema = z.object({
  plan_id: z.string().uuid(),
  billing_period: BillingPeriod,
  payment_method: PaymentMethod,
  subject_ids: z.array(z.string().uuid()).optional(),
  coupon_code: z.string().optional(),
});

export type SubscribeRequest = z.infer<typeof subscribeRequestSchema>;

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthResponse {
  user: PublicUser;
  token: string;
  refresh_token: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ExamResponse {
  questions: Question[];
  total: number;
  time_limit_seconds: number;
}

export interface ExamResultResponse {
  result: ExamResult;
  rank?: number;
  percentile?: number;
}

export interface ChatResponse {
  message: ChatMessage;
  remaining_daily: number;
  remaining_monthly: number;
}

export interface DashboardStats {
  total_users: number;
  active_subscriptions: number;
  monthly_revenue: number;
  total_exams_taken: number;
  chat_messages_today: number;
  ai_cost_today: number;
}

export interface StudentDashboard {
  subscription: Subscription | null;
  recent_exams: ExamResult[];
  leaderboard_rank: number;
  streak_days: number;
  points: number;
  unread_notifications: number;
}

// =============================================================================
// JOINED / ENRICHED TYPES
// =============================================================================

export interface SubjectWithLessons extends Subject {
  lessons: Lesson[];
  grade: Grade;
}

export interface LessonWithContent extends Lesson {
  summary: Summary | null;
  question_count: number;
}

export interface SubscriptionWithPlan extends Subscription {
  plan: SubscriptionPlan;
  subjects: Subject[];
}

export interface LeaderboardEntry extends LeaderboardScore {
  user: Pick<PublicUser, 'id' | 'full_name' | 'avatar_url' | 'governorate'>;
  rank: number;
}

export interface NotificationWithStatus extends Notification {
  is_read: boolean;
}
