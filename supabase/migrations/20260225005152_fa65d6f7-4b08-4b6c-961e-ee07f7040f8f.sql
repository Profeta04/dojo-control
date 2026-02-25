
-- Table to store per-dojo integration credentials (separate from dojos to prevent student access)
CREATE TABLE public.dojo_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dojo_id uuid NOT NULL REFERENCES public.dojos(id) ON DELETE CASCADE,
  integration_type text NOT NULL DEFAULT 'mercadopago',
  access_token text,
  is_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(dojo_id, integration_type)
);

-- Enable RLS
ALTER TABLE public.dojo_integrations ENABLE ROW LEVEL SECURITY;

-- Only staff and senseis of the dojo can view/manage integrations
CREATE POLICY "Staff can manage all integrations"
  ON public.dojo_integrations FOR ALL
  USING (is_staff(auth.uid()));

CREATE POLICY "Senseis can manage own dojo integrations"
  ON public.dojo_integrations FOR ALL
  USING (
    has_role(auth.uid(), 'sensei'::app_role)
    AND dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid()))
  );

-- Trigger for updated_at
CREATE TRIGGER update_dojo_integrations_updated_at
  BEFORE UPDATE ON public.dojo_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add global admin toggle setting
INSERT INTO public.settings (key, value)
VALUES ('mercadopago_enabled', 'false')
ON CONFLICT (key) DO NOTHING;
