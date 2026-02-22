
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_guardian boolean;
  _reg_status text;
BEGIN
  _is_guardian := COALESCE((NEW.raw_user_meta_data ->> 'is_guardian')::boolean, false);
  
  -- Guardians are auto-approved; students are pending
  IF _is_guardian THEN
    _reg_status := 'aprovado';
  ELSE
    _reg_status := 'pendente';
  END IF;

  INSERT INTO public.profiles (user_id, name, email, registration_status, dojo_id, birth_date, guardian_email, guardian_user_id, belt_grade)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'Novo Usuário'),
    NEW.email,
    _reg_status,
    CASE WHEN NEW.raw_user_meta_data ->> 'dojo_id' IS NOT NULL AND NEW.raw_user_meta_data ->> 'dojo_id' != ''
         THEN (NEW.raw_user_meta_data ->> 'dojo_id')::uuid
         ELSE NULL END,
    CASE WHEN NEW.raw_user_meta_data ->> 'birth_date' IS NOT NULL AND NEW.raw_user_meta_data ->> 'birth_date' != ''
         THEN (NEW.raw_user_meta_data ->> 'birth_date')::date
         ELSE NULL END,
    NEW.raw_user_meta_data ->> 'guardian_email',
    CASE WHEN NEW.raw_user_meta_data ->> 'guardian_user_id' IS NOT NULL AND NEW.raw_user_meta_data ->> 'guardian_user_id' != ''
         THEN (NEW.raw_user_meta_data ->> 'guardian_user_id')::uuid
         ELSE NULL END,
    COALESCE(NEW.raw_user_meta_data ->> 'belt_grade', 'branca')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    dojo_id = COALESCE(EXCLUDED.dojo_id, profiles.dojo_id),
    birth_date = COALESCE(EXCLUDED.birth_date, profiles.birth_date),
    guardian_email = COALESCE(EXCLUDED.guardian_email, profiles.guardian_email),
    guardian_user_id = COALESCE(EXCLUDED.guardian_user_id, profiles.guardian_user_id),
    belt_grade = COALESCE(EXCLUDED.belt_grade, profiles.belt_grade);
  
  -- Auto-assign guardian role if is_guardian
  IF _is_guardian THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;
