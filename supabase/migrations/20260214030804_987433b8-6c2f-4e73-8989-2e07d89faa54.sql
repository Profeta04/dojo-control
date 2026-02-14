
-- Drop the existing admin-only view policy
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- Recreate it to include senseis
CREATE POLICY "Admins and senseis can view all roles"
ON public.user_roles
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'dono'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'sensei'::app_role)
);
