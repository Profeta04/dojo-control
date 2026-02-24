
-- Allow students to view class enrollments of students in the same dojo (for leaderboard)
CREATE POLICY "Students can view dojo class enrollments for leaderboard"
ON public.class_students
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM profiles p1
    JOIN profiles p2 ON p1.dojo_id = p2.dojo_id
    WHERE p1.user_id = auth.uid()
      AND p2.user_id = class_students.student_id
      AND p1.registration_status = 'aprovado'
  )
);
