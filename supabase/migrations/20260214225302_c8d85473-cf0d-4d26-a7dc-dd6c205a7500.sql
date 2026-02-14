-- Create receipt status enum
CREATE TYPE public.receipt_status AS ENUM ('pendente_verificacao', 'aprovado', 'rejeitado');

-- Add receipt_status column to payments
ALTER TABLE public.payments
  ADD COLUMN receipt_status public.receipt_status DEFAULT NULL;

-- Set receipt_status for existing payments that already have a receipt_url
UPDATE public.payments
  SET receipt_status = 'pendente_verificacao'
  WHERE receipt_url IS NOT NULL AND receipt_status IS NULL;