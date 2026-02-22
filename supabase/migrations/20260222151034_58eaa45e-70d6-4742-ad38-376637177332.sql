DROP FUNCTION IF EXISTS public.get_dojo_by_signup_code(text);

CREATE FUNCTION public.get_dojo_by_signup_code(_code text)
RETURNS TABLE(id uuid, name text, martial_arts text, logo_url text, color_primary text, color_secondary text, color_accent text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.name, d.martial_arts, d.logo_url, d.color_primary, d.color_secondary, d.color_accent
  FROM public.dojos d
  WHERE d.signup_code = UPPER(_code) AND d.is_active = true
  LIMIT 1;
END;
$$;