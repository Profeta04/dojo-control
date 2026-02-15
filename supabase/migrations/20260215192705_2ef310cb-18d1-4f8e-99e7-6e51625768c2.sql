
-- Add scholarship flag to profiles
ALTER TABLE public.profiles ADD COLUMN is_scholarship boolean NOT NULL DEFAULT false;

-- Create monthly fee plans table
CREATE TABLE public.monthly_fee_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dojo_id uuid NOT NULL REFERENCES public.dojos(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric NOT NULL,
  due_day integer NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create junction table for plans <-> classes
CREATE TABLE public.monthly_fee_plan_classes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid NOT NULL REFERENCES public.monthly_fee_plans(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (plan_id, class_id)
);

-- Enable RLS
ALTER TABLE public.monthly_fee_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_fee_plan_classes ENABLE ROW LEVEL SECURITY;

-- RLS for monthly_fee_plans
CREATE POLICY "Staff can manage fee plans"
ON public.monthly_fee_plans FOR ALL
USING (is_staff(auth.uid()));

CREATE POLICY "Senseis can manage own dojo fee plans"
ON public.monthly_fee_plans FOR ALL
USING (
  has_role(auth.uid(), 'sensei'::app_role)
  AND dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid()))
);

-- RLS for monthly_fee_plan_classes
CREATE POLICY "Staff can manage fee plan classes"
ON public.monthly_fee_plan_classes FOR ALL
USING (is_staff(auth.uid()));

CREATE POLICY "Senseis can manage own dojo fee plan classes"
ON public.monthly_fee_plan_classes FOR ALL
USING (
  has_role(auth.uid(), 'sensei'::app_role)
  AND plan_id IN (
    SELECT id FROM public.monthly_fee_plans
    WHERE dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid()))
  )
);

-- Trigger for updated_at on monthly_fee_plans
CREATE TRIGGER update_monthly_fee_plans_updated_at
BEFORE UPDATE ON public.monthly_fee_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_task_updated_at();
