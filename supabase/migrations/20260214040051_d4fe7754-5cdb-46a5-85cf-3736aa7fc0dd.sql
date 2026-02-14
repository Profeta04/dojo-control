
-- Add pix_key column to dojos table
ALTER TABLE public.dojos ADD COLUMN IF NOT EXISTS pix_key TEXT;

-- Create payment-receipts storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Students can upload receipts to their own folder
CREATE POLICY "Students can upload receipts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment-receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Students can view their own receipts
CREATE POLICY "Students can view own receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Staff (admin, sensei, dono) can view all receipts
CREATE POLICY "Staff can view all receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-receipts'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'sensei'::app_role)
    OR public.has_role(auth.uid(), 'dono'::app_role)
  )
);
