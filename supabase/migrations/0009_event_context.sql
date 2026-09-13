-- Where a visit came from, on what kind of device, from which country — the
-- three breakdowns Lovable's own Analytics tab shows and the back-office
-- couldn't, because Lovable has no API to read them back out. Recording them
-- here is the only way to have every number in one place.
--
-- Set on the 'visit' row only; every other row leaves them null. Nothing here
-- identifies anyone: the source is a hostname with no path or query, the
-- device is one of three words parsed from the user agent and never the agent
-- itself, and the country is the two letters Cloudflare already puts on the
-- request. No IP address is stored, and none of it is tied to anything but a
-- random per-tab id that expires with the tab.

alter table public.site_events add column if not exists source  text;
alter table public.site_events add column if not exists device  text;
alter table public.site_events add column if not exists country text;

alter table public.site_events drop constraint if exists site_events_device_check;
alter table public.site_events add  constraint site_events_device_check
  check (device is null or device in ('mobile', 'tablet', 'desktop'));

-- Two letters, or nothing. Cloudflare sends XX and T1 for "unknown" and Tor,
-- which say nothing worth a row of its own.
alter table public.site_events drop constraint if exists site_events_country_check;
alter table public.site_events add  constraint site_events_country_check
  check (country is null or country ~ '^[A-Z]{2}$');
