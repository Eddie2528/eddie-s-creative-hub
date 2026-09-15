-- Lead capture for the "Get in Touch" form.
-- Columns mirror the inputs in src/components/site/LeadDialog.tsx.

create table if not exists public.leads (
  id         uuid primary key default gen_random_uuid(),
  name       text        not null,
  email      text        not null,
  phone      text        not null,
  message    text,
  status     text        not null default 'new',
  source     text,
  created_at timestamptz not null default now(),
  constraint leads_status_check check (status in ('new', 'contacted', 'archived'))
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx     on public.leads (status);

-- NOTE (security): the original permissive grants and policies below were removed.
-- They granted SELECT/UPDATE on public.leads to the `authenticated` role and an
-- anon INSERT policy, which exposed lead PII to any signed-up user.
-- The leads table is now service-role only; see the lockdown migrations.
-- Do NOT reintroduce blanket `authenticated` access. If a per-owner view is ever
-- needed, add a narrowly scoped policy matching the owner's user_id.

-- NOTE (security): the original permissive grants/policies were removed.
-- They granted SELECT/UPDATE on public.leads to `authenticated` and allowed anon
-- INSERT, exposing lead PII to any signed-up user. Leads are service-role only.
-- Do NOT reintroduce blanket `authenticated` access. If a per-owner view is ever
-- needed, scope the policy to the owner's user_id.
grant all on public.leads to service_role;
alter table public.leads enable row level security;
alter table public.leads force row level security;
