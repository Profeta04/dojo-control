
-- study_materials (apostilas)
CREATE TABLE public.study_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dojo_id uuid REFERENCES public.dojos(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  martial_art text NOT NULL DEFAULT 'judo',
  belt_level text NOT NULL DEFAULT 'branca',
  type text NOT NULL DEFAULT 'pdf',
  file_url text,
  content text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage study materials" ON public.study_materials FOR ALL TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Students can view study materials" ON public.study_materials FOR SELECT TO authenticated USING (dojo_id IS NULL OR dojo_id = get_user_dojo_id_safe(auth.uid()));

-- study_videos
CREATE TABLE public.study_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dojo_id uuid REFERENCES public.dojos(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  martial_art text NOT NULL DEFAULT 'judo',
  belt_level text NOT NULL DEFAULT 'branca',
  source text NOT NULL DEFAULT 'youtube',
  video_url text NOT NULL,
  thumbnail_url text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.study_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage study videos" ON public.study_videos FOR ALL TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Students can view study videos" ON public.study_videos FOR SELECT TO authenticated USING (dojo_id IS NULL OR dojo_id = get_user_dojo_id_safe(auth.uid()));

-- exam_templates (banco de simulados)
CREATE TABLE public.exam_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  martial_art text NOT NULL DEFAULT 'judo',
  belt_level text NOT NULL DEFAULT 'branca',
  difficulty text NOT NULL DEFAULT 'medium',
  questions jsonb NOT NULL DEFAULT '[]',
  total_questions integer NOT NULL DEFAULT 0,
  dojo_id uuid REFERENCES public.dojos(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage exam templates" ON public.exam_templates FOR ALL TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Students can view exam templates" ON public.exam_templates FOR SELECT TO authenticated USING (dojo_id IS NULL OR dojo_id = get_user_dojo_id_safe(auth.uid()));

-- exam_attempts
CREATE TABLE public.exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  exam_template_id uuid NOT NULL REFERENCES public.exam_templates(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  answers jsonb NOT NULL DEFAULT '[]',
  completed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can insert own attempts" ON public.exam_attempts FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students can view own attempts" ON public.exam_attempts FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Staff can view all attempts" ON public.exam_attempts FOR SELECT TO authenticated USING (is_staff(auth.uid()));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('study-materials', 'study-materials', false);

CREATE POLICY "Staff can upload study materials" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'study-materials' AND is_staff(auth.uid()));
CREATE POLICY "Staff can update study materials" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'study-materials' AND is_staff(auth.uid()));
CREATE POLICY "Staff can delete study materials" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'study-materials' AND is_staff(auth.uid()));
CREATE POLICY "Authenticated can read study materials" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'study-materials');
