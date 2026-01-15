-- Add birth_date and guardian fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS guardian_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS guardian_email TEXT;

-- Create index for guardian lookups
CREATE INDEX IF NOT EXISTS idx_profiles_guardian_user_id ON public.profiles(guardian_user_id);

-- Create RLS policy for guardians to access their children's profiles
CREATE POLICY "Guardians can view their children profiles"
ON public.profiles
FOR SELECT
USING (guardian_user_id = auth.uid());

-- Create RLS policy for guardians to update their children's profiles
CREATE POLICY "Guardians can update their children profiles"
ON public.profiles
FOR UPDATE
USING (guardian_user_id = auth.uid());