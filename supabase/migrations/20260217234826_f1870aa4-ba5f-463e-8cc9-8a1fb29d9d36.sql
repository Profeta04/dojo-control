
CREATE OR REPLACE FUNCTION public.auto_unblock_student_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only act when payment status changes to 'pago'
  IF NEW.status = 'pago' AND (OLD.status IS DISTINCT FROM 'pago') THEN
    -- Check if student is blocked
    IF EXISTS (
      SELECT 1 FROM profiles WHERE user_id = NEW.student_id AND is_blocked = true
    ) THEN
      -- Check if there are no more overdue payments for this student
      IF NOT EXISTS (
        SELECT 1 FROM payments
        WHERE student_id = NEW.student_id
          AND status = 'atrasado'
          AND id != NEW.id
      ) THEN
        UPDATE profiles
        SET is_blocked = false, blocked_reason = NULL, updated_at = now()
        WHERE user_id = NEW.student_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_unblock_student
AFTER UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.auto_unblock_student_on_payment();
