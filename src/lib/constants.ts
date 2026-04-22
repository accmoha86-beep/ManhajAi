// =============================================================================
// Manhaj AI — Application Constants
// =============================================================================

/**
 * Egyptian Governorates (المحافظات)
 */
export const GOVERNORATES = [
  'القاهرة',
  'الجيزة',
  'الإسكندرية',
  'الدقهلية',
  'البحر الأحمر',
  'البحيرة',
  'الفيوم',
  'الغربية',
  'الإسماعيلية',
  'المنوفية',
  'المنيا',
  'القليوبية',
  'الوادي الجديد',
  'السويس',
  'أسوان',
  'أسيوط',
  'بني سويف',
  'بورسعيد',
  'دمياط',
  'الشرقية',
  'جنوب سيناء',
  'كفر الشيخ',
  'مطروح',
  'الأقصر',
  'قنا',
  'شمال سيناء',
  'سوهاج',
] as const;

export type Governorate = (typeof GOVERNORATES)[number];

/**
 * Grade levels
 */
export const GRADE_LEVELS = {
  '3sec': 'الصف الثالث الثانوي',
  '2sec': 'الصف الثاني الثانوي',
  '1sec': 'الصف الأول الثانوي',
} as const;

export type GradeSlug = keyof typeof GRADE_LEVELS;

/**
 * Question types
 */
export const QUESTION_TYPES = {
  mcq: 'اختيار من متعدد',
  true_false: 'صح وخطأ',
  essay: 'مقالي',
} as const;

/**
 * Difficulty levels
 */
export const DIFFICULTY_LEVELS = {
  easy: 'سهل',
  medium: 'متوسط',
  hard: 'صعب',
} as const;

/**
 * Subscription statuses
 */
export const SUBSCRIPTION_STATUSES = {
  trial: 'تجربة مجانية',
  active: 'نشط',
  expired: 'منتهي',
  cancelled: 'ملغي',
} as const;

/**
 * Billing periods
 */
export const BILLING_PERIODS = {
  monthly: 'شهري',
  term: 'ترم (6 أشهر)',
  annual: 'سنوي',
} as const;

/**
 * Payment methods
 */
export const PAYMENT_METHODS = {
  stripe: 'بطاقة ائتمان',
  paymob_vodafone: 'فودافون كاش',
  paymob_fawry: 'فوري',
  paymob_instapay: 'إنستا باي',
} as const;

/**
 * Payment statuses
 */
export const PAYMENT_STATUSES = {
  pending: 'قيد الانتظار',
  completed: 'مكتمل',
  failed: 'فشل',
  refunded: 'مسترد',
} as const;

/**
 * Notification types
 */
export const NOTIFICATION_TYPES = {
  announcement: 'إعلان',
  discount: 'خصم',
  new_content: 'محتوى جديد',
  reminder: 'تذكير',
} as const;

/**
 * Notification audience
 */
export const NOTIFICATION_AUDIENCES = {
  all: 'الجميع',
  subject: 'مادة معينة',
  governorate: 'محافظة معينة',
  expiring: 'اشتراكات منتهية قريباً',
  trial: 'فترة تجربة',
  inactive: 'غير نشطين',
} as const;

/**
 * App-wide limits and defaults
 */
export const APP_DEFAULTS = {
  FREE_TRIAL_DAYS: 2,
  CHAT_DAILY_LIMIT: 50,
  CHAT_MONTHLY_LIMIT: 1000,
  MAX_CHAT_MESSAGE_LENGTH: 2000,
  DEFAULT_EXAM_QUESTIONS: 20,
  MIN_EXAM_QUESTIONS: 5,
  MAX_EXAM_QUESTIONS: 50,
  PASSWORD_MIN_LENGTH: 6,
  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: 5,
  REFERRAL_CODE_LENGTH: 8,
  ITEMS_PER_PAGE: 20,
  MAX_FILE_SIZE_MB: 10,
} as const;

/**
 * Egyptian phone regex (01x-xxxx-xxxx)
 */
export const EGYPTIAN_PHONE_REGEX = /^01[0125]\d{8}$/;

/**
 * Theme slugs
 */
export const THEME_SLUGS = [
  'classic-blue',
  'emerald-green',
  'dark-night',
  'warm-orange',
  'elegant-rose',
] as const;

export type ThemeSlug = (typeof THEME_SLUGS)[number];

/**
 * Routes
 */
export const ROUTES = {
  // Public
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY: '/verify',
  PRICING: '/pricing',

  // Student
  DASHBOARD: '/dashboard',
  SUBJECTS: '/subjects',
  SUBJECT: (id: string) => `/subjects/${id}`,
  LESSON: (subjectId: string, lessonId: string) =>
    `/subjects/${subjectId}/lessons/${lessonId}`,
  EXAM: (subjectId: string) => `/subjects/${subjectId}/exam`,
  EXAM_RESULT: (id: string) => `/exam-results/${id}`,
  CHAT: '/chat',
  LEADERBOARD: '/leaderboard',
  PROFILE: '/profile',
  SUBSCRIPTION: '/subscription',

  // Admin
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_SUBJECTS: '/admin/subjects',
  ADMIN_LESSONS: '/admin/lessons',
  ADMIN_QUESTIONS: '/admin/questions',
  ADMIN_SUBSCRIPTIONS: '/admin/subscriptions',
  ADMIN_PAYMENTS: '/admin/payments',
  ADMIN_NOTIFICATIONS: '/admin/notifications',
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_THEMES: '/admin/themes',
  ADMIN_COUPONS: '/admin/coupons',
  ADMIN_ANALYTICS: '/admin/analytics',

  // API
  API_AUTH_LOGIN: '/api/auth/login',
  API_AUTH_REGISTER: '/api/auth/register',
  API_AUTH_VERIFY: '/api/auth/verify',
  API_AUTH_REFRESH: '/api/auth/refresh',
  API_CHAT: '/api/chat',
  API_EXAM: '/api/exam',
  API_HEALTH: '/api/health',
} as const;

/**
 * Leaderboard point values
 */
export const POINTS = {
  EXAM_COMPLETED: 10,
  PERFECT_SCORE: 25,
  DAILY_STREAK: 5,
  FIRST_LOGIN: 2,
  REFERRAL: 50,
} as const;

/**
 * AI configuration
 */
export const AI_CONFIG = {
  MODEL: 'claude-sonnet-4-20250514',
  MAX_TOKENS: 4096,
  TEMPERATURE: 0.3,
  SUMMARY_SYSTEM_PROMPT: `أنت مساعد تعليمي متخصص في المنهج المصري. قم بتلخيص المحتوى التالي بشكل منظم ومفيد للطالب.`,
  CHAT_SYSTEM_PROMPT: `أنت مساعد تعليمي ذكي اسمه "منهج AI". تساعد طلاب الثانوية العامة المصرية في فهم دروسهم. أجب باللغة العربية دائماً وبأسلوب بسيط ومفهوم.`,
  QUESTION_SYSTEM_PROMPT: `أنت مساعد تعليمي متخصص في إنشاء أسئلة امتحانية للمنهج المصري. أنشئ أسئلة متنوعة وشاملة.`,
} as const;
