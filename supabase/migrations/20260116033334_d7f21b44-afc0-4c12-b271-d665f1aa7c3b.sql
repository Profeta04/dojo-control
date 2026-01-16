-- Fix assign_user_role function to require admin authorization
CREATE OR REPLACE FUNCTION public.assign_user_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can assign roles
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Permissão negada: apenas administradores podem atribuir funções';
  END IF;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Fix remove_user_role function to require admin authorization
CREATE OR REPLACE FUNCTION public.remove_user_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can remove roles
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Permissão negada: apenas administradores podem remover funções';
  END IF;
  
  DELETE FROM public.user_roles
  WHERE user_id = _user_id AND role = _role;
END;
$$;

-- Make payment-receipts bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'payment-receipts';