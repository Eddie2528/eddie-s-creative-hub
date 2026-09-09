# HANDOFF

Where the project stands and what to know before touching it. Read
[PRD.md](PRD.md) first for what the site is and why it's built this way; this
file is the state of play.

Last updated: 9 September 2026.

## Right now

The site is live at https://eddie-nakharin.lovable.app and everything on it
works: the contact form saves leads and takes an attachment, a new enquiry
reaches Eddie on Telegram and by email within seconds, 27 pieces of work across
8 campaigns display and play, the CV downloads, and the back-office at
`/admin/leads` edits every word, photo, document, campaign, role and logo.

It is aimed at one reader: a recruiter who clicked a link from Eddie's CV or
LinkedIn. That is why the hero carries an availability line, why the closing
section offers an address to copy rather than only a form, why a visitor can
attach a job description to the form, and why search ranking is not something
this site is trying to win — nobody arrives here from a search.

**Publishing lags the repo.** Pushing to `main` updates the Lovable *preview*
only; the live site keeps serving the previous build until someone presses
Publish. Anything pushed and not yet published is written but not live — check
before assuming a change is missing.

## The one thing that surprises everyone

**Reading fails quietly; writing fails loudly.** Every loader falls back to the
built-in defaults when the database is unreachable, so a missing table or an
expired session leaves the page looking perfectly normal — right up until the
first Save. If the back-office looks fine but won't save, suspect the session
first and the migrations second.

## Still to do

Nothing is broken and nothing is half-finished. The test leads are gone, and
both secrets that had been seen — the Telegram bot token and `ADMIN_PASSWORD` —
were rotated on 9 September 2026.

**A share image worth looking at.** Content → Page → Share image is empty, so
the link preview falls back to Lovable's automatic screenshot of the whole page
— legible at full size, a dark smudge at the size a card actually renders. A
1200×630 image carrying the name, the role being looked for and a photograph
would do the job the card is there to do. Publish, then re-scrape (below).

**A domain of its own** is the one change left that would move the needle, and
it is deliberately deferred rather than forgotten: it would replace the
`.lovable.app` link on the CV, it is what removes the "Edit with Lovable"
badge, and verifying it in Resend would let the notification email come from
Eddie rather than `onboarding@resend.dev`. Revisit it when the link starts
going to people who matter.

## Telling Eddie a lead arrived

Two independent channels — Telegram and email — run together and are both
best-effort: neither can fail a submission, and either one being unset says
nothing about the other.

**Telegram** works without paying. Message `@BotFather`, send `/newbot`, and
keep the token. Press Start in the new bot's own chat — Telegram won't let a bot
message someone who hasn't — then read the chat id from `@userinfobot` or from
`https://api.telegram.org/bot<TOKEN>/getUpdates` (`result[0].message.chat.id`).
Put the two into Secrets as `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.

**Email** has two providers and sends through exactly one, so a lead never
arrives twice:

- **Resend** wins whenever `RESEND_API_KEY` is set. Its shared
  `onboarding@resend.dev` sender is free and needs no domain, but it only
  delivers to the address that owns the Resend account — fine here, where the
  only recipient is Eddie. `RESEND_FROM` overrides the sender once a domain is
  verified there.
- **Lovable Emails** takes over when Resend isn't configured and
  `LEAD_NOTIFY_DOMAIN` names a domain registered under Cloud → Emails. That
  registration is a paid feature; without it the API refuses every send
  (403 `no_matching_sender`), which is why the code skips rather than tries.

`LEAD_NOTIFY_TO` overrides the recipient for both.

## Migrations

Applied by pasting into **Cloud → SQL editor**, which costs no credits. Lovable
does *not* run `supabase/migrations/*.sql` on push — the files are a record, not
a mechanism.

| File | Table |
| --- | --- |
| `0001_leads.sql` | `leads` |
| `0002_lock_down_leads.sql` | revokes anon/authenticated access to it |
| `0003_site_content.sql` | `site_content` — copy, photo picks, roles, logos, campaign order |
| `0004_site_works.sql` | `site_works` |
| `0005_work_assets.sql` | per-work file overrides |
| `0006_custom_works.sql` | campaign and kind, for works created in the back-office |
| `0007_lead_attachments.sql` | attachment columns on `leads`, and the private `lead-files` bucket |

`20260906043550_*.sql` is Lovable's own copy of 0001, written when it applied it.

## Secrets

| Name | Needed for |
| --- | --- |
| `ADMIN_PASSWORD` | the back-office. Unset means nobody gets in, including Eddie |
| `RESEND_API_KEY` | lead emails through Resend — the free path, wins over Lovable's |
| `RESEND_FROM` | overrides Resend's sender once a domain is verified there |
| `LEAD_NOTIFY_DOMAIN` | lead emails through Lovable Emails — needs a paid registered domain |
| `LEAD_NOTIFY_TO` | overrides the notification recipient |
| `TELEGRAM_BOT_TOKEN` | Telegram lead alerts — from @BotFather |
| `TELEGRAM_CHAT_ID` | Telegram lead alerts — the chat to post into |

Secrets apply to preview immediately and to the live site **only after a
publish**.

## How the data fits together

Nothing in the database is required. Every table only *overrides* what the code
already ships, so an empty database renders the site exactly as built — which is
also why a broken query is invisible until you try to save.

- **Copy** — `CONTENT_FIELDS` in `src/lib/site-content.ts` holds every editable
  string with its default; rows in `site_content` override by key. Adding an
  editable field is one entry in that list. An empty value normally means "never
  set" and keeps the default — a field marked `blankable` instead treats it as
  "take this off the page", which is how the availability line and the social
  links get turned off.
- **Photos and documents** — `IMAGE_FIELDS` and `FILE_FIELDS`, same table. The
  value is a filename in the `site-assets` bucket; empty means the file bundled
  with the build.
- **Work** — `WORKS_CATALOGUE` in `src/lib/works-catalogue.ts` is the full list;
  `site_works` overrides title, category, order, visibility and files. A row
  carrying its own `campaign` is a piece created in the back-office.
- **Roles and logos** — one JSON row each in `site_content`
  (`experience.roles`, `experience.logos`), so the lists can grow.

## The back-office

Four tabs behind one password at `/admin/leads`.

**Leads** — every enquiry, newest first. Rows tick, and a bar appears offering
the three statuses and a delete across the whole selection; the tick boxes only
ever cover what the current search and filter leave on screen, so acting on a
selection can't reach a row that isn't visible. The sort menu orders what the
status filters leave behind — by status is the one that answers "what still
needs a reply". Opening a row shows the message and, if there is one, a button
that mints a fresh signed link to the attachment.

**Content** — every editable string and every photo slot, grouped by the
section it appears in. It only sends fields that actually changed, so two
people editing different tabs can't overwrite each other.

**Works** — the 27 built-in pieces plus anything added here, with campaign
grouping, ordering and per-piece file overrides.

**Files** — the `site-assets` bucket. Search by name, filter to Images, Video
or Documents, and sort by name, date or size; the count reads "12 of 74" while
a filter is on so a short list is never mistaken for a lost upload.

## Attachments on the contact form

A visitor can attach one file, up to 5 MB, from a short list of types
(`ALLOWED_ATTACHMENT_TYPES` in `src/lib/submit-lead.ts`). The limit and the
list are enforced on the server; the browser checks them too, only so the
refusal is instant.

**The bucket is private, unlike `site-assets`.** Someone attaching a brief is
sending it to Eddie, not publishing it, so nothing in `lead-files` is reachable
from a guessable URL. The back-office mints a signed link per click that expires
within the hour, behind `requireAdmin` — there is no stored URL to leak. Don't
"fix" this by making the bucket public.

**The lead is saved before the file is touched.** If the upload fails — the
bucket missing because 0007 hasn't run, storage down — the enquiry still stands
and the notification says the file didn't make it, so Eddie can ask for it. A
failed upload must never cost a lead.

Storage keys are ASCII, and the extension is carried across separately: a wholly
Thai filename strips to nothing, and `ตำแหน่งงาน.pdf` collapsing to a bare `pdf`
would lose the extension. What the visitor named it survives regardless — the
signed link carries the original name, so that is what downloads.

## Traps this project has already hit

**`VITE_*` variables never reach the production build.** They reach the preview,
so anything touching Supabase from the browser works in preview and fails live.
Everything goes through server functions reading `process.env` instead. Don't
reintroduce a browser-side Supabase call.

**Lovable's generated `attachSupabaseAuth` breaks every server function.** It
reaches for the browser Supabase client on each call, which throws without those
env vars. `src/lib/attach-supabase-auth.ts` replaces it in `src/start.ts`; if
Lovable regenerates the auth files, check that swap survived.

**`**/server/**` is import-protected.** A server function imported by client
code has to live somewhere else, hence `src/lib/`.

**macOS stores Thai filenames decomposed (NFD).** Matching a filename typed as
NFC finds nothing. Read names from disk and compare normalised — two videos were
one commit away from being swapped under each other's names.

**Print artwork is CMYK.** Converting it with `sips --matchTo` crushes the
blacks; the key visuals were converted with Pillow using relative colorimetric
and *no* black point compensation, which preserves a lit studio backdrop instead
of mapping it to black.

**The security scan's storage finding is a false positive.** It reports
"Public storage bucket allows unrestricted file uploads and deletions" because
`storage.objects` carries no RLS policies — and reads that as unrestricted. It's
the opposite: RLS is enabled (`relrowsecurity = true`) with zero policies, which
in PostgreSQL denies every operation to `anon` and `authenticated`. Uploads work
because server functions hold the service role, which bypasses RLS, and public
reads go through the public object endpoint, which doesn't consult it. Adding
policies to "fix" this would *open* what is currently shut. Verify with:

```sql
select relrowsecurity from pg_class where oid = 'storage.objects'::regclass;
select policyname, cmd, roles from pg_policies
where schemaname = 'storage' and tablename = 'objects';
```

Expected: `true`, and no rows.

**Tracked-out labels overflow their column before they wrap.** `hairline` adds
0.28em of letter-spacing, so a label is far wider than it looks — and a token
like `DESIGN/PR/EVENT` has no space to break at, since slashes aren't break
opportunities. It overflowed onto the next column on iPad. Fixed by wrapping
(`overflow-wrap: break-word` on `hairline`, `break-word` globally), by letting
grid cells shrink (`min-w-0` — grid items default to `min-width: auto`), and by
holding the stats at two columns until `lg`. Check new labels at 375, 768, 820
and 1440.

**The home loader's reads are independent — keep them in `Promise.all`.** They
were written as six `await`s in a row, which cost six round trips in series
before the page could render at all: 4.4s to first byte cold, 0.9–1.5s warm.
Adding a seventh read means adding it to the array, not a line above it. Four of
the six still query `site_content` separately; in parallel that costs one round
trip, but it's the obvious thing to consolidate if the loader ever needs more.

**Parallax on the photos was built and then removed**, on 9 September 2026.
Worth knowing before anyone builds it again. At a tasteful 4% drift nobody
could see it — 59px of travel spread over 1,600px of scrolling is 3.6% slower
than the page, below what registers. Raised to a visible 8%, it earned its
keep even less: this site is read by recruiters who came from a CV link, and
none of them decide anything because a photo drifted.

If it is ever revisited, two things present as "it just doesn't work". The
`animation` shorthand resets `animation-duration` to `0s`, and a scroll-driven
animation needs `auto` to span its timeline — at `0s` it is applied, running
and frozen on frame one. And `overflow: hidden` on an ancestor makes that box
a scroll container, so `view()` measures against a frame that never scrolls
and pins progress at exactly 50%; `overflow: clip` crops the same and creates
no scroll container. Read `element.getAnimations()[0].currentTime` at two
scroll positions to tell them apart — a constant 50% is the second one.

**Lovable appends its own og:image, and its URL changes every publish.** It
is an automatic screenshot of whatever the site looked like at that build,
served from an r2.dev path named after the commit — so the link preview is
whatever the page happened to look like, at 1920×1080 rather than the 1200×630
a card wants. Choosing an image under Content → Page → Share image emits a
proper og:image *before* Lovable's, and a scraper takes the first one it
finds. Leaving it unset falls back to the screenshot rather than nothing.

**Facebook caches a scrape and will not refresh on its own.** A link that was
shared before the tags were right keeps showing the old card indefinitely.
Paste the URL into developers.facebook.com/tools/debug and press Scrape Again
after changing anything a card shows. The tags being correct in `curl` says
nothing about what Facebook is still holding.

**The marquee needs exactly two copies of the logo set.** The animation travels
-50%; three copies land the loop mid-set and the strip visibly snaps.

## Working agreement

- **Never force-push, rebase or amend a pushed commit.** Lovable syncs this
  branch and rewriting history corrupts the project. Revert instead.
- **Use `bun`.** `bunfig.toml` sets a 24h supply-chain guard on new package
  versions; `npm` would ignore the lockfile pinning.
- **Never commit `.env`.** The repo is public.
- **Database work belongs in the SQL editor**, not a Lovable prompt. Prompts
  cost roughly a credit each; the SQL editor is free. One credit has been spent
  on this project in total.
- **`ffmpeg` lives at `~/.local/bin/ffmpeg`** (an arm64 static build from the
  `ffmpeg-static` npm package, not Homebrew). Source media compresses from
  around 1GB to 110MB at CRF 28, 720p.

## Where things live

```
src/lib/
  site-content.ts     copy, photo and document fields + their server functions
  works.ts            campaigns, ordering, per-piece overrides
  works-catalogue.ts  the built-in list of work
  roles.ts            work history
  logos.ts            agency logos
  site-url.ts         the site's own address — the one line to change if it moves
  admin-session.ts    password check, HMAC cookie
  admin-assets.ts     site-assets bucket: list, upload, delete
  admin-leads.ts      read leads, set status, delete, sign an attachment link
  submit-lead.ts      the contact form, the attachment, and the limits on it
  notify-lead.ts      Telegram and email, one of each per lead

src/components/site/   what a visitor sees
src/components/admin/  one editor per tab
src/routes/index.tsx        the page, and every meta tag a scraper reads
src/routes/admin.leads.tsx  the back-office shell and the Leads tab
```
