-- Add dark mode column to dojos table
ALTER TABLE public.dojos 
ADD COLUMN IF NOT EXISTS dark_mode boolean DEFAULT false;