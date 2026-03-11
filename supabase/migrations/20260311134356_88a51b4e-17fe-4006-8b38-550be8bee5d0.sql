
-- Create announcements table
CREATE TABLE public.announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dojo_id uuid NOT NULL REFERENCES public.dojos(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  image_url text,
  is_urgent boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Staff can manage announcements in their dojos
CREATE POLICY "Staff can manage announcements"
ON public.announcements FOR ALL
TO authenticated
USING (is_staff(auth.uid()));

-- Senseis can manage own dojo announcements
CREATE POLICY "Senseis can manage dojo announcements"
ON public.announcements FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'sensei'::app_role)
  AND dojo_id IN (SELECT get_sensei_dojo_ids(auth.uid()))
);

-- Students can view their dojo announcements
CREATE POLICY "Students can view dojo announcements"
ON public.announcements FOR SELECT
TO authenticated
USING (dojo_id = get_user_dojo_id_safe(auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;

-- Create storage bucket for announcement images
INSERT INTO storage.buckets (id, name, public) VALUES ('announcement-images', 'announcement-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for announcement images
CREATE POLICY "Staff can upload announcement images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'announcement-images' AND is_staff(auth.uid()));

CREATE POLICY "Staff can update announcement images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'announcement-images' AND is_staff(auth.uid()));

CREATE POLICY "Staff can delete announcement images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'announcement-images' AND is_staff(auth.uid()));

CREATE POLICY "Anyone can view announcement images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'announcement-images');
