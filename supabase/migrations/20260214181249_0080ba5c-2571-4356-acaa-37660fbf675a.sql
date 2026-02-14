-- Fix profiles SELECT policies: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Senseis can view dojo profiles" ON public.profiles;
DROP POLICY IF EXISTS "Guardians can view minor profiles" ON public.profiles;

-- Recreate as PERMISSIVE
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (is_staff(auth.uid()));

CREATE POLICY "Senseis can view dojo profiles"
ON public.profiles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'sensei'::app_role) AND dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid())));

CREATE POLICY "Guardians can view minor profiles"
ON public.profiles FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM guardian_minors gm
  WHERE gm.guardian_user_id = auth.uid() AND gm.minor_user_id = profiles.user_id
));