-- Let the back-office point a piece at a different file, so swapping a film or
-- a key visual doesn't mean uploading under an exact filename. Null means "the
-- file named in the catalogue".

alter table public.site_works add column if not exists asset  text;
alter table public.site_works add column if not exists poster text;
