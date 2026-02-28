-- Fix notifications INSERT policy: staff can insert for any user, regular users only for themselves
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;

CREATE POLICY "Users can insert own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR is_staff(auth.uid()));
