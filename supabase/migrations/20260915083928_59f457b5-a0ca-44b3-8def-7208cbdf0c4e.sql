-- Leads are written and read only by trusted server-side code using the
-- service role, which bypasses RLS. Make that intent explicit instead of
-- relying on "no policies means no access".

REVOKE ALL ON public.leads FROM anon;
REVOKE ALL ON public.leads FROM authenticated;
GRANT ALL ON public.leads TO service_role;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No public read of leads" ON public.leads;
DROP POLICY IF EXISTS "No public insert of leads" ON public.leads;
DROP POLICY IF EXISTS "No public update of leads" ON public.leads;
DROP POLICY IF EXISTS "No public delete of leads" ON public.leads;

CREATE POLICY "No public read of leads"
  ON public.leads FOR SELECT TO anon, authenticated USING (false);

CREATE POLICY "No public insert of leads"
  ON public.leads FOR INSERT TO anon, authenticated WITH CHECK (false);

CREATE POLICY "No public update of leads"
  ON public.leads FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "No public delete of leads"
  ON public.leads FOR DELETE TO anon, authenticated USING (false);

CREATE POLICY "Service role manages leads"
  ON public.leads FOR ALL TO service_role USING (true) WITH CHECK (true);