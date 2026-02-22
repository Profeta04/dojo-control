
-- 1. Create student_belts table (belt per martial art)
CREATE TABLE public.student_belts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  martial_art TEXT NOT NULL DEFAULT 'judo',
  belt_grade TEXT NOT NULL DEFAULT 'branca',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, martial_art)
);

ALTER TABLE public.student_belts ENABLE ROW LEVEL SECURITY;

-- Users can view own belts
CREATE POLICY "Users can view own belts"
ON public.student_belts FOR SELECT
USING (user_id = auth.uid());

-- Users can insert own belts
CREATE POLICY "Users can insert own belts"
ON public.student_belts FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update own belts
CREATE POLICY "Users can update own belts"
ON public.student_belts FOR UPDATE
USING (user_id = auth.uid());

-- Staff can manage all belts
CREATE POLICY "Staff can manage all belts"
ON public.student_belts FOR ALL
USING (is_staff(auth.uid()));

-- Senseis can view dojo student belts
CREATE POLICY "Senseis can view dojo student belts"
ON public.student_belts FOR SELECT
USING (
  has_role(auth.uid(), 'sensei') AND
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = student_belts.user_id
    AND p.dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid()))
  )
);

-- Senseis can update dojo student belts
CREATE POLICY "Senseis can update dojo student belts"
ON public.student_belts FOR UPDATE
USING (
  has_role(auth.uid(), 'sensei') AND
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = student_belts.user_id
    AND p.dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid()))
  )
);

-- Students can view dojo peers' belts (for leaderboard)
CREATE POLICY "Students can view dojo belts"
ON public.student_belts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p1
    JOIN profiles p2 ON p1.dojo_id = p2.dojo_id
    WHERE p1.user_id = auth.uid()
    AND p2.user_id = student_belts.user_id
    AND p1.registration_status = 'aprovado'
  )
);

-- 2. Add martial_art column to graduation_history
ALTER TABLE public.graduation_history
ADD COLUMN martial_art TEXT NOT NULL DEFAULT 'judo';

-- 3. Migrate existing belts from profiles to student_belts
-- For students enrolled in classes, use the class martial_art
-- For others, default to 'judo'
INSERT INTO public.student_belts (user_id, martial_art, belt_grade)
SELECT DISTINCT ON (p.user_id, COALESCE(c.martial_art, 'judo'))
  p.user_id,
  COALESCE(c.martial_art, 'judo') AS martial_art,
  p.belt_grade
FROM profiles p
LEFT JOIN class_students cs ON cs.student_id = p.user_id
LEFT JOIN classes c ON c.id = cs.class_id
WHERE p.belt_grade IS NOT NULL
ON CONFLICT (user_id, martial_art) DO NOTHING;
