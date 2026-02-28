
-- Remove all guardian-specific RLS policies
DROP POLICY IF EXISTS "Guardians can view minor payments" ON public.payments;
DROP POLICY IF EXISTS "Guardians can view minor attendance" ON public.attendance;
DROP POLICY IF EXISTS "Guardians can view minor enrollments" ON public.class_students;
DROP POLICY IF EXISTS "Guardians can view minor classes" ON public.classes;
DROP POLICY IF EXISTS "Guardians can view minor schedules" ON public.class_schedule;
DROP POLICY IF EXISTS "Guardians can view minor profiles" ON public.profiles;
