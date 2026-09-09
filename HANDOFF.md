# HANDOFF

Where the project stands and what to know before touching it. Read
[PRD.md](PRD.md) first for what the site is and why it's built this way; this
file is the state of play.

Last updated: 9 September 2026.

## Right now

The site is live at https://eddie-nakharin.lovable.app and everything on it
works: the contact form saves leads, 27 pieces of work across 8 campaigns
display and play, the CV downloads, and the back-office at `/admin/leads` edits
the copy, the photos, the works and the logos.

It is aimed at one reader: a recruiter who clicked a link from Eddie's CV or
LinkedIn. That is why the hero carries an availability line, why the closing
section offers an address to copy rather than only a form, and why search
ranking is not something this site is trying to win.

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

- **Upload the university logos** (Chulalongkorn, Dhonburi Rajabhat) in the
  Files tab, then pick them under Content → Profile. Nothing renders in that
  slot until both are chosen. Around 220px tall, transparent PNG.
- **Delete the test leads.** Eight enquiries from building the form, all on
  `@test.com`. The Leads tab deletes one at a time, or:
  `delete from public.leads where email ilike '%@test.com';`
- **Add the phone number.** Content → Contact details → Phone is deliberately
  empty, so nothing renders until it's filled in. The email beside it is live.
- **Turn on Telegram lead alerts** — see below. Until then a lead is only
  visible by opening the back-office.
- **Email on a new lead** is written and dormant. Sending needs a domain
  registered under Cloud → Emails, which is a paid feature — the API refuses
  every send without one. Set `LEAD_NOTIFY_DOMAIN` and it starts working with no
  code change. Telegram covers the same job on the free plan.

## Telling Eddie a lead arrived

Two independent channels, both best-effort: neither can fail a submission, and
either one being unset says nothing about the other.

**Telegram** is the one that works without paying. Message `@BotFather`, send
`/newbot`, and keep the token. Send the new bot a message, open
`https://api.telegram.org/bot<TOKEN>/getUpdates`, and read `result[0].message.chat.id`.
Put the two into Secrets as `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`, then
publish. Unset, it logs one line and skips.

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

`20260906043550_*.sql` is Lovable's own copy of 0001, written when it applied it.

## Secrets

| Name | Needed for |
| --- | --- |
| `ADMIN_PASSWORD` | the back-office. Unset means nobody gets in, including Eddie |
| `LEAD_NOTIFY_DOMAIN` | lead notification emails (unset — see above) |
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
  admin-session.ts    password check, HMAC cookie
  admin-assets.ts     Cloud Storage: list, upload, delete
  submit-lead.ts      the contact form's server function
  notify-lead.ts      the dormant email notification

src/components/admin/  one editor per tab
src/routes/admin.leads.tsx  the back-office shell and the Leads tab
```
