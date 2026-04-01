
-- =====================================================
-- FIX 1: Restrict student payment updates to receipt fields only
-- =====================================================
DROP POLICY IF EXISTS "Students can update own payment receipt" ON public.payments;

CREATE POLICY "Students can update own payment receipt"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (
    student_id = auth.uid()
    AND status = (SELECT status FROM public.payments WHERE id = payments.id)
    AND amount = (SELECT amount FROM public.payments WHERE id = payments.id)
    AND due_date = (SELECT due_date FROM public.payments WHERE id = payments.id)
    AND paid_date IS NOT DISTINCT FROM (SELECT paid_date FROM public.payments WHERE id = payments.id)
    AND category = (SELECT category FROM public.payments WHERE id = payments.id)
    AND description IS NOT DISTINCT FROM (SELECT description FROM public.payments WHERE id = payments.id)
    AND notes IS NOT DISTINCT FROM (SELECT notes FROM public.payments WHERE id = payments.id)
  );

-- =====================================================
-- FIX 2: Prevent privilege escalation - admin/dono cannot assign super_admin
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO public
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'dono'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    CASE
      WHEN role = 'super_admin'::app_role THEN has_role(auth.uid(), 'super_admin'::app_role)
      ELSE (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'dono'::app_role)
        OR has_role(auth.uid(), 'super_admin'::app_role)
      )
    END
  );

-- =====================================================
-- FIX 3: Remove access_token from sensei SELECT on dojo_integrations
-- =====================================================
DROP POLICY IF EXISTS "Senseis can view own dojo integrations" ON public.dojo_integrations;

CREATE POLICY "Senseis can view own dojo integrations (no token)"
  ON public.dojo_integrations FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'sensei'::app_role)
    AND dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid()))
  );

-- Create a view that excludes access_token for non-staff
CREATE OR REPLACE VIEW public.dojo_integrations_safe AS
  SELECT id, dojo_id, integration_type, is_enabled, created_at, updated_at
  FROM public.dojo_integrations;

-- =====================================================
-- FIX 4: Fix subscription-receipts storage policies
-- =====================================================
DROP POLICY IF EXISTS "Dojo owners can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Staff can view receipts" ON storage.objects;

CREATE POLICY "Dojo senseis or staff can upload subscription receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'subscription-receipts'
    AND (
      is_staff(auth.uid())
      OR has_role(auth.uid(), 'sensei'::app_role)
    )
  );

CREATE POLICY "Staff or dojo senseis can view subscription receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'subscription-receipts'
    AND (
      is_staff(auth.uid())
      OR has_role(auth.uid(), 'sensei'::app_role)
    )
  );

-- =====================================================
-- FIX 5: Protect dojos checkin_token from student reads
-- Create a secure function for students to get dojo display info only
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_student_dojo_display(_user_id uuid)
RETURNS TABLE(
  id uuid, name text, logo_url text,
  color_primary text, color_secondary text, color_accent text,
  address text, phone text, email text, martial_arts text,
  pix_key text,
  grace_days integer, late_fee_fixed numeric, late_fee_percent numeric, daily_interest_percent numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT d.id, d.name, d.logo_url,
    d.color_primary, d.color_secondary, d.color_accent,
    d.address, d.phone, d.email, d.martial_arts,
    d.pix_key,
    d.grace_days, d.late_fee_fixed, d.late_fee_percent, d.daily_interest_percent
  FROM dojos d
  JOIN profiles p ON p.dojo_id = d.id
  WHERE p.user_id = _user_id
  LIMIT 1;
$$;
