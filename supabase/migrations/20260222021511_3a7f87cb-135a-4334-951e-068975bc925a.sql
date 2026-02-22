
-- Step 1: Migrate all dojo_owners data into dojo_senseis (avoid duplicates)
INSERT INTO public.dojo_senseis (dojo_id, sensei_id)
SELECT do2.dojo_id, do2.user_id
FROM public.dojo_owners do2
WHERE NOT EXISTS (
  SELECT 1 FROM public.dojo_senseis ds
  WHERE ds.dojo_id = do2.dojo_id AND ds.sensei_id = do2.user_id
);

-- Step 2: Migrate all users with role 'dono' to 'sensei' (avoid duplicates)
INSERT INTO public.user_roles (user_id, role)
SELECT ur.user_id, 'sensei'::app_role
FROM public.user_roles ur
WHERE ur.role = 'dono'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur2
  WHERE ur2.user_id = ur.user_id AND ur2.role = 'sensei'
);

-- Step 3: Delete the old 'dono' role entries
DELETE FROM public.user_roles WHERE role = 'dono';

-- Step 4: Update RLS policies on dojo_subscriptions to use dojo_senseis instead of dojo_owners
DROP POLICY IF EXISTS "Dojo owners can insert own subscriptions" ON public.dojo_subscriptions;
DROP POLICY IF EXISTS "Dojo owners can update own subscriptions" ON public.dojo_subscriptions;
DROP POLICY IF EXISTS "Dojo owners can view own subscriptions" ON public.dojo_subscriptions;

CREATE POLICY "Dojo senseis can insert own subscriptions"
ON public.dojo_subscriptions FOR INSERT
WITH CHECK (dojo_id IN (
  SELECT dojo_id FROM dojo_senseis WHERE sensei_id = auth.uid()
));

CREATE POLICY "Dojo senseis can update own subscriptions"
ON public.dojo_subscriptions FOR UPDATE
USING (dojo_id IN (
  SELECT dojo_id FROM dojo_senseis WHERE sensei_id = auth.uid()
));

CREATE POLICY "Dojo senseis can view own subscriptions"
ON public.dojo_subscriptions FOR SELECT
USING (dojo_id IN (
  SELECT dojo_id FROM dojo_senseis WHERE sensei_id = auth.uid()
));

-- Step 5: Update settings RLS to include sensei
DROP POLICY IF EXISTS "Admins can manage settings" ON public.settings;
CREATE POLICY "Staff can manage settings"
ON public.settings FOR ALL
USING (is_staff(auth.uid()));

-- Step 6: Drop dojo_owners table
DROP TABLE IF EXISTS public.dojo_owners;
