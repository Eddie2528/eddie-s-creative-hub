-- What visitors do on the page, in Eddie's own database rather than a
-- third-party's. Lovable's Analytics tab already counts visitors, sources and
-- devices; it cannot see a click on the CV button or whether anyone scrolled
-- as far as the contact form. This is those five moments and nothing else.
--
-- There is no IP address, user agent, referrer or anything a person could be
-- identified by. `visit` is a random id the page makes per tab session and
-- forgets when the tab closes — it exists only so "42 visits, 9 of them
-- reached the form" is answerable, and never leaves that session.

create table if not exists public.site_events (
  id         uuid primary key default gen_random_uuid(),
  name       text        not null,
  visit      text        not null,
  created_at timestamptz not null default now(),
  constraint site_events_name_check
    check (name in ('visit', 'works_seen', 'contact_seen', 'form_opened', 'cv_download'))
);

create index if not exists site_events_created_at_idx on public.site_events (created_at desc);

-- One row per thing per visit. Counting rows is then counting visits that did
-- it, which is the only number worth reading here — a visitor who clicks the
-- CV button twice hasn't taken two copies of anything. It also means a reload
-- or a stuck retry can't inflate anything.
create unique index if not exists site_events_visit_name_idx
  on public.site_events (visit, name);

alter table public.site_events enable row level security;

-- Written by a server function holding the service role, which bypasses RLS,
-- and read only by the back-office behind requireAdmin. Nothing here is
-- reachable from a browser: no policy exists, and with RLS on that denies
-- anon and authenticated everything. Same shape as site_content.
revoke all on public.site_events from anon;
revoke all on public.site_events from authenticated;
grant all on public.site_events to service_role;
