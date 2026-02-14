-- Allow students to update only their own payments (for uploading receipts)
CREATE POLICY "Students can update own payment receipt"
  ON public.payments
  FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());