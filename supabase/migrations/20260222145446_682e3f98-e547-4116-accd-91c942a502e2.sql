
-- Add martial_arts type and signup_code to dojos
ALTER TABLE public.dojos
  ADD COLUMN IF NOT EXISTS martial_arts text NOT NULL DEFAULT 'judo',
  ADD COLUMN IF NOT EXISTS signup_code text;

-- Generate signup_code for existing dojos (uppercase, no spaces/accents)
UPDATE public.dojos
SET signup_code = UPPER(
  TRANSLATE(
    REPLACE(name, ' ', ''),
    'áàâãéèêíìîóòôõúùûçÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ',
    'aaaaeeeiiioooouuucAAAAEEEIIIOOOOUUUC'
  )
);

-- Make signup_code unique and not null
ALTER TABLE public.dojos
  ALTER COLUMN signup_code SET NOT NULL,
  ADD CONSTRAINT dojos_signup_code_unique UNIQUE (signup_code);

-- Create a public function to lookup dojo by signup code (no auth required)
CREATE OR REPLACE FUNCTION public.get_dojo_by_signup_code(_code text)
RETURNS TABLE(id uuid, name text, martial_arts text, logo_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT d.id, d.name, d.martial_arts, d.logo_url
  FROM public.dojos d
  WHERE d.signup_code = UPPER(_code) AND d.is_active = true
  LIMIT 1;
$$;
