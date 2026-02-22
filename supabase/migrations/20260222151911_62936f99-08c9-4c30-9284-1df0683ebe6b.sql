
-- Create a trigger function that inserts belt records when a student profile is created with a dojo
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
  -- Only act on new profiles with a dojo_id
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
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_profile_created_insert_belts ON profiles;

-- Create trigger
CREATE TRIGGER on_profile_created_insert_belts
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION auto_insert_student_belts();
