
-- Security definer functions to break RLS recursion between classes <-> class_students

-- Check if student is enrolled in a class (bypasses class_students RLS)
CREATE OR REPLACE FUNCTION public.is_enrolled_in_class(_student_id uuid, _class_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.class_students
    WHERE student_id = _student_id AND class_id = _class_id
  )
$$;

-- Check if class belongs to any of the given dojos (bypasses classes RLS)
CREATE OR REPLACE FUNCTION public.class_in_dojo(_class_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classes c
    INNER JOIN public.dojo_senseis ds ON ds.dojo_id = c.dojo_id
    WHERE c.id = _class_id AND ds.sensei_id = _user_id
  )
$$;

-- Get class IDs for enrolled student (bypasses class_students RLS)
CREATE OR REPLACE FUNCTION public.get_student_class_ids(_student_id uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT class_id FROM public.class_students WHERE student_id = _student_id
$$;

-- ============================================================
-- Fix CLASSES policies - remove class_students subquery
-- ============================================================
DROP POLICY IF EXISTS "Students can view enrolled classes" ON public.classes;

CREATE POLICY "Students can view enrolled classes" ON public.classes FOR SELECT
USING (public.is_enrolled_in_class(auth.uid(), id));

-- ============================================================
-- Fix CLASS_STUDENTS policies - remove classes subquery
-- ============================================================
DROP POLICY IF EXISTS "Senseis can manage dojo enrollments" ON public.class_students;

CREATE POLICY "Senseis can manage dojo enrollments" ON public.class_students FOR ALL
USING (
  public.has_role(auth.uid(), 'sensei')
  AND public.class_in_dojo(class_id, auth.uid())
);

-- ============================================================
-- Fix ATTENDANCE policies - remove classes subquery
-- ============================================================
DROP POLICY IF EXISTS "Senseis can manage dojo attendance" ON public.attendance;

CREATE POLICY "Senseis can manage dojo attendance" ON public.attendance FOR ALL
USING (
  public.has_role(auth.uid(), 'sensei')
  AND public.class_in_dojo(class_id, auth.uid())
);

-- ============================================================
-- Fix CLASS_SCHEDULE policies - remove classes subquery
-- ============================================================
DROP POLICY IF EXISTS "Senseis can manage dojo schedules" ON public.class_schedule;
DROP POLICY IF EXISTS "Students can view enrolled schedules" ON public.class_schedule;

CREATE POLICY "Senseis can manage dojo schedules" ON public.class_schedule FOR ALL
USING (
  public.has_role(auth.uid(), 'sensei')
  AND public.class_in_dojo(class_id, auth.uid())
);

CREATE POLICY "Students can view enrolled schedules" ON public.class_schedule FOR SELECT
USING (
  class_id IN (SELECT public.get_student_class_ids(auth.uid()))
);
