-- Content backup — run this in Lovable Cloud → SQL editor, copy the single
-- cell it returns, and save it as backups/YYYY-MM-DD-content.sql outside this
-- repo. Reading costs no credits, and once a month is enough.
--
-- What it protects: every role, campaign, ordering, logo pick, photo pick and
-- line of copy Eddie has typed into the back-office. All of it lives in
-- site_content and site_works and nowhere else — delete the wrong thing and
-- the site drops back to the defaults in the code, which are no longer what
-- the site says. There is no undo and no snapshot.
--
-- What it does NOT cover: the leads table (real enquiries — export that
-- separately if it ever matters), and the files in the site-assets bucket.
--
-- What comes out is a file of `insert … on conflict do update` statements.
-- Restoring is pasting that file back into the SQL editor: it overwrites the
-- rows it names by key/id and leaves anything added since alone. It never
-- deletes, so a restore can't cost you newer work.

select
  '-- Eddie''s Creative Hub — content backup, taken ' || to_char(now(), 'YYYY-MM-DD') || E'\n' ||
  '-- Restore: paste into Lovable Cloud -> SQL editor and run. Safe to re-run.' || E'\n' ||
  '-- Rows here overwrite by key/id; anything added since is left alone.' || E'\n\n' ||
  '-- site_content (' || (select count(*) from site_content) || E' rows)\n' ||
  (
    select string_agg(
      format(
        'insert into site_content (key, value) values (%L, %L) on conflict (key) do update set value = excluded.value, updated_at = now();',
        key, value
      ),
      E'\n' order by key
    )
    from site_content
  ) ||
  E'\n\n-- site_works (' || (select count(*) from site_works) || E' rows)\n' ||
  (
    select string_agg(
      format(
        'insert into site_works (id, title, category, sort, visible, asset, poster, campaign, kind) values (%L, %L, %L, %s, %L, %L, %L, %L, %L) on conflict (id) do update set title = excluded.title, category = excluded.category, sort = excluded.sort, visible = excluded.visible, asset = excluded.asset, poster = excluded.poster, campaign = excluded.campaign, kind = excluded.kind, updated_at = now();',
        id, title, category, sort, visible, asset, poster, campaign, kind
      ),
      E'\n' order by id
    )
    from site_works
  ) || E'\n' as backup;
