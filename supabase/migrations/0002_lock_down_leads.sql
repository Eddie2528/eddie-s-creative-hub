-- Every read and write now goes through a server function using the service
-- role, which bypasses RLS, so no browser-facing role needs access to leads.
--
-- The policies this replaces granted select and update to `authenticated`.
-- That reads as "signed-in users", but Supabase accepts sign-ups straight
-- through its auth API whether or not the site offers a login form — so in
-- practice it meant anyone willing to register could read every lead.

drop policy if exists "authenticated can read leads"   on public.leads;
drop policy if exists "authenticated can update leads" on public.leads;
drop policy if exists "anon can submit a lead"         on public.leads;

revoke all on public.leads from anon;
revoke all on public.leads from authenticated;

-- RLS stays on: with no policy left, any request carrying an anon or
-- authenticated key is denied even if a grant is restored by accident.
alter table public.leads enable row level security;

-- Reaching the table at all requires the service role, and reaching the
-- service role requires server-side code. Anything that later reads leads for
-- a person must authorize that person explicitly — being signed in is not
-- authorization.
grant all on public.leads to service_role;
