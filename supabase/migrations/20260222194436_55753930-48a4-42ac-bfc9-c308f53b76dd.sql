-- Add audience column to task_templates to distinguish children vs general content
ALTER TABLE public.task_templates 
ADD COLUMN audience text NOT NULL DEFAULT 'geral';

-- Mark existing templates as 'geral'
-- New children's templates will be inserted with audience = 'infantil'

-- Add index for efficient filtering
CREATE INDEX idx_task_templates_audience ON public.task_templates (audience);