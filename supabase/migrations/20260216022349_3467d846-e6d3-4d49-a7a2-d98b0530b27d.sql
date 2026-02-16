-- Drop the restrictive delete policy
DROP POLICY "Users can delete tasks they created" ON public.tasks;

-- Create a new policy that allows staff to delete any task, and creators to delete their own
CREATE POLICY "Staff or creator can delete tasks"
ON public.tasks
FOR DELETE
USING (
  assigned_by = auth.uid()
  OR public.is_staff(auth.uid())
);