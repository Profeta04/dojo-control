
-- Allow students to view their own dojo's active subscription (needed for feature gating)
CREATE POLICY "Students can view own dojo subscription"
ON public.dojo_subscriptions
FOR SELECT
USING (
  dojo_id = get_user_dojo_id_safe(auth.uid())
  AND status = 'ativo'
);
