-- Editable copy for the site, one row per field. Keys and their fallback text
-- live in src/lib/site-content.ts; a missing row just means "still the default",
-- so the site renders correctly against an empty table.

create table if not exists public.site_content (
  key        text primary key,
  value      text        not null,
  updated_at timestamptz not null default now()
);

-- Same posture as leads: only the service role touches it, and only server-side
-- code holds that. Visitors read this copy through the page the server renders,
-- never by querying the table.
alter table public.site_content enable row level security;

revoke all on public.site_content from anon;
revoke all on public.site_content from authenticated;
grant all on public.site_content to service_role;
