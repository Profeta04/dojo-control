
-- Staff needs DELETE on content tables
CREATE POLICY "Staff can delete study materials" ON public.study_materials FOR DELETE TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff can delete study videos" ON public.study_videos FOR DELETE TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff can delete exam templates" ON public.exam_templates FOR DELETE TO authenticated USING (is_staff(auth.uid()));
