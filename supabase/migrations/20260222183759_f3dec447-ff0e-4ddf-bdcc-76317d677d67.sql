
-- Bug reports table
CREATE TABLE public.bug_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'aberto',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own bug reports"
ON public.bug_reports FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own bug reports"
ON public.bug_reports FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all bug reports"
ON public.bug_reports FOR SELECT
USING (is_staff(auth.uid()));

CREATE POLICY "Staff can update bug reports"
ON public.bug_reports FOR UPDATE
USING (is_staff(auth.uid()));

CREATE TRIGGER update_bug_reports_updated_at
BEFORE UPDATE ON public.bug_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User onboarding tracking table
CREATE TABLE public.user_onboarding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  welcome_seen BOOLEAN NOT NULL DEFAULT false,
  tabs_seen JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding"
ON public.user_onboarding FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding"
ON public.user_onboarding FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding"
ON public.user_onboarding FOR UPDATE
USING (auth.uid() = user_id);

CREATE TRIGGER update_user_onboarding_updated_at
BEFORE UPDATE ON public.user_onboarding
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for bug report screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('bug-screenshots', 'bug-screenshots', false);

CREATE POLICY "Users can upload bug screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'bug-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own bug screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'bug-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Staff can view all bug screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'bug-screenshots' AND is_staff(auth.uid()));
