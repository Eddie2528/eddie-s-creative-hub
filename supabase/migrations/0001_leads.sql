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

alter table public.leads enable row level security;

-- The site is public and unauthenticated, so visitors may only ever write.
-- Deliberately no select/update/delete policy for anon: without one, RLS denies
-- them, which keeps every stored lead unreadable from the browser.
drop policy if exists "anon can submit a lead" on public.leads;
create policy "anon can submit a lead"
  on public.leads for insert
  to anon, authenticated
  with check (true);

-- Signed-in users (the back-office in PRD.md §4) can read and work the leads.
drop policy if exists "authenticated can read leads" on public.leads;
create policy "authenticated can read leads"
  on public.leads for select
  to authenticated
  using (true);

drop policy if exists "authenticated can update leads" on public.leads;
create policy "authenticated can update leads"
  on public.leads for update
  to authenticated
  using (true)
  with check (true);
