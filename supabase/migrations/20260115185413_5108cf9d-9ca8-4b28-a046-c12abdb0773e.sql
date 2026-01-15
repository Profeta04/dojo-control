-- Function to assign a role to a user (used by admins)
CREATE OR REPLACE FUNCTION public.assign_user_role(
  _user_id uuid,
  _role app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Function to remove a role from a user
CREATE OR REPLACE FUNCTION public.remove_user_role(
  _user_id uuid,
  _role app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_roles
  WHERE user_id = _user_id AND role = _role;
END;
$$;