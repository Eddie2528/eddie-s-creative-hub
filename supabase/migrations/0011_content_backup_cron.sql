-- The monthly content backup, taken by the database itself.
--
-- supabase/export-content.sql still exists and still works; this is the same
-- dump, on a schedule, without anyone remembering. It protects the accident
-- that is actually likely — deleting the wrong thing in the back-office — by
-- keeping the last twelve months of snapshots inside the database. It does not
-- protect against losing the database itself, so the file saved under
-- backups/ is still worth taking now and then.

create extension if not exists pg_cron;

create table if not exists public.content_backups (
  id       uuid primary key default gen_random_uuid(),
  taken_at timestamptz not null default now(),
  body     text        not null
);

create index if not exists content_backups_taken_at_idx
  on public.content_backups (taken_at desc);

-- Same lockdown as every other table here: reachable only by the service role,
-- which is to say only by server code. A snapshot is a copy of everything on
-- the site, so it is worth no less care than the original.
alter table public.content_backups enable row level security;
revoke all on public.content_backups from anon;
revoke all on public.content_backups from authenticated;
grant all on public.content_backups to service_role;

drop policy if exists "No public access" on public.content_backups;
create policy "No public access"
  on public.content_backups for all to anon, authenticated
  using (false) with check (false);

drop policy if exists "Service role manages rows" on public.content_backups;
create policy "Service role manages rows"
  on public.content_backups for all to service_role
  using (true) with check (true);

-- Builds exactly what export-content.sql returns, so a row here restores the
-- same way: copy the body, paste it into the SQL editor, run it.
create or replace function public.take_content_backup()
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  dump text;
begin
  select
    '-- Eddie''s Creative Hub — content backup, taken ' || to_char(now(), 'YYYY-MM-DD') || E'\n' ||
    '-- Restore: paste into Lovable Cloud -> SQL editor and run. Safe to re-run.' || E'\n' ||
    '-- Rows here overwrite by key/id; anything added since is left alone.' || E'\n\n' ||
    '-- site_content (' || (select count(*) from site_content) || E' rows)\n' ||
    coalesce((
      select string_agg(
        format(
          'insert into site_content (key, value) values (%L, %L) on conflict (key) do update set value = excluded.value, updated_at = now();',
          key, value
        ),
        E'\n' order by key
      )
      from site_content
    ), '') ||
    E'\n\n-- site_works (' || (select count(*) from site_works) || E' rows)\n' ||
    coalesce((
      select string_agg(
        format(
          'insert into site_works (id, title, category, sort, visible, asset, poster, campaign, kind) values (%L, %L, %L, %s, %L, %L, %L, %L, %L) on conflict (id) do update set title = excluded.title, category = excluded.category, sort = excluded.sort, visible = excluded.visible, asset = excluded.asset, poster = excluded.poster, campaign = excluded.campaign, kind = excluded.kind, updated_at = now();',
          id, title, category, sort, visible, asset, poster, campaign, kind
        ),
        E'\n' order by id
      )
      from site_works
    ), '') || E'\n'
  into dump;

  insert into public.content_backups (body) values (dump);

  -- Twelve months is a year of history at roughly 30 kB a snapshot. Older ones
  -- answer nothing the newest twelve don't.
  delete from public.content_backups
  where id not in (
    select id from public.content_backups order by taken_at desc limit 12
  );
end
$fn$;

-- Postgres grants EXECUTE on a new function to PUBLIC, and Supabase serves
-- every function in this schema as an RPC endpoint — so without this, anyone
-- with the publishable key could call a SECURITY DEFINER function as often as
-- they liked. The retention rule caps what that costs at twelve rows, which is
-- exactly the problem: twelve junk snapshots push out the twelve real ones.
-- Only the cron job needs to run this, and it runs as the owner.
revoke execute on function public.take_content_backup() from public;
revoke execute on function public.take_content_backup() from anon;
revoke execute on function public.take_content_backup() from authenticated;

-- 03:00 UTC on the 1st — mid-morning in Bangkok, and nowhere near a deploy.
select cron.unschedule('content-backup-monthly')
where exists (select 1 from cron.job where jobname = 'content-backup-monthly');

select cron.schedule(
  'content-backup-monthly',
  '0 3 1 * *',
  $cron$select public.take_content_backup()$cron$
);

-- One now, so there is something in the table before the 1st comes round.
select public.take_content_backup();
