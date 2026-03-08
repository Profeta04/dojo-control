
-- 1. Drop the insecure INSERT policy on student_achievements
DROP POLICY IF EXISTS "Users can insert own achievements" ON public.student_achievements;

-- 2. Create a SECURITY DEFINER function to award achievements server-side with criteria validation
CREATE OR REPLACE FUNCTION public.award_achievement(_user_id uuid, _achievement_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _criteria_type text;
  _criteria_value integer;
  _is_annual boolean;
  _stat integer;
  _already_exists boolean;
BEGIN
  -- Check if already awarded
  SELECT EXISTS (
    SELECT 1 FROM student_achievements
    WHERE user_id = _user_id AND achievement_id = _achievement_id
  ) INTO _already_exists;
  
  IF _already_exists THEN
    RETURN false;
  END IF;

  -- Get achievement criteria
  SELECT criteria_type, criteria_value, is_annual
  INTO _criteria_type, _criteria_value, _is_annual
  FROM achievements
  WHERE id = _achievement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Achievement not found';
  END IF;

  -- Annual achievements can only be awarded by staff (caller must be staff or service role)
  -- For non-annual, validate criteria
  IF NOT _is_annual THEN
    CASE _criteria_type
      WHEN 'tasks_completed' THEN
        SELECT count(*) INTO _stat FROM tasks
        WHERE assigned_to = _user_id AND status = 'concluida';
      WHEN 'streak_days' THEN
        SELECT COALESCE(current_streak, 0) INTO _stat FROM student_xp
        WHERE user_id = _user_id;
      WHEN 'xp_total' THEN
        SELECT COALESCE(total_xp, 0) INTO _stat FROM student_xp
        WHERE user_id = _user_id;
      WHEN 'attendance_count' THEN
        SELECT count(*) INTO _stat FROM attendance
        WHERE student_id = _user_id AND present = true;
      ELSE
        _stat := 0;
    END CASE;

    IF _stat < _criteria_value THEN
      RETURN false;
    END IF;
  END IF;

  -- Insert the achievement
  INSERT INTO student_achievements (user_id, achievement_id)
  VALUES (_user_id, _achievement_id);

  RETURN true;
END;
$$;
