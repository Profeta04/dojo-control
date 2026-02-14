
-- ============================================================
-- HELPER FUNCTIONS (Security Definer to avoid recursion)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'dono')
  )
$$;

CREATE OR REPLACE FUNCTION public.get_sensei_dojo_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT dojo_id FROM public.dojo_senseis WHERE sensei_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.get_user_dojo_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT dojo_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- ============================================================
-- DOJOS
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view dojos" ON public.dojos;
DROP POLICY IF EXISTS "Owners can manage dojos" ON public.dojos;
DROP POLICY IF EXISTS "Senseis can update their dojos" ON public.dojos;

CREATE POLICY "Staff can manage dojos" ON public.dojos FOR ALL
USING (public.is_staff(auth.uid()));

CREATE POLICY "Senseis can view own dojos" ON public.dojos FOR SELECT
USING (id IN (SELECT public.get_sensei_dojo_ids(auth.uid())));

CREATE POLICY "Senseis can update own dojos" ON public.dojos FOR UPDATE
USING (id IN (SELECT public.get_sensei_dojo_ids(auth.uid())));

CREATE POLICY "Users can view own dojo" ON public.dojos FOR SELECT
USING (id = public.get_user_dojo_id(auth.uid()));

-- ============================================================
-- DOJO_OWNERS
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view dojo_owners" ON public.dojo_owners;
DROP POLICY IF EXISTS "Admins can manage dojo_owners" ON public.dojo_owners;

CREATE POLICY "Staff can manage dojo_owners" ON public.dojo_owners FOR ALL
USING (public.is_staff(auth.uid()));

CREATE POLICY "Senseis can view own dojo owners" ON public.dojo_owners FOR SELECT
USING (dojo_id IN (SELECT public.get_sensei_dojo_ids(auth.uid())));

-- ============================================================
-- DOJO_SENSEIS
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view dojo_senseis" ON public.dojo_senseis;
DROP POLICY IF EXISTS "Owners can manage dojo_senseis" ON public.dojo_senseis;

CREATE POLICY "Staff can manage dojo_senseis" ON public.dojo_senseis FOR ALL
USING (public.is_staff(auth.uid()));

CREATE POLICY "Senseis can view own dojo senseis" ON public.dojo_senseis FOR SELECT
USING (dojo_id IN (SELECT public.get_sensei_dojo_ids(auth.uid())));

-- ============================================================
-- DOJO_USERS
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view dojo_users" ON public.dojo_users;
DROP POLICY IF EXISTS "Owners can manage dojo_users" ON public.dojo_users;

CREATE POLICY "Staff can manage dojo_users" ON public.dojo_users FOR ALL
USING (public.is_staff(auth.uid()));

CREATE POLICY "Users can view own dojo_users" ON public.dojo_users FOR SELECT
USING (user_id = auth.uid() OR dojo_id IN (SELECT public.get_sensei_dojo_ids(auth.uid())));

-- ============================================================
-- PROFILES
-- ============================================================
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff can update profiles" ON public.profiles;

CREATE POLICY "Staff can view all profiles" ON public.profiles FOR SELECT
USING (public.is_staff(auth.uid()));

CREATE POLICY "Senseis can view dojo profiles" ON public.profiles FOR SELECT
USING (
  public.has_role(auth.uid(), 'sensei')
  AND dojo_id IN (SELECT public.get_sensei_dojo_ids(auth.uid()))
);

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Guardians can view minor profiles" ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.guardian_minors gm
    WHERE gm.guardian_user_id = auth.uid() AND gm.minor_user_id = profiles.user_id
  )
);

CREATE POLICY "Staff can update all profiles" ON public.profiles FOR UPDATE
USING (public.is_staff(auth.uid()));

CREATE POLICY "Senseis can update dojo profiles" ON public.profiles FOR UPDATE
USING (
  public.has_role(auth.uid(), 'sensei')
  AND dojo_id IN (SELECT public.get_sensei_dojo_ids(auth.uid()))
);

-- ============================================================
-- CLASSES
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view classes" ON public.classes;
DROP POLICY IF EXISTS "Authenticated can manage classes" ON public.classes;

CREATE POLICY "Staff can manage classes" ON public.classes FOR ALL
USING (public.is_staff(auth.uid()));

CREATE POLICY "Senseis can manage own dojo classes" ON public.classes FOR ALL
USING (
  public.has_role(auth.uid(), 'sensei')
  AND dojo_id IN (SELECT public.get_sensei_dojo_ids(auth.uid()))
);

CREATE POLICY "Students can view enrolled classes" ON public.classes FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.class_students cs WHERE cs.class_id = id AND cs.student_id = auth.uid())
);

-- ============================================================
-- ATTENDANCE
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view attendance" ON public.attendance;
DROP POLICY IF EXISTS "Authenticated can manage attendance" ON public.attendance;

CREATE POLICY "Staff can manage attendance" ON public.attendance FOR ALL
USING (public.is_staff(auth.uid()));

CREATE POLICY "Senseis can manage dojo attendance" ON public.attendance FOR ALL
USING (
  public.has_role(auth.uid(), 'sensei')
  AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = attendance.class_id
    AND c.dojo_id IN (SELECT public.get_sensei_dojo_ids(auth.uid()))
  )
);

CREATE POLICY "Students can view own attendance" ON public.attendance FOR SELECT
USING (student_id = auth.uid());

-- ============================================================
-- CLASS_STUDENTS
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view enrollments" ON public.class_students;
DROP POLICY IF EXISTS "Authenticated can manage enrollments" ON public.class_students;

CREATE POLICY "Staff can manage enrollments" ON public.class_students FOR ALL
USING (public.is_staff(auth.uid()));

CREATE POLICY "Senseis can manage dojo enrollments" ON public.class_students FOR ALL
USING (
  public.has_role(auth.uid(), 'sensei')
  AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = class_students.class_id
    AND c.dojo_id IN (SELECT public.get_sensei_dojo_ids(auth.uid()))
  )
);

CREATE POLICY "Students can view own enrollments" ON public.class_students FOR SELECT
USING (student_id = auth.uid());

-- ============================================================
-- CLASS_SCHEDULE
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view schedules" ON public.class_schedule;
DROP POLICY IF EXISTS "Authenticated can manage schedules" ON public.class_schedule;

CREATE POLICY "Staff can manage schedules" ON public.class_schedule FOR ALL
USING (public.is_staff(auth.uid()));

CREATE POLICY "Senseis can manage dojo schedules" ON public.class_schedule FOR ALL
USING (
  public.has_role(auth.uid(), 'sensei')
  AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = class_schedule.class_id
    AND c.dojo_id IN (SELECT public.get_sensei_dojo_ids(auth.uid()))
  )
);

CREATE POLICY "Students can view enrolled schedules" ON public.class_schedule FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.class_students cs
    WHERE cs.class_id = class_schedule.class_id AND cs.student_id = auth.uid()
  )
);

-- ============================================================
-- PAYMENTS
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Students can view own payments" ON public.payments;

CREATE POLICY "Staff can manage payments" ON public.payments FOR ALL
USING (public.is_staff(auth.uid()));

CREATE POLICY "Senseis can view dojo payments" ON public.payments FOR SELECT
USING (
  public.has_role(auth.uid(), 'sensei')
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = payments.student_id
    AND p.dojo_id IN (SELECT public.get_sensei_dojo_ids(auth.uid()))
  )
);

CREATE POLICY "Students can view own payments" ON public.payments FOR SELECT
USING (student_id = auth.uid());

-- ============================================================
-- GRADUATION_HISTORY
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view graduations" ON public.graduation_history;
DROP POLICY IF EXISTS "Admins and senseis can manage graduations" ON public.graduation_history;

CREATE POLICY "Staff can manage graduations" ON public.graduation_history FOR ALL
USING (public.is_staff(auth.uid()));

CREATE POLICY "Senseis can manage dojo graduations" ON public.graduation_history FOR ALL
USING (
  public.has_role(auth.uid(), 'sensei')
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = graduation_history.student_id
    AND p.dojo_id IN (SELECT public.get_sensei_dojo_ids(auth.uid()))
  )
);

CREATE POLICY "Students can view own graduations" ON public.graduation_history FOR SELECT
USING (student_id = auth.uid());
