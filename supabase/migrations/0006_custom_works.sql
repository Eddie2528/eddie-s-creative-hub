-- Pieces added from the back-office aren't in the code catalogue, so they have
-- to carry their own campaign and kind. Catalogue pieces leave these null and
-- keep taking both from the code.

alter table public.site_works add column if not exists campaign text;
alter table public.site_works add column if not exists kind     text;

alter table public.site_works drop constraint if exists site_works_kind_check;
alter table public.site_works add  constraint site_works_kind_check
  check (kind is null or kind in ('image', 'video'));
