-- Add foreground color columns for buttons
ALTER TABLE public.dojos 
ADD COLUMN IF NOT EXISTS color_primary_foreground text DEFAULT '0 0% 98%',
ADD COLUMN IF NOT EXISTS color_secondary_foreground text DEFAULT '0 0% 10%',
ADD COLUMN IF NOT EXISTS color_accent_foreground text DEFAULT '0 0% 100%';