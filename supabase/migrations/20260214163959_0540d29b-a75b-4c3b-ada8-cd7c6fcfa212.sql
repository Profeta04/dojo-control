
-- ============================================================
-- FIX: dojo-logos storage bucket - restrict write access to staff
-- ============================================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view dojo logos" ON storage.objects;

-- Recreate SELECT policy (public read is fine for logos)
CREATE POLICY "Public can view dojo logos" ON storage.objects
FOR SELECT USING (bucket_id = 'dojo-logos');

-- Restrict INSERT to staff (admin/dono) and senseis of the dojo
CREATE POLICY "Staff can upload dojo logos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'dojo-logos'
  AND (
    public.is_staff(auth.uid())
    OR public.has_role(auth.uid(), 'sensei')
  )
);

-- Restrict UPDATE to staff and senseis
CREATE POLICY "Staff can update dojo logos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'dojo-logos'
  AND (
    public.is_staff(auth.uid())
    OR public.has_role(auth.uid(), 'sensei')
  )
);

-- Restrict DELETE to staff only
CREATE POLICY "Staff can delete dojo logos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'dojo-logos'
  AND public.is_staff(auth.uid())
);
