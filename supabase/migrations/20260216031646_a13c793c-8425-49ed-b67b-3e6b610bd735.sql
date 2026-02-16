
-- Add checkin_token to dojos (auto-generated UUID for QR code)
ALTER TABLE public.dojos ADD COLUMN IF NOT EXISTS checkin_token uuid DEFAULT gen_random_uuid();

-- Ensure all existing dojos get a token
UPDATE public.dojos SET checkin_token = gen_random_uuid() WHERE checkin_token IS NULL;

-- Make it NOT NULL and UNIQUE after backfill
ALTER TABLE public.dojos ALTER COLUMN checkin_token SET NOT NULL;
ALTER TABLE public.dojos ADD CONSTRAINT dojos_checkin_token_unique UNIQUE (checkin_token);

-- Add self_checked_in flag to attendance
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS self_checked_in boolean NOT NULL DEFAULT false;

-- Create function to prevent modification of self-checked attendance
CREATE OR REPLACE FUNCTION public.prevent_self_checkin_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If trying to update or delete a self_checked_in record, block it
  IF OLD.self_checked_in = true THEN
    RAISE EXCEPTION 'Presença registrada por QR Code não pode ser alterada';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to prevent updates on self-checked attendance
CREATE TRIGGER prevent_self_checkin_update
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_checkin_modification();

-- Trigger to prevent deletes on self-checked attendance
CREATE TRIGGER prevent_self_checkin_delete
  BEFORE DELETE ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_checkin_modification();

-- RLS: Allow students to insert their own self-checkin attendance
CREATE POLICY "Students can self-checkin"
  ON public.attendance
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND self_checked_in = true
  );

-- Function to lookup dojo by checkin token (public access needed)
CREATE OR REPLACE FUNCTION public.get_dojo_by_checkin_token(_token uuid)
RETURNS TABLE(id uuid, name text, logo_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.name, d.logo_url
  FROM public.dojos d
  WHERE d.checkin_token = _token AND d.is_active = true
  LIMIT 1;
$$;
