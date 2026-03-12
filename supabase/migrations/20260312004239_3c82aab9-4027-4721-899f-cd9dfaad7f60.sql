
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(_dojo_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _now date := CURRENT_DATE;
  _month_start date := date_trunc('month', _now)::date;
  _month_end date := (date_trunc('month', _now) + interval '1 month' - interval '1 day')::date;
  _3months_ago date := (_now - interval '3 months')::date;
  _total_students integer;
  _active_classes integer;
  _pending_approvals integer;
  _pending_payments integer;
  _total_senseis integer;
  _present_count integer;
  _total_attendance integer;
  _total_received numeric;
  _overdue_payments integer;
  _recent_graduations integer;
  _monthly_attendance jsonb;
BEGIN
  IF _dojo_id IS NOT NULL THEN
    SELECT count(*) INTO _total_students
    FROM profiles p
    WHERE p.dojo_id = _dojo_id AND p.registration_status = 'aprovado'
      AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.user_id AND ur.role IN ('sensei','admin','dono','super_admin'));
  ELSE
    SELECT count(*) INTO _total_students
    FROM profiles p
    WHERE p.registration_status = 'aprovado'
      AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.user_id AND ur.role IN ('sensei','admin','dono','super_admin'));
  END IF;

  IF _dojo_id IS NOT NULL THEN
    SELECT count(*) INTO _active_classes FROM classes WHERE is_active = true AND dojo_id = _dojo_id;
  ELSE
    SELECT count(*) INTO _active_classes FROM classes WHERE is_active = true;
  END IF;

  IF _dojo_id IS NOT NULL THEN
    SELECT count(*) INTO _pending_approvals FROM profiles WHERE registration_status = 'pendente' AND dojo_id = _dojo_id;
  ELSE
    SELECT count(*) INTO _pending_approvals FROM profiles WHERE registration_status = 'pendente';
  END IF;

  IF _dojo_id IS NOT NULL THEN
    SELECT count(*) INTO _pending_payments FROM payments pay JOIN profiles p ON p.user_id = pay.student_id WHERE pay.status = 'pendente' AND p.dojo_id = _dojo_id;
    SELECT count(*) INTO _overdue_payments FROM payments pay JOIN profiles p ON p.user_id = pay.student_id WHERE pay.status = 'atrasado' AND p.dojo_id = _dojo_id;
    SELECT COALESCE(sum(pay.amount), 0) INTO _total_received FROM payments pay JOIN profiles p ON p.user_id = pay.student_id WHERE pay.status = 'pago' AND p.dojo_id = _dojo_id;
  ELSE
    SELECT count(*) INTO _pending_payments FROM payments WHERE status = 'pendente';
    SELECT count(*) INTO _overdue_payments FROM payments WHERE status = 'atrasado';
    SELECT COALESCE(sum(amount), 0) INTO _total_received FROM payments WHERE status = 'pago';
  END IF;

  SELECT count(*) INTO _total_senseis FROM user_roles WHERE role = 'sensei';

  IF _dojo_id IS NOT NULL THEN
    SELECT count(*) FILTER (WHERE a.present = true), count(*)
    INTO _present_count, _total_attendance
    FROM attendance a JOIN profiles p ON p.user_id = a.student_id
    WHERE a.date BETWEEN _month_start AND _month_end AND p.dojo_id = _dojo_id;
  ELSE
    SELECT count(*) FILTER (WHERE present = true), count(*)
    INTO _present_count, _total_attendance
    FROM attendance WHERE date BETWEEN _month_start AND _month_end;
  END IF;

  IF _dojo_id IS NOT NULL THEN
    SELECT count(*) INTO _recent_graduations FROM graduation_history gh JOIN profiles p ON p.user_id = gh.student_id WHERE gh.graduation_date >= _3months_ago AND p.dojo_id = _dojo_id;
  ELSE
    SELECT count(*) INTO _recent_graduations FROM graduation_history WHERE graduation_date >= _3months_ago;
  END IF;

  IF _dojo_id IS NOT NULL THEN
    SELECT jsonb_agg(row_to_json(t) ORDER BY t.month_start) INTO _monthly_attendance
    FROM (
      SELECT d.month_start,
        to_char(d.month_start, 'Mon') AS name,
        COALESCE(count(a.id) FILTER (WHERE a.present = true), 0) AS presencas,
        COALESCE(count(a.id), 0) AS total,
        CASE WHEN count(a.id) > 0 THEN ROUND((count(a.id) FILTER (WHERE a.present = true))::numeric / count(a.id) * 100) ELSE 0 END AS taxa
      FROM generate_series(date_trunc('month', _now - interval '5 months')::date, date_trunc('month', _now)::date, '1 month'::interval) AS d(month_start)
      LEFT JOIN attendance a ON a.date >= d.month_start::date AND a.date < (d.month_start + interval '1 month')::date
        AND EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = a.student_id AND p.dojo_id = _dojo_id)
      GROUP BY d.month_start ORDER BY d.month_start
    ) t;
  ELSE
    SELECT jsonb_agg(row_to_json(t) ORDER BY t.month_start) INTO _monthly_attendance
    FROM (
      SELECT d.month_start,
        to_char(d.month_start, 'Mon') AS name,
        COALESCE(count(a.id) FILTER (WHERE a.present = true), 0) AS presencas,
        COALESCE(count(a.id), 0) AS total,
        CASE WHEN count(a.id) > 0 THEN ROUND((count(a.id) FILTER (WHERE a.present = true))::numeric / count(a.id) * 100) ELSE 0 END AS taxa
      FROM generate_series(date_trunc('month', _now - interval '5 months')::date, date_trunc('month', _now)::date, '1 month'::interval) AS d(month_start)
      LEFT JOIN attendance a ON a.date >= d.month_start::date AND a.date < (d.month_start + interval '1 month')::date
      GROUP BY d.month_start ORDER BY d.month_start
    ) t;
  END IF;

  RETURN jsonb_build_object(
    'totalStudents', _total_students, 'activeClasses', _active_classes,
    'pendingApprovals', _pending_approvals, 'pendingPayments', _pending_payments,
    'totalSenseis', _total_senseis, 'presentCount', _present_count,
    'totalAttendance', _total_attendance,
    'attendanceRate', CASE WHEN _total_attendance > 0 THEN ROUND((_present_count::numeric / _total_attendance) * 100) ELSE 0 END,
    'totalReceived', _total_received, 'overduePayments', _overdue_payments,
    'recentGraduations', _recent_graduations,
    'monthlyAttendance', COALESCE(_monthly_attendance, '[]'::jsonb)
  );
END;
$$;
