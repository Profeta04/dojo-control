
-- Allow guardians to view payments of their linked minors
CREATE POLICY "Guardians can view minor payments"
ON public.payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM guardian_minors gm
    WHERE gm.guardian_user_id = auth.uid()
      AND gm.minor_user_id = payments.student_id
  )
);
