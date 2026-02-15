
-- Function to mark overdue payments
CREATE OR REPLACE FUNCTION public.mark_overdue_payments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE payments
  SET status = 'atrasado',
      updated_at = now()
  WHERE status = 'pendente'
    AND due_date < CURRENT_DATE;
END;
$$;

-- Run it now to fix existing data
SELECT public.mark_overdue_payments();

-- Enable pg_cron and schedule daily at 1 AM UTC
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

SELECT cron.schedule(
  'mark-overdue-payments',
  '0 1 * * *',
  $$SELECT public.mark_overdue_payments()$$
);
