# PRD — Eddie's Creative Hub

Living spec for this project. Read this before making changes.

## 1. Product

A personal portfolio site for Eddie Nakharin (Bangkok — advertising, branding, PR,
events, business development) that converts visitors into inbound leads.

- **Live:** https://eddie-nakharin.lovable.app
- **Repo:** https://github.com/Eddie2528/eddie-s-creative-hub (public)
- **Built with:** Lovable (scaffold + deploy) + Claude Code (features)
- **Stack:** TanStack Start, Vite, React 19, Tailwind 4, shadcn/ui, bun
- **Backend:** Lovable Cloud (Supabase), project `hsocdtyjgsbdbxknnjxw`

## 2. Current state

### Shipped
- Responsive one-page site, fluid from 360px to 1440px
- Hero with photo carousel, intro, company logo marquee, role timeline
- Works grid (image + video), personal profile section
- Sticky "Get in Touch" button opening a lead dialog
- CV download button
- Lovable Cloud enabled; `leads` table live and receiving real submissions

### Known gaps
| Gap | Impact | Owner |
| --- | --- | --- |
| No way to read leads back | Data would be write-only | §4 |
| Company names, roles, CV file are placeholders | Site shows fake credentials | Eddie supplies real assets |

## 3. Feature: lead capture (priority 1)

The dialog in `src/components/site/LeadDialog.tsx` already collects the right
fields. It needs to write them somewhere.

### Data model — table `public.leads`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `name` | `text` | required — person or company name |
| `email` | `text` | required |
| `phone` | `text` | required |
| `message` | `text` | nullable — "How can I help?" |
| `created_at` | `timestamptz` | `now()` |
| `status` | `text` | `new` \| `contacted` \| `archived`, default `new` |
| `source` | `text` | nullable — page or campaign the lead came from |

Columns mirror the existing form inputs exactly (`name`, `email`, `phone`,
`message`); do not rename them without updating the form.

### Security (non-negotiable)

`leads` is reachable only through the service role, which only server-side code
can hold. RLS is on and **no policy grants anon or authenticated anything**, so
a leaked publishable key buys nothing.

The first cut granted `select` and `update` to `authenticated`, which a Lovable
security scan flagged as critical — correctly. "Authenticated" is not a guest
list: Supabase accepts sign-ups through its auth API whether or not the site
shows a login form, so it meant anyone who bothered to register could read every
lead. `0002_lock_down_leads.sql` revokes it.

**Being signed in is not authorization.** Anything that later reads leads for a
person must check that it is Eddie, explicitly.

### Behaviour
- Submit writes one row, then shows the existing thank-you state.
- On failure, show an error and keep the user's input — never silently drop a lead.
- Basic anti-spam: honeypot field, and reject submissions faster than ~2s.

### Why the write goes through the server

`src/lib/submit-lead.ts` is a `createServerFn` RPC; the browser never talks to
Supabase directly. The first attempt did insert from the browser and worked in
preview but not on the published site: `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` reach the preview build but not the production
one, so `createSupabaseClient()` threw and every lead was lost. Going through
the server uses `process.env` instead, and keeps credentials and the spam
checks out of reach of the browser.

Note `**/server/**` is import-protected by TanStack Start — a server function
imported by client code must live elsewhere, hence `src/lib/`.

Moving the write to the server was not enough on its own. `src/start.ts`
registers the generated `attachSupabaseAuth` as global `functionMiddleware`, and
it calls `supabase.auth.getSession()` in the browser — so the missing client env
took down *every* server function before the request left the page, including
ones needing no session. `src/lib/attach-supabase-auth.ts` replaces it with a
version that attaches a token when one is available and proceeds without it
otherwise. The generated file is left untouched; Lovable rewrites it.

## 4. Feature: back-office (priority 2)

Lives at `/admin/leads`, behind a password checked server-side (`ADMIN_PASSWORD`
as a Cloud secret). Supabase Auth isn't an option — the browser client has no
working env in production — and "signed in" wouldn't have meant "Eddie" anyway.
A correct password sets an HMAC-signed httpOnly cookie; every server function
re-checks it.

Two tabs: **Leads** (search, status filters, detail panel, CSV) and **Content**
(§4b).

### 4b. Content editing — phased

Every editable string lives in `src/lib/site-content.ts` with its fallback, and
rows in `site_content` override them. An empty table renders the site exactly as
it was, so the CMS can never take the page down.

| Phase | Scope |
| --- | --- |
| 1 ✅ | Text: headings, kickers, intro copy, stats, buttons, footer, page meta |
| 2 | Images via Cloud Storage — hero carousel, profile photo, work posters, CV |
| 3 | Lists: add/remove/reorder companies, roles and works |

Adding an editable field is one entry in `CONTENT_FIELDS`; the admin form
renders itself from that list.

### Original sketch

A private page to read and work the leads. Build this in Claude Code, not
Lovable — it is detailed UI work and Lovable credits are the scarce resource.

- Route `/admin/leads`, behind Supabase auth (Eddie only).
- Table of leads: newest first, columns name / email / phone / created / status.
- Search by name or email; filter by status.
- Click a row to open a drawer with the full message and a status control.
- Export visible leads to CSV.

## 5. Working agreement

Split of work, following the Lovable + Claude Code method:

| Do in **Lovable** | Do in **Claude Code** |
| --- | --- |
| Scaffolding, deploy, domains | Feature code, refactors |
| Cloud provisioning (tables, storage, secrets) | UI detail, validation, tests |
| One precise prompt at a time | Everything iterative |

**Why:** Lovable credits are limited and reset daily; Claude Code work is bounded
by a 5-hour session window instead. Iterating in Lovable burns the scarcer budget.

Constraints:
- **Never force-push, rebase, or amend pushed commits** — it corrupts Lovable's
  project history (see `AGENTS.md`).
- Use `bun`, never `npm` — the repo pins `bun.lock` and `bunfig.toml` sets a 24h
  supply-chain guard on new package versions.
- Never commit `.env`; the repo is public.
- Pushing to `main` syncs straight to Lovable, so keep `main` working.

## 6. What we learned

- **Lovable does not apply `supabase/migrations/*.sql` on push.** Pushing the
  file only syncs it. Either prompt Lovable to run it, or paste it into
  `Cloud → SQL editor` — the SQL editor costs no credits and is the cheaper
  path for anything schema-related from here on.
- **Publishing is not automatic.** A push updates the Lovable preview only; the
  live site keeps serving the previous build until someone hits Publish.
  Preview and production are separate builds with different bundle hashes.
- **`VITE_*` env vars don't reach the production build** (see §3), which is why
  writes go through the server.
- **The server does have `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`** in
  `process.env`, even though the client env is missing. A live submission
  reached the database through the server function, which is what proves it.
- **Email needs a paid plan.** `Cloud → Emails` is a paywall with no sender
  domain to choose, and the API refuses every send without a registered one
  (400 `missing_parameter`, then 403 `no_matching_sender`). `notifyNewLead`
  skips cleanly until `LEAD_NOTIFY_DOMAIN` is set, so no code changes when a
  domain is eventually verified.
- Publishing and pushing both cost zero credits. Prompts cost ~1 each, and the
  security scanner's "Try to fix all" is free — but it rewrites policies its own
  way, so for anything touching lead data, write the SQL and run it yourself.

## 7. Open questions

- Which auth method for the back-office — magic link or password?

## 8. Next steps

1. ~~Apply the `leads` table~~ — done, `supabase/migrations/0001_leads.sql`.
2. ~~Wire the form to save~~ — done, via the server function.
3. ~~Verify a real submission lands in the table~~ — done on the live site.
4. Apply `0002_lock_down_leads.sql` via `Cloud → SQL editor`.
5. ~~Add email notification~~ — written, but dormant: sending needs a paid
   plan (see §6). Set `LEAD_NOTIFY_DOMAIN` to switch it on.
6. Build `/admin/leads`, authorizing Eddie explicitly (see §3).
7. Replace placeholder logos, work samples, and the CV file.
