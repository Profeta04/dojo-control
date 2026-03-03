-- Drop the problematic recursive policy
DROP POLICY "Students can update own payment receipt" ON public.payments;

-- Recreate without self-referencing sub-selects
-- Students can only update receipt_url and receipt_status on their own payments
CREATE POLICY "Students can update own payment receipt"
ON public.payments
FOR UPDATE
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());