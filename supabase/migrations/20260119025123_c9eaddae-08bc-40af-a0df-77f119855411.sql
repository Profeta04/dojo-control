-- Public-safe RPC to list active dojos for signup (returns only id + name)
CREATE OR REPLACE FUNCTION public.get_active_dojos_public()
RETURNS TABLE (id uuid, name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.name
  FROM public.dojos d
  WHERE COALESCE(d.is_active, true) = true
  ORDER BY d.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_dojos_public() TO anon;
GRANT EXECUTE ON FUNCTION public.get_active_dojos_public() TO authenticated;