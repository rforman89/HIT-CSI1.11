-- Storage replacement requires SELECT as well as INSERT and UPDATE.
-- Limit object metadata access to admins; existing public photo URLs stay unchanged.
CREATE POLICY "admins can select suspect photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'suspect-photos' AND (SELECT public.is_admin()));
