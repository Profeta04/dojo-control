
-- Fix graduation_history: drop restrictive and recreate as permissive
DROP POLICY IF EXISTS "Admins can manage graduations" ON public.graduation_history;
DROP POLICY IF EXISTS "Authenticated can view graduations" ON public.graduation_history;

CREATE POLICY "Authenticated can view graduations"
ON public.graduation_history FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and senseis can manage graduations"
ON public.graduation_history FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sensei'::app_role) OR has_role(auth.uid(), 'dono'::app_role));

-- Fix profiles: drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Anyone authenticated can view profiles
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Admins, donos, and senseis can update any profile (for belt promotions, approvals, etc.)
CREATE POLICY "Staff can update profiles"
ON public.profiles FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dono'::app_role) OR has_role(auth.uid(), 'sensei'::app_role));
