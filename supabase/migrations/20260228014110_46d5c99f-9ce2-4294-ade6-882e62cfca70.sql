
-- 1. Add UNIQUE constraint on attendance to prevent duplicate check-ins
ALTER TABLE public.attendance
ADD CONSTRAINT attendance_student_class_date_unique 
UNIQUE (student_id, class_id, date);

-- 2. Add missing composite indexes for performance at scale
CREATE INDEX IF NOT EXISTS idx_payments_student_status ON public.payments (student_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_reference_month ON public.payments (reference_month);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON public.attendance (class_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance (student_id, date);
CREATE INDEX IF NOT EXISTS idx_profiles_dojo_status ON public.profiles (dojo_id, registration_status);
CREATE INDEX IF NOT EXISTS idx_class_students_student ON public.class_students (student_id);
CREATE INDEX IF NOT EXISTS idx_class_students_class ON public.class_students (class_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_status ON public.tasks (assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_student_belts_user ON public.student_belts (user_id, martial_art);
CREATE INDEX IF NOT EXISTS idx_graduation_history_student ON public.graduation_history (student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, read);
CREATE INDEX IF NOT EXISTS idx_student_xp_user ON public.student_xp (user_id);
CREATE INDEX IF NOT EXISTS idx_season_xp_season_user ON public.season_xp (season_id, user_id);
