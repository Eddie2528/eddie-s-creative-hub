-- Lock down lead-files (private)
DROP POLICY IF EXISTS "No public access to lead files" ON storage.objects;
CREATE POLICY "No public access to lead files"
ON storage.objects FOR ALL TO anon, authenticated
USING (bucket_id <> 'lead-files' AND false)
WITH CHECK (false);

DROP POLICY IF EXISTS "Service role manages lead files" ON storage.objects;
CREATE POLICY "Service role manages lead files"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'lead-files')
WITH CHECK (bucket_id = 'lead-files');

-- site-assets: public read only
DROP POLICY IF EXISTS "Public can read site assets" ON storage.objects;
CREATE POLICY "Public can read site assets"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'site-assets');

DROP POLICY IF EXISTS "Service role manages site assets" ON storage.objects;
CREATE POLICY "Service role manages site assets"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'site-assets')
WITH CHECK (bucket_id = 'site-assets');
