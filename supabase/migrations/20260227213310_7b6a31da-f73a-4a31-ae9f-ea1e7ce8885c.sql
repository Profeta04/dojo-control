
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
  _has_judo_belt boolean;
  _has_bjj_belt boolean;
  _raw_meta jsonb;
BEGIN
  -- Insert belt records if student has a dojo
  IF NEW.dojo_id IS NOT NULL THEN
    SELECT martial_arts INTO _martial_arts FROM dojos WHERE id = NEW.dojo_id;
    _belt := COALESCE(NEW.belt_grade, 'branca');
    
    -- Try to read per-art belts from auth.users raw_user_meta_data
    _has_judo_belt := false;
    _has_bjj_belt := false;
    _judo_belt := _belt;
    _bjj_belt := 'branca';
    
    BEGIN
      SELECT raw_user_meta_data INTO _raw_meta FROM auth.users WHERE id = NEW.user_id;
      
      -- Check if per-art belts were explicitly set
      IF _raw_meta ? 'judo_belt' THEN
        _judo_belt := COALESCE(_raw_meta ->> 'judo_belt', _belt);
        _has_judo_belt := true;
      END IF;
      
      IF _raw_meta ? 'bjj_belt' THEN
        _bjj_belt := COALESCE(_raw_meta ->> 'bjj_belt', 'branca');
        _has_bjj_belt := true;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      _judo_belt := _belt;
      _bjj_belt := 'branca';
    END;
    
    -- For single-art dojos, always create the belt record
    -- For multi-art dojos, only create records for arts explicitly chosen
    IF _martial_arts = 'judo' THEN
      INSERT INTO student_belts (user_id, martial_art, belt_grade)
      VALUES (NEW.user_id, 'judo', _judo_belt)
      ON CONFLICT DO NOTHING;
    ELSIF _martial_arts = 'bjj' THEN
      INSERT INTO student_belts (user_id, martial_art, belt_grade)
      VALUES (NEW.user_id, 'bjj', _bjj_belt)
      ON CONFLICT DO NOTHING;
    ELSIF _martial_arts = 'judo_bjj' THEN
      -- For multi-art dojos: create judo belt (default art) always
      -- Only create bjj belt if explicitly set in metadata
      INSERT INTO student_belts (user_id, martial_art, belt_grade)
      VALUES (NEW.user_id, 'judo', _judo_belt)
      ON CONFLICT DO NOTHING;
      
      IF _has_bjj_belt THEN
        INSERT INTO student_belts (user_id, martial_art, belt_grade)
        VALUES (NEW.user_id, 'bjj', _bjj_belt)
        ON CONFLICT DO NOTHING;
      END IF;
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
