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
- Lovable Cloud enabled (Supabase client wired, **zero tables so far**)

### Known gaps
| Gap | Impact | Owner |
| --- | --- | --- |
| Lead form does not persist — `handleSubmit` only flips `sent` state | **Every inbound lead is lost** | This PRD, §3 |
| No notification on submit | Eddie doesn't know a lead arrived | §3 |
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

The site is public and unauthenticated, so RLS must be explicit:

- **RLS enabled** on `leads`.
- **Anonymous users:** `INSERT` only. No `SELECT`, `UPDATE`, or `DELETE` —
  otherwise anyone could read every lead Eddie has ever received.
- **Reading leads** happens server-side or behind auth (§4), never with the
  publishable key from the browser.

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

## 4. Feature: back-office (priority 2)

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
- Publishing and pushing both cost zero credits. Prompts cost ~1 each.

## 7. Open questions

- Are `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` present in the deployed
  server's `process.env`? If not, the server function fails the same way the
  browser client did, and Lovable has to wire them in.
- Email-on-new-lead: Lovable Cloud `Emails`, or an edge function?
- Which auth method for the back-office — magic link or password?

## 8. Next steps

1. ~~Apply the `leads` table~~ — done, `supabase/migrations/0001_leads.sql`.
2. ~~Wire the form to save~~ — done, via the server function.
3. Publish, then verify a real submission lands in the table.
4. Add email notification.
5. Build `/admin/leads`.
6. Replace placeholder logos, work samples, and the CV file.
