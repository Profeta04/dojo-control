-- Allow staff (admin/sensei) to view all tasks
CREATE POLICY "Staff can view all tasks"
  ON public.tasks
  FOR SELECT
  USING (is_staff(auth.uid()));