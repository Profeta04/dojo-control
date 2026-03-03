-- Allow staff (admin/sensei/dono) to upload receipts on behalf of students
CREATE POLICY "Staff can upload receipts"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'payment-receipts'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'sensei'::app_role)
    OR has_role(auth.uid(), 'dono'::app_role)
  )
);

-- Allow staff to update/overwrite receipts
CREATE POLICY "Staff can update receipts"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'payment-receipts'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'sensei'::app_role)
    OR has_role(auth.uid(), 'dono'::app_role)
  )
);