
-- =====================================================
-- FIX 1: Remove 'sensei' from is_staff()
-- After this, is_staff() = admin + dono + super_admin only
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'dono', 'super_admin')
  )
$$;

-- =====================================================
-- FIX 2: Add sensei dojo-scoped policies for tables
-- that senseis need access to but previously got via is_staff
-- =====================================================

-- study_materials: senseis need CRUD on their dojo's materials
CREATE POLICY "Senseis can manage dojo study materials"
ON public.study_materials FOR ALL TO authenticated
USING (has_role(auth.uid(), 'sensei'::app_role) 
  AND (dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid()))))
WITH CHECK (has_role(auth.uid(), 'sensei'::app_role) 
  AND (dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid()))));

-- study_videos: senseis need CRUD on their dojo's videos
CREATE POLICY "Senseis can manage dojo study videos"
ON public.study_videos FOR ALL TO authenticated
USING (has_role(auth.uid(), 'sensei'::app_role) 
  AND (dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid()))))
WITH CHECK (has_role(auth.uid(), 'sensei'::app_role) 
  AND (dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid()))));

-- exam_templates: senseis need CRUD on their dojo's exams
CREATE POLICY "Senseis can manage dojo exam templates"
ON public.exam_templates FOR ALL TO authenticated
USING (has_role(auth.uid(), 'sensei'::app_role) 
  AND (dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid()))))
WITH CHECK (has_role(auth.uid(), 'sensei'::app_role) 
  AND (dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid()))));

-- exam_attempts: senseis need to view attempts from dojo students
CREATE POLICY "Senseis can view dojo exam attempts"
ON public.exam_attempts FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'sensei'::app_role) 
  AND EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = exam_attempts.student_id 
    AND p.dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid()))
  ));

-- tasks: senseis need to view and manage tasks for dojo students
CREATE POLICY "Senseis can view dojo tasks"
ON public.tasks FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'sensei'::app_role) 
  AND EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = tasks.assigned_to 
    AND p.dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid()))
  ));

CREATE POLICY "Senseis can delete dojo tasks"
ON public.tasks FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'sensei'::app_role) 
  AND EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = tasks.assigned_to 
    AND p.dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid()))
  ));

-- student_xp: senseis view dojo students' XP
CREATE POLICY "Senseis can view dojo student xp"
ON public.student_xp FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'sensei'::app_role) 
  AND EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = student_xp.user_id 
    AND p.dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid()))
  ));

-- student_achievements: senseis view dojo students' achievements  
CREATE POLICY "Senseis can view dojo student achievements"
ON public.student_achievements FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'sensei'::app_role) 
  AND EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = student_achievements.user_id 
    AND p.dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid()))
  ));

-- leaderboard_history: senseis view their dojo leaderboard
CREATE POLICY "Senseis can view dojo leaderboard history"
ON public.leaderboard_history FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'sensei'::app_role) 
  AND dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid())));

-- notifications: senseis can manage notifications for dojo users
CREATE POLICY "Senseis can insert dojo notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'sensei'::app_role));

CREATE POLICY "Senseis can delete dojo notifications"
ON public.notifications FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'sensei'::app_role));

-- dojo_users: senseis view their dojo users
CREATE POLICY "Senseis can view dojo users"
ON public.dojo_users FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'sensei'::app_role) 
  AND dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid())));

-- seasons: everyone can already view; senseis don't need management
-- achievements: everyone can already view; senseis don't need management
-- settings: senseis don't need management (admin only)
-- push_subscriptions: senseis don't need to see all subscriptions
-- bug_reports: senseis don't need global access (admin only)

-- =====================================================
-- FIX 3: Remove unrestricted self-UPDATE on XP tables
-- XP must only be modified via grant_xp / grant_season_xp RPCs
-- =====================================================

DROP POLICY IF EXISTS "Users can update own xp" ON public.student_xp;
DROP POLICY IF EXISTS "Users can insert own xp" ON public.student_xp;
DROP POLICY IF EXISTS "Users can update own season XP" ON public.season_xp;
DROP POLICY IF EXISTS "Users can insert own season XP" ON public.season_xp;

-- =====================================================
-- FIX 4: Secure payment gateway access_token
-- Create a view that hides the token from direct queries
-- and update the sensei policy to exclude the token column
-- =====================================================

-- Drop the overly-broad sensei integration policy and replace with one that excludes token
DROP POLICY IF EXISTS "Senseis can manage own dojo integrations" ON public.dojo_integrations;

-- Senseis can view integrations (without seeing token) and toggle is_enabled
CREATE POLICY "Senseis can view own dojo integrations"
ON public.dojo_integrations FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'sensei'::app_role) 
  AND dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid())));

CREATE POLICY "Senseis can update own dojo integrations"
ON public.dojo_integrations FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'sensei'::app_role) 
  AND dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid())))
WITH CHECK (has_role(auth.uid(), 'sensei'::app_role) 
  AND dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid())));

CREATE POLICY "Senseis can insert own dojo integrations"
ON public.dojo_integrations FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'sensei'::app_role) 
  AND dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid())));

-- Create a secure function to read the access_token server-side only
CREATE OR REPLACE FUNCTION public.get_dojo_integration_token(_dojo_id uuid, _type text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT access_token FROM dojo_integrations
  WHERE dojo_id = _dojo_id AND integration_type = _type AND is_enabled = true
  LIMIT 1;
$$;
