
-- Fix: Allow admins to insert any tasks AND students to insert tasks assigned to themselves
DROP POLICY IF EXISTS "Only admins can insert tasks" ON public.tasks;

-- Admins can insert any task
CREATE POLICY "Admins can insert tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (assigned_to = auth.uid() AND assigned_by = auth.uid())
);
