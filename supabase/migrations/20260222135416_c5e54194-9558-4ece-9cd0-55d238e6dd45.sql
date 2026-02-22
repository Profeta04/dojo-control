
-- Add martial_art_type column to monthly_fee_plans
-- Values: 'judo', 'bjj', 'judo_bjj'
ALTER TABLE public.monthly_fee_plans 
ADD COLUMN martial_art_type text NOT NULL DEFAULT 'judo';
