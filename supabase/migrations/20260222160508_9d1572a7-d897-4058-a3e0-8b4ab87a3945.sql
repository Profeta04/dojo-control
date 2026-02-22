
CREATE OR REPLACE FUNCTION public.auto_insert_student_belts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _martial_arts text;
  _belt text;
  _judo_belt text;
  _bjj_belt text;
  _raw_meta jsonb;
BEGIN
  -- Insert belt records if student has a dojo
  IF NEW.dojo_id IS NOT NULL THEN
    SELECT martial_arts INTO _martial_arts FROM dojos WHERE id = NEW.dojo_id;
    _belt := COALESCE(NEW.belt_grade, 'branca');
    
    -- Try to read per-art belts from auth.users raw_user_meta_data
    BEGIN
      SELECT raw_user_meta_data INTO _raw_meta FROM auth.users WHERE id = NEW.user_id;
      _judo_belt := COALESCE(_raw_meta ->> 'judo_belt', _belt);
      _bjj_belt := COALESCE(_raw_meta ->> 'bjj_belt', _belt);
    EXCEPTION WHEN OTHERS THEN
      _judo_belt := _belt;
      _bjj_belt := _belt;
    END;
    
    IF _martial_arts IN ('judo', 'judo_bjj') THEN
      INSERT INTO student_belts (user_id, martial_art, belt_grade)
      VALUES (NEW.user_id, 'judo', _judo_belt)
      ON CONFLICT DO NOTHING;
    END IF;
    
    IF _martial_arts IN ('bjj', 'judo_bjj') THEN
      INSERT INTO student_belts (user_id, martial_art, belt_grade)
      VALUES (NEW.user_id, 'bjj', _bjj_belt)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  -- Link guardian to minor in guardian_minors table
  IF NEW.guardian_user_id IS NOT NULL THEN
    INSERT INTO guardian_minors (guardian_user_id, minor_user_id)
    VALUES (NEW.guardian_user_id, NEW.user_id)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;
