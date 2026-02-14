-- Fix profiles UPDATE policies: change from RESTRICTIVE to PERMISSIVE
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Staff can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Senseis can update dojo profiles" ON public.profiles;

-- Recreate as PERMISSIVE (any matching policy grants access)
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Staff can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (is_staff(auth.uid()));

CREATE POLICY "Senseis can update dojo profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'sensei'::app_role) AND dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid())));