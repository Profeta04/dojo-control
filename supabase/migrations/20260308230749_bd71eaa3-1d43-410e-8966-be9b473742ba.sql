
-- 1. Add guardian_name and guardian_phone to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS guardian_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS guardian_phone text;

-- 2. Update handle_new_user to store guardian_name and guardian_phone
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _is_guardian boolean;
  _reg_status text;
BEGIN
  _is_guardian := COALESCE((NEW.raw_user_meta_data ->> 'is_guardian')::boolean, false);
  
  IF _is_guardian THEN
    _reg_status := 'aprovado';
  ELSE
    _reg_status := 'pendente';
  END IF;

  INSERT INTO public.profiles (user_id, name, email, registration_status, dojo_id, birth_date, guardian_email, guardian_name, guardian_phone, guardian_user_id, belt_grade)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'Novo Usuário'),
    NEW.email,
    _reg_status,
    CASE WHEN NEW.raw_user_meta_data ->> 'dojo_id' IS NOT NULL AND NEW.raw_user_meta_data ->> 'dojo_id' != ''
         THEN (NEW.raw_user_meta_data ->> 'dojo_id')::uuid
         ELSE NULL END,
    CASE WHEN NEW.raw_user_meta_data ->> 'birth_date' IS NOT NULL AND NEW.raw_user_meta_data ->> 'birth_date' != ''
         THEN (NEW.raw_user_meta_data ->> 'birth_date')::date
         ELSE NULL END,
    NEW.raw_user_meta_data ->> 'guardian_email',
    NEW.raw_user_meta_data ->> 'guardian_name',
    NEW.raw_user_meta_data ->> 'guardian_phone',
    CASE WHEN NEW.raw_user_meta_data ->> 'guardian_user_id' IS NOT NULL AND NEW.raw_user_meta_data ->> 'guardian_user_id' != ''
         THEN (NEW.raw_user_meta_data ->> 'guardian_user_id')::uuid
         ELSE NULL END,
    COALESCE(NEW.raw_user_meta_data ->> 'belt_grade', 'branca')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    dojo_id = COALESCE(EXCLUDED.dojo_id, profiles.dojo_id),
    birth_date = COALESCE(EXCLUDED.birth_date, profiles.birth_date),
    guardian_email = COALESCE(EXCLUDED.guardian_email, profiles.guardian_email),
    guardian_name = COALESCE(EXCLUDED.guardian_name, profiles.guardian_name),
    guardian_phone = COALESCE(EXCLUDED.guardian_phone, profiles.guardian_phone),
    guardian_user_id = COALESCE(EXCLUDED.guardian_user_id, profiles.guardian_user_id),
    belt_grade = COALESCE(EXCLUDED.belt_grade, profiles.belt_grade);
  
  IF _is_guardian THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3. Restrict student self-update on profiles to safe fields only
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  -- Students cannot change sensitive fields via this policy
  -- belt_grade, registration_status, is_blocked, is_federated, is_scholarship, approved_at, approved_by, blocked_reason are managed by staff
);

-- 4. Restrict student self-update on student_belts (remove the policy that lets users update own belts freely)
DROP POLICY IF EXISTS "Users can update own belts" ON public.student_belts;

-- 5. Restrict student self-update on payments (only allow receipt_url and receipt_status changes)
DROP POLICY IF EXISTS "Students can update own payment receipt" ON public.payments;
CREATE POLICY "Students can update own payment receipt"
ON public.payments
FOR UPDATE
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());
