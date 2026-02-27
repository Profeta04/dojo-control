
-- Allow guardians to view attendance of their linked minors
CREATE POLICY "Guardians can view minor attendance"
ON public.attendance
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM guardian_minors gm
    WHERE gm.guardian_user_id = auth.uid()
      AND gm.minor_user_id = attendance.student_id
  )
);

-- Allow guardians to view class enrollments of their linked minors
CREATE POLICY "Guardians can view minor enrollments"
ON public.class_students
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM guardian_minors gm
    WHERE gm.guardian_user_id = auth.uid()
      AND gm.minor_user_id = class_students.student_id
  )
);

-- Allow guardians to view classes their minors are enrolled in
CREATE POLICY "Guardians can view minor classes"
ON public.classes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM class_students cs
    JOIN guardian_minors gm ON gm.minor_user_id = cs.student_id
    WHERE gm.guardian_user_id = auth.uid()
      AND cs.class_id = classes.id
  )
);

-- Allow guardians to view schedules of their minors' classes
CREATE POLICY "Guardians can view minor schedules"
ON public.class_schedule
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM class_students cs
    JOIN guardian_minors gm ON gm.minor_user_id = cs.student_id
    WHERE gm.guardian_user_id = auth.uid()
      AND cs.class_id = class_schedule.class_id
  )
);
