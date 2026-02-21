
-- Table to manage dojo subscriptions with manual PIX payment
CREATE TABLE public.dojo_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dojo_id UUID NOT NULL REFERENCES public.dojos(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('basico', 'pro', 'premium')),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'ativo', 'expirado', 'cancelado')),
  receipt_url TEXT,
  receipt_submitted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dojo_subscriptions ENABLE ROW LEVEL SECURITY;

-- Staff (admin/dono/sensei) can manage all subscriptions
CREATE POLICY "Staff can manage subscriptions"
  ON public.dojo_subscriptions FOR ALL
  USING (is_staff(auth.uid()));

-- Dojo owners can view and insert their own subscriptions
CREATE POLICY "Dojo owners can view own subscriptions"
  ON public.dojo_subscriptions FOR SELECT
  USING (dojo_id IN (SELECT dojo_id FROM public.dojo_owners WHERE user_id = auth.uid()));

CREATE POLICY "Dojo owners can insert own subscriptions"
  ON public.dojo_subscriptions FOR INSERT
  WITH CHECK (dojo_id IN (SELECT dojo_id FROM public.dojo_owners WHERE user_id = auth.uid()));

CREATE POLICY "Dojo owners can update own subscriptions"
  ON public.dojo_subscriptions FOR UPDATE
  USING (dojo_id IN (SELECT dojo_id FROM public.dojo_owners WHERE user_id = auth.uid()));

-- Senseis can view subscriptions for their dojos
CREATE POLICY "Senseis can view dojo subscriptions"
  ON public.dojo_subscriptions FOR SELECT
  USING (dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid())));

-- Trigger for updated_at
CREATE TRIGGER update_dojo_subscriptions_updated_at
  BEFORE UPDATE ON public.dojo_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for subscription receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('subscription-receipts', 'subscription-receipts', false);

-- Storage policies for subscription receipts
CREATE POLICY "Dojo owners can upload receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'subscription-receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Staff can view receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'subscription-receipts' AND (is_staff(auth.uid()) OR auth.role() = 'authenticated'));
