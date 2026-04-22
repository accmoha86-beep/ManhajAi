-- =============================================================================
-- Manhaj AI — Complete Database Schema
-- Egyptian High School Education Platform
-- =============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- HELPER: updated_at trigger function
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 1. USERS (students + admins)
-- =============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  governorate TEXT,
  grade_level TEXT DEFAULT '3sec' CHECK (grade_level IN ('3sec', '2sec', '1sec')),
  avatar_url TEXT,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_governorate ON users(governorate);
CREATE INDEX idx_users_grade_level ON users(grade_level);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_is_active ON users(is_active);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 2. GRADES
-- =============================================================================
CREATE TABLE grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  is_published BOOLEAN DEFAULT false,
  has_terms BOOLEAN DEFAULT false,
  term1_published BOOLEAN DEFAULT false,
  term2_published BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_grades_slug ON grades(slug);
CREATE INDEX idx_grades_is_published ON grades(is_published);
CREATE INDEX idx_grades_sort_order ON grades(sort_order);

-- =============================================================================
-- 3. SUBJECTS
-- =============================================================================
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grade_id UUID NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  is_published BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subjects_grade_id ON subjects(grade_id);
CREATE INDEX idx_subjects_is_published ON subjects(is_published);
CREATE INDEX idx_subjects_sort_order ON subjects(sort_order);

-- =============================================================================
-- 4. LESSONS
-- =============================================================================
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_lessons_subject_id ON lessons(subject_id);
CREATE INDEX idx_lessons_is_published ON lessons(is_published);
CREATE INDEX idx_lessons_sort_order ON lessons(sort_order);

-- =============================================================================
-- 5. SUMMARIES (AI-generated from PDF)
-- =============================================================================
CREATE TABLE summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  content JSONB NOT NULL, -- {key_points, definitions, laws, examples}
  source_pdf_url TEXT,
  ai_model TEXT DEFAULT 'claude-sonnet',
  generation_cost DECIMAL(10, 4) DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_summaries_lesson_id ON summaries(lesson_id);
CREATE INDEX idx_summaries_is_published ON summaries(is_published);

-- =============================================================================
-- 6. QUESTIONS (AI-generated bank)
-- =============================================================================
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mcq', 'true_false', 'essay')),
  question_text TEXT NOT NULL,
  options JSONB, -- for MCQ: [{text, is_correct}]
  correct_answer TEXT,
  explanation TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_questions_lesson_id ON questions(lesson_id);
CREATE INDEX idx_questions_type ON questions(type);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_is_published ON questions(is_published);

-- =============================================================================
-- 7. SUBSCRIPTION PLANS (admin-managed)
-- =============================================================================
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10, 2),
  price_term DECIMAL(10, 2),
  price_annual DECIMAL(10, 2),
  max_subjects INT, -- null = unlimited
  features JSONB, -- [{text, included: bool}]
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subscription_plans_is_active ON subscription_plans(is_active);
CREATE INDEX idx_subscription_plans_sort_order ON subscription_plans(sort_order);

-- =============================================================================
-- 8. SUBSCRIPTIONS
-- =============================================================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'expired', 'cancelled')),
  billing_period TEXT CHECK (billing_period IN ('monthly', 'term', 'annual')),
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  payment_method TEXT, -- 'stripe','paymob_vodafone','paymob_fawry','paymob_instapay'
  stripe_subscription_id TEXT,
  paymob_order_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_current_period_end ON subscriptions(current_period_end);

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 9. SUBSCRIPTION SUBJECTS
-- =============================================================================
CREATE TABLE subscription_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (subscription_id, subject_id)
);

CREATE INDEX idx_subscription_subjects_subscription_id ON subscription_subjects(subscription_id);
CREATE INDEX idx_subscription_subjects_subject_id ON subscription_subjects(subject_id);

-- =============================================================================
-- 10. PAYMENTS
-- =============================================================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'EGP',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT NOT NULL,
  stripe_payment_id TEXT,
  paymob_transaction_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_payment_method ON payments(payment_method);
CREATE INDEX idx_payments_created_at ON payments(created_at);

-- =============================================================================
-- 11. EXAM RESULTS
-- =============================================================================
CREATE TABLE exam_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL, -- nullable for full subject exam
  score DECIMAL(5, 2),
  total_questions INT NOT NULL,
  correct_answers INT NOT NULL,
  time_taken_seconds INT,
  answers JSONB, -- [{question_id, selected, is_correct}]
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_exam_results_user_id ON exam_results(user_id);
CREATE INDEX idx_exam_results_subject_id ON exam_results(subject_id);
CREATE INDEX idx_exam_results_lesson_id ON exam_results(lesson_id);
CREATE INDEX idx_exam_results_created_at ON exam_results(created_at);

-- =============================================================================
-- 12. CHAT MESSAGES
-- =============================================================================
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tokens_used INT DEFAULT 0,
  cost DECIMAL(10, 6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_subject_id ON chat_messages(subject_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- =============================================================================
-- 13. CHAT LIMITS (admin-configurable, single-row)
-- =============================================================================
CREATE TABLE chat_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_limit INT DEFAULT 50,
  monthly_limit INT DEFAULT 1000,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER chat_limits_updated_at
  BEFORE UPDATE ON chat_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 14. DOWNLOADS LOG
-- =============================================================================
CREATE TABLE downloads_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  download_type TEXT NOT NULL, -- 'summary','questions'
  watermark_data JSONB, -- {name, phone, date}
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_downloads_log_user_id ON downloads_log(user_id);
CREATE INDEX idx_downloads_log_lesson_id ON downloads_log(lesson_id);
CREATE INDEX idx_downloads_log_created_at ON downloads_log(created_at);

-- =============================================================================
-- 15. NOTIFICATIONS
-- =============================================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('announcement', 'discount', 'new_content', 'reminder')),
  audience TEXT NOT NULL CHECK (audience IN ('all', 'subject', 'governorate', 'expiring', 'trial', 'inactive')),
  audience_filter JSONB, -- {subject_id, governorate, etc}
  channel TEXT NOT NULL DEFAULT 'both' CHECK (channel IN ('whatsapp', 'site', 'both')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_scheduled_at ON notifications(scheduled_at);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at);

-- =============================================================================
-- 16. USER NOTIFICATIONS
-- =============================================================================
CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX idx_user_notifications_notification_id ON user_notifications(notification_id);
CREATE INDEX idx_user_notifications_is_read ON user_notifications(is_read);

-- =============================================================================
-- 17. SITE SETTINGS (key-value admin settings)
-- =============================================================================
CREATE TABLE site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 18. THEMES
-- =============================================================================
CREATE TABLE themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  variables JSONB NOT NULL, -- CSS variables
  is_active BOOLEAN DEFAULT false,
  schedule_start TIMESTAMPTZ,
  schedule_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_themes_slug ON themes(slug);
CREATE INDEX idx_themes_is_active ON themes(is_active);

-- =============================================================================
-- 19. COUPONS
-- =============================================================================
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  discount_percent INT,
  discount_amount DECIMAL(10, 2),
  max_uses INT,
  used_count INT DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT coupon_has_discount CHECK (discount_percent IS NOT NULL OR discount_amount IS NOT NULL)
);

CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_is_active ON coupons(is_active);
CREATE INDEX idx_coupons_valid_until ON coupons(valid_until);

-- =============================================================================
-- 20. LEADERBOARD SCORES
-- =============================================================================
CREATE TABLE leaderboard_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INT DEFAULT 0,
  streak_days INT DEFAULT 0,
  last_activity TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX idx_leaderboard_scores_user_id ON leaderboard_scores(user_id);
CREATE INDEX idx_leaderboard_scores_points ON leaderboard_scores(points DESC);
CREATE INDEX idx_leaderboard_scores_streak_days ON leaderboard_scores(streak_days DESC);

CREATE TRIGGER leaderboard_scores_updated_at
  BEFORE UPDATE ON leaderboard_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_scores ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get current user id
CREATE OR REPLACE FUNCTION auth_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- USERS policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can update all users"
  ON users FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  USING (is_admin());

-- Allow service role to insert users (registration)
CREATE POLICY "Service role can insert users"
  ON users FOR INSERT
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- GRADES policies (public read for published, admin full access)
-- -----------------------------------------------------------------------------
CREATE POLICY "Anyone can view published grades"
  ON grades FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can view all grades"
  ON grades FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can manage grades"
  ON grades FOR ALL
  USING (is_admin());

-- -----------------------------------------------------------------------------
-- SUBJECTS policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Anyone can view published subjects"
  ON subjects FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can view all subjects"
  ON subjects FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can manage subjects"
  ON subjects FOR ALL
  USING (is_admin());

-- -----------------------------------------------------------------------------
-- LESSONS policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Anyone can view published lessons"
  ON lessons FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can view all lessons"
  ON lessons FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can manage lessons"
  ON lessons FOR ALL
  USING (is_admin());

-- -----------------------------------------------------------------------------
-- SUMMARIES policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Authenticated users can view published summaries"
  ON summaries FOR SELECT
  USING (is_published = true AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage summaries"
  ON summaries FOR ALL
  USING (is_admin());

-- -----------------------------------------------------------------------------
-- QUESTIONS policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Authenticated users can view published questions"
  ON questions FOR SELECT
  USING (is_published = true AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage questions"
  ON questions FOR ALL
  USING (is_admin());

-- -----------------------------------------------------------------------------
-- SUBSCRIPTION PLANS policies (public read for active)
-- -----------------------------------------------------------------------------
CREATE POLICY "Anyone can view active plans"
  ON subscription_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage plans"
  ON subscription_plans FOR ALL
  USING (is_admin());

-- -----------------------------------------------------------------------------
-- SUBSCRIPTIONS policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage subscriptions"
  ON subscriptions FOR ALL
  USING (is_admin());

CREATE POLICY "Service role can insert subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- SUBSCRIPTION SUBJECTS policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own subscription subjects"
  ON subscription_subjects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE subscriptions.id = subscription_subjects.subscription_id
      AND subscriptions.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage subscription subjects"
  ON subscription_subjects FOR ALL
  USING (is_admin());

-- -----------------------------------------------------------------------------
-- PAYMENTS policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage payments"
  ON payments FOR ALL
  USING (is_admin());

-- -----------------------------------------------------------------------------
-- EXAM RESULTS policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own exam results"
  ON exam_results FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own exam results"
  ON exam_results FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage exam results"
  ON exam_results FOR ALL
  USING (is_admin());

-- -----------------------------------------------------------------------------
-- CHAT MESSAGES policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own chat messages"
  ON chat_messages FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all chat messages"
  ON chat_messages FOR SELECT
  USING (is_admin());

-- -----------------------------------------------------------------------------
-- CHAT LIMITS policies (public read)
-- -----------------------------------------------------------------------------
CREATE POLICY "Anyone can read chat limits"
  ON chat_limits FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage chat limits"
  ON chat_limits FOR ALL
  USING (is_admin());

-- -----------------------------------------------------------------------------
-- DOWNLOADS LOG policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own downloads"
  ON downloads_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own downloads"
  ON downloads_log FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all downloads"
  ON downloads_log FOR ALL
  USING (is_admin());

-- -----------------------------------------------------------------------------
-- NOTIFICATIONS policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Admins can manage notifications"
  ON notifications FOR ALL
  USING (is_admin());

CREATE POLICY "Users can view sent notifications"
  ON notifications FOR SELECT
  USING (sent_at IS NOT NULL AND auth.uid() IS NOT NULL);

-- -----------------------------------------------------------------------------
-- USER NOTIFICATIONS policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own notifications"
  ON user_notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications (mark read)"
  ON user_notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage user notifications"
  ON user_notifications FOR ALL
  USING (is_admin());

-- -----------------------------------------------------------------------------
-- SITE SETTINGS policies (public read, admin write)
-- -----------------------------------------------------------------------------
CREATE POLICY "Anyone can read site settings"
  ON site_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage site settings"
  ON site_settings FOR ALL
  USING (is_admin());

-- -----------------------------------------------------------------------------
-- THEMES policies (public read, admin write)
-- -----------------------------------------------------------------------------
CREATE POLICY "Anyone can read themes"
  ON themes FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage themes"
  ON themes FOR ALL
  USING (is_admin());

-- -----------------------------------------------------------------------------
-- COUPONS policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Authenticated users can view active coupons"
  ON coupons FOR SELECT
  USING (is_active = true AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage coupons"
  ON coupons FOR ALL
  USING (is_admin());

-- -----------------------------------------------------------------------------
-- LEADERBOARD SCORES policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Anyone can view leaderboard"
  ON leaderboard_scores FOR SELECT
  USING (true);

CREATE POLICY "Users can update own score"
  ON leaderboard_scores FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage leaderboard"
  ON leaderboard_scores FOR ALL
  USING (is_admin());

-- =============================================================================
-- DEFAULT DATA INSERTS
-- =============================================================================

-- Default site settings
INSERT INTO site_settings (key, value) VALUES
  ('free_trial_days', '2'::jsonb),
  ('chat_daily_limit', '50'::jsonb),
  ('chat_monthly_limit', '1000'::jsonb),
  ('app_name', '"منهج AI"'::jsonb),
  ('support_phone', '"01000000000"'::jsonb),
  ('support_email', '"support@manhaj-ai.com"'::jsonb),
  ('maintenance_mode', 'false'::jsonb),
  ('watermark_enabled', 'true'::jsonb);

-- Default chat limits
INSERT INTO chat_limits (daily_limit, monthly_limit) VALUES (50, 1000);

-- Default grades
INSERT INTO grades (name, slug, is_published, has_terms, sort_order) VALUES
  ('الصف الثالث الثانوي', '3sec', true, true, 1),
  ('الصف الثاني الثانوي', '2sec', false, true, 2),
  ('الصف الأول الثانوي', '1sec', false, true, 3);

-- Default themes (5 themes)
INSERT INTO themes (name, slug, variables, is_active) VALUES
  (
    'أزرق كلاسيكي',
    'classic-blue',
    '{
      "--color-primary": "#3B82F6",
      "--color-primary-light": "#60A5FA",
      "--color-primary-dark": "#2563EB",
      "--color-secondary": "#8B5CF6",
      "--color-accent": "#F59E0B",
      "--color-bg": "#F8FAFC",
      "--color-bg-card": "#FFFFFF",
      "--color-bg-sidebar": "#1E293B",
      "--color-text": "#1E293B",
      "--color-text-secondary": "#64748B",
      "--color-border": "#E2E8F0",
      "--color-success": "#10B981",
      "--color-error": "#EF4444",
      "--color-warning": "#F59E0B",
      "--gradient-primary": "linear-gradient(135deg, #3B82F6, #8B5CF6)",
      "--gradient-hero": "linear-gradient(135deg, #1E3A8A, #3B82F6)"
    }'::jsonb,
    true
  ),
  (
    'أخضر زمردي',
    'emerald-green',
    '{
      "--color-primary": "#10B981",
      "--color-primary-light": "#34D399",
      "--color-primary-dark": "#059669",
      "--color-secondary": "#06B6D4",
      "--color-accent": "#F59E0B",
      "--color-bg": "#F0FDF4",
      "--color-bg-card": "#FFFFFF",
      "--color-bg-sidebar": "#064E3B",
      "--color-text": "#1E293B",
      "--color-text-secondary": "#64748B",
      "--color-border": "#D1FAE5",
      "--color-success": "#10B981",
      "--color-error": "#EF4444",
      "--color-warning": "#F59E0B",
      "--gradient-primary": "linear-gradient(135deg, #10B981, #06B6D4)",
      "--gradient-hero": "linear-gradient(135deg, #064E3B, #10B981)"
    }'::jsonb,
    false
  ),
  (
    'ليلي داكن',
    'dark-night',
    '{
      "--color-primary": "#8B5CF6",
      "--color-primary-light": "#A78BFA",
      "--color-primary-dark": "#7C3AED",
      "--color-secondary": "#EC4899",
      "--color-accent": "#F59E0B",
      "--color-bg": "#0F172A",
      "--color-bg-card": "#1E293B",
      "--color-bg-sidebar": "#0F172A",
      "--color-text": "#F1F5F9",
      "--color-text-secondary": "#94A3B8",
      "--color-border": "#334155",
      "--color-success": "#10B981",
      "--color-error": "#EF4444",
      "--color-warning": "#F59E0B",
      "--gradient-primary": "linear-gradient(135deg, #8B5CF6, #EC4899)",
      "--gradient-hero": "linear-gradient(135deg, #1E1B4B, #8B5CF6)"
    }'::jsonb,
    false
  ),
  (
    'برتقالي دافئ',
    'warm-orange',
    '{
      "--color-primary": "#F97316",
      "--color-primary-light": "#FB923C",
      "--color-primary-dark": "#EA580C",
      "--color-secondary": "#EF4444",
      "--color-accent": "#FBBF24",
      "--color-bg": "#FFFBEB",
      "--color-bg-card": "#FFFFFF",
      "--color-bg-sidebar": "#7C2D12",
      "--color-text": "#1E293B",
      "--color-text-secondary": "#64748B",
      "--color-border": "#FED7AA",
      "--color-success": "#10B981",
      "--color-error": "#EF4444",
      "--color-warning": "#F59E0B",
      "--gradient-primary": "linear-gradient(135deg, #F97316, #EF4444)",
      "--gradient-hero": "linear-gradient(135deg, #7C2D12, #F97316)"
    }'::jsonb,
    false
  ),
  (
    'وردي أنيق',
    'elegant-rose',
    '{
      "--color-primary": "#EC4899",
      "--color-primary-light": "#F472B6",
      "--color-primary-dark": "#DB2777",
      "--color-secondary": "#8B5CF6",
      "--color-accent": "#F59E0B",
      "--color-bg": "#FDF2F8",
      "--color-bg-card": "#FFFFFF",
      "--color-bg-sidebar": "#831843",
      "--color-text": "#1E293B",
      "--color-text-secondary": "#64748B",
      "--color-border": "#FBCFE8",
      "--color-success": "#10B981",
      "--color-error": "#EF4444",
      "--color-warning": "#F59E0B",
      "--gradient-primary": "linear-gradient(135deg, #EC4899, #8B5CF6)",
      "--gradient-hero": "linear-gradient(135deg, #831843, #EC4899)"
    }'::jsonb,
    false
  );
