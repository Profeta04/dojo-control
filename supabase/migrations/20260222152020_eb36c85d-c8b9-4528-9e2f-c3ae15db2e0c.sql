
-- Update auto_insert_student_belts to also handle guardian_minors link
CREATE OR REPLACE FUNCTION public.auto_insert_student_belts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _martial_arts text;
  _belt text;
BEGIN
  -- Insert belt records if student has a dojo
  IF NEW.dojo_id IS NOT NULL THEN
    SELECT martial_arts INTO _martial_arts FROM dojos WHERE id = NEW.dojo_id;
    _belt := COALESCE(NEW.belt_grade, 'branca');
    
    IF _martial_arts IN ('judo', 'judo_bjj') THEN
      INSERT INTO student_belts (user_id, martial_art, belt_grade)
      VALUES (NEW.user_id, 'judo', _belt)
      ON CONFLICT DO NOTHING;
    END IF;
    
    IF _martial_arts IN ('bjj', 'judo_bjj') THEN
      INSERT INTO student_belts (user_id, martial_art, belt_grade)
      VALUES (NEW.user_id, 'bjj', _belt)
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
$$;
