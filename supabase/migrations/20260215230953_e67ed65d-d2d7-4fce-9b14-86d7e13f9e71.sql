-- Allow approved students to view profiles of other students in the same dojo
-- This is needed for the leaderboard to work
CREATE POLICY "Students can view dojo profiles for leaderboard"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
      AND p.dojo_id = profiles.dojo_id
      AND p.registration_status = 'aprovado'
  )
);