DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['site_content','site_works','site_events'] LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "No public access" ON public.%I', t);
    EXECUTE format('CREATE POLICY "No public access" ON public.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)', t);
    EXECUTE format('DROP POLICY IF EXISTS "Service role manages rows" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Service role manages rows" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;