-- Create task_templates table with all columns including video_url
CREATE TABLE public.task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  belt_level TEXT NOT NULL,
  martial_art TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  options JSONB DEFAULT NULL,
  correct_option INTEGER DEFAULT NULL,
  video_url TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read task templates (they're public content)
CREATE POLICY "Anyone can view task templates"
ON public.task_templates
FOR SELECT
TO authenticated
USING (true);

-- Create tasks table for assignments
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL,
  assigned_by UUID NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pendente',
  priority TEXT NOT NULL DEFAULT 'normal',
  category TEXT NOT NULL DEFAULT 'outra',
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Students can view their own tasks
CREATE POLICY "Users can view own tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (assigned_to = auth.uid() OR assigned_by = auth.uid());

-- Anyone authenticated can insert tasks (senseis assign to students)
CREATE POLICY "Authenticated users can insert tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (assigned_by = auth.uid());

-- Users can update tasks assigned to them
CREATE POLICY "Users can update own assigned tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (assigned_to = auth.uid() OR assigned_by = auth.uid());

-- Users can delete tasks they created
CREATE POLICY "Users can delete tasks they created"
ON public.tasks
FOR DELETE
TO authenticated
USING (assigned_by = auth.uid());

-- Create update trigger for tasks
CREATE OR REPLACE FUNCTION public.update_task_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_task_updated_at();