
-- Fix get_user_dojos function to remove dojo_owners reference (table was dropped)
CREATE OR REPLACE FUNCTION public.get_user_dojos(_user_id uuid)
  RETURNS SETOF dojos
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT d.*
  FROM public.dojos d
  INNER JOIN public.dojo_users du ON d.id = du.dojo_id
  WHERE du.user_id = _user_id
  UNION
  SELECT d.*
  FROM public.dojos d
  INNER JOIN public.dojo_senseis ds ON d.id = ds.dojo_id
  WHERE ds.sensei_id = _user_id;
$$;

-- Add INSERT/UPDATE/DELETE policies for seasons so admin can manage them
CREATE POLICY "Staff can manage seasons" ON public.seasons FOR ALL
USING (is_staff(auth.uid()));
