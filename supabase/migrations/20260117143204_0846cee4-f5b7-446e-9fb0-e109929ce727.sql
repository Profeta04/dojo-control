-- Add category column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN category TEXT NOT NULL DEFAULT 'outra' 
CHECK (category IN ('tecnica', 'fisica', 'administrativa', 'outra'));