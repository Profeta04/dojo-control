-- Add missing columns to payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add missing columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS guardian_email TEXT,
ADD COLUMN IF NOT EXISTS dojo_id UUID REFERENCES public.dojos(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID;