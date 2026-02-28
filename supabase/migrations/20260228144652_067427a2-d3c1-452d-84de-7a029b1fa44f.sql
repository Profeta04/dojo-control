
-- ═══════════════════════════════════════════════════════════════
-- Performance & Integrity Indices for SaaS scale
-- ═══════════════════════════════════════════════════════════════

-- Payments: prevent duplicate mensalidades for same student+month+plan
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_unique_mensalidade
  ON payments (student_id, reference_month, description)
  WHERE category = 'mensalidade' AND reference_month IS NOT NULL;

-- Dojo subscriptions: prevent duplicate active subscriptions per dojo
CREATE UNIQUE INDEX IF NOT EXISTS idx_dojo_subscriptions_active_unique
  ON dojo_subscriptions (dojo_id)
  WHERE status = 'ativo';

-- Subscription promotions: unique coupon codes
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_promotions_unique_code
  ON subscription_promotions (code)
  WHERE code IS NOT NULL AND is_active = true;

-- Student belts: unique per user+martial_art
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_belts_unique_user_art
  ON student_belts (user_id, martial_art);

-- Leaderboard history: prevent duplicate annual entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_history_unique
  ON leaderboard_history (user_id, dojo_id, year);

-- Season rewards: unique composite for upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_season_rewards_unique
  ON season_rewards (user_id, season_id, reward_type);

-- Performance indices for common queries
CREATE INDEX IF NOT EXISTS idx_payments_status_due ON payments (status, due_date);
CREATE INDEX IF NOT EXISTS idx_payments_student_month ON payments (student_id, reference_month);
CREATE INDEX IF NOT EXISTS idx_class_students_class ON class_students (class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student ON class_students (student_id);
CREATE INDEX IF NOT EXISTS idx_class_schedule_date ON class_schedule (date, is_cancelled);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications (user_id, read);
CREATE INDEX IF NOT EXISTS idx_dojo_senseis_dojo ON dojo_senseis (dojo_id);
CREATE INDEX IF NOT EXISTS idx_dojo_senseis_sensei ON dojo_senseis (sensei_id);
CREATE INDEX IF NOT EXISTS idx_profiles_dojo_status ON profiles (dojo_id, registration_status);
CREATE INDEX IF NOT EXISTS idx_student_xp_user ON student_xp (user_id);
CREATE INDEX IF NOT EXISTS idx_season_xp_season ON season_xp (season_id, total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks (assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_dojo_subscriptions_dojo_status ON dojo_subscriptions (dojo_id, status);

-- Financial integrity: ensure payment amounts are positive
ALTER TABLE payments ADD CONSTRAINT chk_payments_amount_positive CHECK (amount > 0);

-- Ensure fee plan amounts are positive
ALTER TABLE monthly_fee_plans ADD CONSTRAINT chk_fee_plan_amount_positive CHECK (amount > 0);
