
ALTER TABLE public.monthly_fee_plans
  ADD COLUMN late_fee_percent numeric DEFAULT NULL,
  ADD COLUMN late_fee_fixed numeric DEFAULT NULL,
  ADD COLUMN daily_interest_percent numeric DEFAULT NULL,
  ADD COLUMN grace_days integer DEFAULT NULL;
