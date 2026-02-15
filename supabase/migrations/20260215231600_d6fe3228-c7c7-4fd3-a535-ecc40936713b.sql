-- Drop the recursive policy that's breaking everything
DROP POLICY IF EXISTS "Students can view dojo profiles for leaderboard" ON public.profiles;

-- Recreate it using a subquery that doesn't reference profiles table directly
-- Instead, use auth.uid() to get the user's dojo_id from a security definer function
CREATE OR REPLACE FUNCTION public.get_user_dojo_id_safe(_user_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT dojo_id FROM profiles WHERE user_id = _user_id LIMIT 1;
$$;

-- Now create the policy using the function (avoids recursion)
CREATE POLICY "Students can view dojo profiles for leaderboard"
ON public.profiles
FOR SELECT
USING (
  dojo_id IS NOT NULL 
  AND dojo_id = get_user_dojo_id_safe(auth.uid())
  AND registration_status = 'aprovado'
);
