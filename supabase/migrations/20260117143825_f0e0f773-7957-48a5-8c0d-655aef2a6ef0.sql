-- Allow Senseis to view all roles (needed to manage students)
CREATE POLICY "Senseis can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'sensei'::app_role));