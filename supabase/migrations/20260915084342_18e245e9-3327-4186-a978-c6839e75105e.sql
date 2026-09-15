-- Re-assert the leads lockdown so a re-run of the old 0001 migration cannot reopen it.
REVOKE ALL ON public.leads FROM anon, authenticated;
GRANT ALL ON public.leads TO service_role;

DROP POLICY IF EXISTS "anon can submit a lead" ON public.leads;
DROP POLICY IF EXISTS "authenticated can read leads" ON public.leads;
DROP POLICY IF EXISTS "authenticated can update leads" ON public.leads;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No public read of leads" ON public.leads;
CREATE POLICY "No public read of leads" ON public.leads FOR SELECT TO anon, authenticated USING (false);
DROP POLICY IF EXISTS "No public insert of leads" ON public.leads;
CREATE POLICY "No public insert of leads" ON public.leads FOR INSERT TO anon, authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "No public update of leads" ON public.leads;
CREATE POLICY "No public update of leads" ON public.leads FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "No public delete of leads" ON public.leads;
CREATE POLICY "No public delete of leads" ON public.leads FOR DELETE TO anon, authenticated USING (false);
DROP POLICY IF EXISTS "Service role manages leads" ON public.leads;
CREATE POLICY "Service role manages leads" ON public.leads FOR ALL TO service_role USING (true) WITH CHECK (true);
