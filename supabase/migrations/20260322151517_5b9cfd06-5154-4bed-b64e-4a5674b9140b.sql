
-- Create absence justifications table
CREATE TABLE public.absence_justifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  attendance_id UUID NOT NULL REFERENCES public.attendance(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'outro',
  description TEXT,
  attachment_url TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE
);

-- RLS
ALTER TABLE public.absence_justifications ENABLE ROW LEVEL SECURITY;

-- Students can view own justifications
CREATE POLICY "Students can view own justifications"
  ON public.absence_justifications FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- Students can insert own justifications
CREATE POLICY "Students can insert own justifications"
  ON public.absence_justifications FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

-- Staff can view all justifications
CREATE POLICY "Staff can view all justifications"
  ON public.absence_justifications FOR SELECT
  TO authenticated
  USING (is_staff(auth.uid()));

-- Staff can update justifications (approve/reject)
CREATE POLICY "Staff can update justifications"
  ON public.absence_justifications FOR UPDATE
  TO authenticated
  USING (is_staff(auth.uid()));

-- Senseis can view dojo justifications
CREATE POLICY "Senseis can view dojo justifications"
  ON public.absence_justifications FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'sensei'::app_role) AND
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = absence_justifications.student_id
      AND p.dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid()))
    )
  );

-- Senseis can update dojo justifications
CREATE POLICY "Senseis can update dojo justifications"
  ON public.absence_justifications FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'sensei'::app_role) AND
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = absence_justifications.student_id
      AND p.dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid()))
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_absence_justifications_updated_at
  BEFORE UPDATE ON public.absence_justifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Storage bucket for justification attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('justification-attachments', 'justification-attachments', false);

-- Storage policies
CREATE POLICY "Students can upload own justification attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'justification-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Students can view own justification attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'justification-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Staff can view all justification attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'justification-attachments' AND is_staff(auth.uid()));
