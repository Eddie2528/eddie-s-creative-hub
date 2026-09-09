-- A file a visitor attaches to the contact form.
--
-- Run this in Cloud → SQL editor. Lovable does not apply these files on push.

alter table public.leads
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_size integer,
  add column if not exists attachment_type text;

-- Private, unlike site-assets. Someone attaching a brief or a job description
-- is sending it to Eddie, not publishing it: nothing here may be readable from
-- a guessable URL. Only the service role reaches it, and the back-office hands
-- out short-lived signed links.
--
-- storage.objects already has RLS on with no policies, which denies anon and
-- authenticated everything. That is the intended state — do not add policies.
insert into storage.buckets (id, name, public, file_size_limit)
values ('lead-files', 'lead-files', false, 5242880)
on conflict (id) do nothing;
