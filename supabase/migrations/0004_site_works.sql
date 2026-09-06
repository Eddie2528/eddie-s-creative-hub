-- Per-piece overrides for the works section: title, category, order within the
-- campaign, and whether it shows. The catalogue in src/lib/works-catalogue.ts
-- supplies everything else, so a piece with no row here still appears.

create table if not exists public.site_works (
  id         text primary key,
  title      text        not null,
  category   text        not null,
  sort       integer     not null default 0,
  visible    boolean     not null default true,
  updated_at timestamptz not null default now()
);

alter table public.site_works enable row level security;

revoke all on public.site_works from anon;
revoke all on public.site_works from authenticated;
grant all on public.site_works to service_role;
