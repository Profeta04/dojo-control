
-- Allow staff to delete profiles (for permanent student removal)
CREATE POLICY "Staff can delete profiles"
ON public.profiles
FOR DELETE
USING (is_staff(auth.uid()));

-- Allow staff to delete notifications
CREATE POLICY "Staff can delete notifications"
ON public.notifications
FOR DELETE
USING (is_staff(auth.uid()));
