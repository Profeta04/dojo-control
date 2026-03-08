
-- 1. Restrict task INSERT to admin only (senseis cannot create tasks)
DROP POLICY IF EXISTS "Authenticated users can insert tasks" ON public.tasks;
CREATE POLICY "Only admins can insert tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Atomic XP grant function to prevent race conditions
CREATE OR REPLACE FUNCTION public.grant_xp(_user_id uuid, _base_xp integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current student_xp%ROWTYPE;
  _today date := CURRENT_DATE;
  _streak integer;
  _longest integer;
  _multiplier numeric;
  _final_xp integer;
  _new_total integer;
  _new_level integer;
  _old_level integer;
  _leveled_up boolean := false;
  _diff_days integer;
BEGIN
  -- Upsert and lock the row
  INSERT INTO student_xp (user_id, total_xp, level, current_streak, longest_streak, last_activity_date)
  VALUES (_user_id, 0, 1, 0, 0, NULL)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO _current FROM student_xp WHERE user_id = _user_id FOR UPDATE;

  -- Calculate streak
  IF _current.last_activity_date IS NOT NULL THEN
    _diff_days := _today - _current.last_activity_date;
    IF _diff_days = 1 THEN
      _streak := _current.current_streak + 1;
    ELSIF _diff_days = 0 THEN
      _streak := _current.current_streak;
    ELSE
      _streak := 1;
    END IF;
  ELSE
    _streak := 1;
  END IF;

  _longest := GREATEST(_current.longest_streak, _streak);

  -- Streak multiplier
  IF _streak >= 30 THEN _multiplier := 2.0;
  ELSIF _streak >= 14 THEN _multiplier := 1.75;
  ELSIF _streak >= 7 THEN _multiplier := 1.5;
  ELSIF _streak >= 3 THEN _multiplier := 1.25;
  ELSE _multiplier := 1.0;
  END IF;

  _final_xp := ROUND(_base_xp * _multiplier);
  _new_total := _current.total_xp + _final_xp;

  -- Calculate level: sum of 1..L * 100 <= total_xp
  _new_level := 1;
  DECLARE _xp_needed integer := 0;
  BEGIN
    LOOP
      EXIT WHEN _xp_needed + _new_level * 100 > _new_total;
      _xp_needed := _xp_needed + _new_level * 100;
      _new_level := _new_level + 1;
    END LOOP;
  END;

  _old_level := _current.level;
  _leveled_up := _new_level > _old_level;

  -- Atomic update
  UPDATE student_xp SET
    total_xp = _new_total,
    level = _new_level,
    current_streak = _streak,
    longest_streak = _longest,
    last_activity_date = _today
  WHERE user_id = _user_id;

  -- Level up notification
  IF _leveled_up THEN
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (_user_id, '⬆️ Subiu de nível!', 'Parabéns! Você alcançou o Nível ' || _new_level || '!', 'level_up');
  END IF;

  RETURN jsonb_build_object(
    'xpGranted', _final_xp,
    'multiplier', _multiplier,
    'newTotal', _new_total,
    'newLevel', _new_level,
    'leveledUp', _leveled_up,
    'currentStreak', _streak
  );
END;
$$;

-- 3. Atomic Season XP grant function
CREATE OR REPLACE FUNCTION public.grant_season_xp(_user_id uuid, _season_id uuid, _base_xp integer, _season_multiplier numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current season_xp%ROWTYPE;
  _today date := CURRENT_DATE;
  _streak integer;
  _longest integer;
  _multiplier numeric;
  _final_xp integer;
  _new_total integer;
  _new_level integer;
  _diff_days integer;
BEGIN
  -- Upsert and lock
  INSERT INTO season_xp (user_id, season_id, total_xp, level, current_streak, longest_streak, last_activity_date)
  VALUES (_user_id, _season_id, 0, 1, 0, 0, NULL)
  ON CONFLICT (user_id, season_id) DO NOTHING;

  SELECT * INTO _current FROM season_xp WHERE user_id = _user_id AND season_id = _season_id FOR UPDATE;

  -- Calculate streak
  IF _current.last_activity_date IS NOT NULL THEN
    _diff_days := _today - _current.last_activity_date;
    IF _diff_days = 1 THEN _streak := _current.current_streak + 1;
    ELSIF _diff_days = 0 THEN _streak := _current.current_streak;
    ELSE _streak := 1;
    END IF;
  ELSE
    _streak := 1;
  END IF;

  _longest := GREATEST(_current.longest_streak, _streak);

  -- Streak multiplier
  IF _streak >= 30 THEN _multiplier := 2.0;
  ELSIF _streak >= 14 THEN _multiplier := 1.75;
  ELSIF _streak >= 7 THEN _multiplier := 1.5;
  ELSIF _streak >= 3 THEN _multiplier := 1.25;
  ELSE _multiplier := 1.0;
  END IF;

  _final_xp := ROUND(_base_xp * _multiplier * _season_multiplier);
  _new_total := _current.total_xp + _final_xp;

  -- Calculate level
  _new_level := 1;
  DECLARE _xp_needed integer := 0;
  BEGIN
    LOOP
      EXIT WHEN _xp_needed + _new_level * 100 > _new_total;
      _xp_needed := _xp_needed + _new_level * 100;
      _new_level := _new_level + 1;
    END LOOP;
  END;

  UPDATE season_xp SET
    total_xp = _new_total,
    level = _new_level,
    current_streak = _streak,
    longest_streak = _longest,
    last_activity_date = _today
  WHERE user_id = _user_id AND season_id = _season_id;

  RETURN jsonb_build_object(
    'xpGranted', _final_xp,
    'multiplier', _multiplier,
    'newTotal', _new_total,
    'newLevel', _new_level
  );
END;
$$;
