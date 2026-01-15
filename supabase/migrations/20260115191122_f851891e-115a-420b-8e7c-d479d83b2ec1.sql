-- Create class_schedule table for flexible scheduling
CREATE TABLE public.class_schedule (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  notes text,
  is_cancelled boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  UNIQUE(class_id, date)
);

-- Enable RLS
ALTER TABLE public.class_schedule ENABLE ROW LEVEL SECURITY;

-- Policies for class_schedule
CREATE POLICY "Authenticated users can view class schedules"
ON public.class_schedule
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and senseis can manage class schedules"
ON public.class_schedule
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'sensei')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'sensei')
);