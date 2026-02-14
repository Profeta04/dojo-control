
-- Fix class_schedule RLS: drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Authenticated can manage schedules" ON public.class_schedule;
DROP POLICY IF EXISTS "Authenticated can view schedules" ON public.class_schedule;

CREATE POLICY "Authenticated can view schedules"
ON public.class_schedule FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can manage schedules"
ON public.class_schedule FOR ALL
USING (auth.role() = 'authenticated');

-- Fix classes RLS: drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Authenticated can manage classes" ON public.classes;
DROP POLICY IF EXISTS "Authenticated can view classes" ON public.classes;

CREATE POLICY "Authenticated can view classes"
ON public.classes FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can manage classes"
ON public.classes FOR ALL
USING (auth.role() = 'authenticated');

-- Fix class_students RLS
DROP POLICY IF EXISTS "Authenticated can manage enrollments" ON public.class_students;
DROP POLICY IF EXISTS "Authenticated can view enrollments" ON public.class_students;

CREATE POLICY "Authenticated can view enrollments"
ON public.class_students FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can manage enrollments"
ON public.class_students FOR ALL
USING (auth.role() = 'authenticated');

-- Fix attendance RLS
DROP POLICY IF EXISTS "Authenticated can manage attendance" ON public.attendance;
DROP POLICY IF EXISTS "Authenticated can view attendance" ON public.attendance;

CREATE POLICY "Authenticated can view attendance"
ON public.attendance FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can manage attendance"
ON public.attendance FOR ALL
USING (auth.role() = 'authenticated');
