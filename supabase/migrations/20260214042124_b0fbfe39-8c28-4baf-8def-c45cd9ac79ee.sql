
-- Allow senseis to update their linked dojos (for pix_key and other settings)
CREATE POLICY "Senseis can update their dojos"
ON public.dojos
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.dojo_senseis ds
    WHERE ds.dojo_id = dojos.id
    AND ds.sensei_id = auth.uid()
  )
);
