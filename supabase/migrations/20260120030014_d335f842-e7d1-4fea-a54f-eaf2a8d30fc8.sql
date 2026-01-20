-- Add theme columns to dojos table
ALTER TABLE public.dojos 
ADD COLUMN IF NOT EXISTS color_primary TEXT DEFAULT '220 15% 20%',
ADD COLUMN IF NOT EXISTS color_secondary TEXT DEFAULT '220 10% 92%',
ADD COLUMN IF NOT EXISTS color_accent TEXT DEFAULT '4 85% 50%',
ADD COLUMN IF NOT EXISTS dark_mode BOOLEAN DEFAULT false;

-- Create settings table for dojo settings
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for settings
CREATE POLICY "Anyone can view settings" 
ON public.settings 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage settings" 
ON public.settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dono'::app_role));

-- Insert default settings
INSERT INTO public.settings (key, value) VALUES 
('dojo_name', 'Dojo Manager'),
('dojo_phone', ''),
('dojo_email', ''),
('dojo_address', ''),
('monthly_fee', '150.00'),
('payment_due_day', '10'),
('pix_key', ''),
('welcome_message', '')
ON CONFLICT (key) DO NOTHING;

-- Create function to get active dojos for signup (public access)
CREATE OR REPLACE FUNCTION public.get_active_dojos_public()
RETURNS TABLE(id UUID, name TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.name
  FROM public.dojos d
  WHERE d.is_active = true
  ORDER BY d.name;
$$;