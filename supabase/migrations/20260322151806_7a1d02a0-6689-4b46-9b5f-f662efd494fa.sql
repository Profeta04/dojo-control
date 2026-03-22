
CREATE OR REPLACE FUNCTION public.delete_student_cascade(target_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM absence_justifications WHERE student_id = target_user_id;
  DELETE FROM class_students WHERE student_id = target_user_id;
  DELETE FROM attendance WHERE student_id = target_user_id;
  DELETE FROM payments WHERE student_id = target_user_id;
  DELETE FROM student_belts WHERE user_id = target_user_id;
  DELETE FROM student_xp WHERE user_id = target_user_id;
  DELETE FROM student_achievements WHERE user_id = target_user_id;
  DELETE FROM graduation_history WHERE student_id = target_user_id;
  DELETE FROM season_xp WHERE user_id = target_user_id;
  DELETE FROM season_rewards WHERE user_id = target_user_id;
  DELETE FROM leaderboard_history WHERE user_id = target_user_id;
  DELETE FROM tasks WHERE assigned_to = target_user_id;
  DELETE FROM user_onboarding WHERE user_id = target_user_id;
  DELETE FROM push_subscriptions WHERE user_id = target_user_id;
  DELETE FROM user_roles WHERE user_id = target_user_id;
  DELETE FROM notifications WHERE user_id = target_user_id;
  DELETE FROM guardian_minors WHERE minor_user_id = target_user_id;
  DELETE FROM bug_reports WHERE user_id = target_user_id;
  DELETE FROM dojo_users WHERE user_id = target_user_id;
  DELETE FROM profiles WHERE user_id = target_user_id;
END;
$$;
