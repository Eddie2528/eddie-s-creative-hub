-- The link a visit came in on, when it was tagged.
--
-- A referrer answers "which site sent them" and nothing else, and the links
-- that matter most here send no referrer at all: the address on a PDF CV, one
-- pasted into an email or LINE, a QR code. All of those arrive as Direct,
-- which is the bucket that tells you least.
--
-- ?utm_source= on a link Eddie sends fixes that — he decides what the channel
-- is called, because he is the one who put the link there. utm_source lands in
-- the existing `source` column (it is the same question, better answered), and
-- utm_campaign lands here, so one channel can carry several rounds of sending.
--
-- Set on the 'visit' row only, like the other three, and only when the link
-- carried a tag.

alter table public.site_events add column if not exists campaign text;
