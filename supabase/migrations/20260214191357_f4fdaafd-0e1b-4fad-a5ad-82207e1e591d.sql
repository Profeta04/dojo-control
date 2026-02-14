-- Add is_federated column to profiles
ALTER TABLE public.profiles ADD COLUMN is_federated boolean NOT NULL DEFAULT false;

-- Create avatars storage bucket (public for display)
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Anyone can view avatars (public bucket)
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Users can upload their own avatar (folder = user_id)
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Staff can manage all avatars
CREATE POLICY "Staff can manage all avatars"
ON storage.objects FOR ALL
USING (bucket_id = 'avatars' AND public.is_staff(auth.uid()));