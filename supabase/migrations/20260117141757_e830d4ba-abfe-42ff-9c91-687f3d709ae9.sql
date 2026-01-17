-- =============================================
-- SECURITY FIX: Restrict profiles visibility
-- =============================================

-- Drop the overly permissive policy that exposes all profiles to any authenticated user
DROP POLICY IF EXISTS "Authenticated can view all profiles" ON public.profiles;

-- Create a helper function to check if a user is a guardian of a specific profile
CREATE OR REPLACE FUNCTION public.is_guardian_of(_guardian_id uuid, _profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _profile_user_id
      AND guardian_user_id = _guardian_id
  )
$$;

-- Create restrictive SELECT policy for profiles:
-- 1. Users can view their own profile
-- 2. Guardians can view their children's profiles  
-- 3. Admins and Senseis can view all profiles (needed for management)
CREATE POLICY "Users can view authorized profiles" 
ON public.profiles 
FOR SELECT 
USING (
  user_id = auth.uid()  -- Own profile
  OR guardian_user_id = auth.uid()  -- User is the guardian
  OR has_role(auth.uid(), 'admin'::app_role)  -- Admins see all
  OR has_role(auth.uid(), 'sensei'::app_role)  -- Senseis see all for class management
);

-- =============================================
-- SECURITY FIX: Allow guardians to view children's payments
-- =============================================

-- Add policy for guardians to view their children's payments
CREATE POLICY "Guardians can view children payments" 
ON public.payments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE profiles.user_id = payments.student_id 
      AND profiles.guardian_user_id = auth.uid()
  )
);

-- Also allow guardians to view their children's attendance
CREATE POLICY "Guardians can view children attendance"
ON public.attendance
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.user_id = attendance.student_id
      AND profiles.guardian_user_id = auth.uid()
  )
);

-- Also allow guardians to view their children's graduation history
CREATE POLICY "Guardians can view children graduation history"
ON public.graduation_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.user_id = graduation_history.student_id
      AND profiles.guardian_user_id = auth.uid()
  )
);

-- Also allow guardians to view their children's tasks
CREATE POLICY "Guardians can view children tasks"
ON public.tasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.user_id = tasks.assigned_to
      AND profiles.guardian_user_id = auth.uid()
  )
);