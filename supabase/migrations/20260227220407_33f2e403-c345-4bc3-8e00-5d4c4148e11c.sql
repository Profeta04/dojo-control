
-- 1. Unique constraint on attendance to prevent duplicate check-ins
ALTER TABLE public.attendance ADD CONSTRAINT unique_attendance_student_class_date UNIQUE (student_id, class_id, date);

-- 2. Unique constraint on push_subscriptions
ALTER TABLE public.push_subscriptions ADD CONSTRAINT unique_push_subscription UNIQUE (user_id, endpoint);

-- 3. Composite indexes for frequent queries
CREATE INDEX IF NOT EXISTS idx_payments_student_ref_month ON public.payments (student_id, reference_month);
CREATE INDEX IF NOT EXISTS idx_payments_status_due_date ON public.payments (status, due_date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance (student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON public.attendance (class_id, date);
CREATE INDEX IF NOT EXISTS idx_class_students_class ON public.class_students (class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student ON public.class_students (student_id);
CREATE INDEX IF NOT EXISTS idx_profiles_dojo_status ON public.profiles (dojo_id, registration_status);

-- 4. Restrict student payment UPDATE to only receipt-related fields
-- Drop the overly permissive policy and create a restricted one
DROP POLICY IF EXISTS "Students can update own payment receipt" ON public.payments;

CREATE POLICY "Students can update own payment receipt"
ON public.payments
FOR UPDATE
USING (student_id = auth.uid())
WITH CHECK (
  student_id = auth.uid()
  AND amount = (SELECT p.amount FROM public.payments p WHERE p.id = payments.id)
  AND status = (SELECT p.status FROM public.payments p WHERE p.id = payments.id)
  AND due_date = (SELECT p.due_date FROM public.payments p WHERE p.id = payments.id)
  AND category = (SELECT p.category FROM public.payments p WHERE p.id = payments.id)
);
