
-- Table for subscription promotions (coupons + global discounts)
CREATE TABLE public.subscription_promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE, -- NULL for global/automatic promos
  type TEXT NOT NULL DEFAULT 'coupon' CHECK (type IN ('coupon', 'global')),
  discount_type TEXT NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC NOT NULL DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER, -- NULL = unlimited
  current_uses INTEGER NOT NULL DEFAULT 0,
  applicable_tiers TEXT[], -- NULL = all tiers
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_promotions ENABLE ROW LEVEL SECURITY;

-- Anyone can view active promotions (needed for sensei to apply coupons)
CREATE POLICY "Anyone authenticated can view active promotions"
  ON public.subscription_promotions
  FOR SELECT
  USING (is_active = true OR is_staff(auth.uid()));

-- Only admin can manage promotions
CREATE POLICY "Admin can manage promotions"
  ON public.subscription_promotions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_subscription_promotions_updated_at
  BEFORE UPDATE ON public.subscription_promotions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
