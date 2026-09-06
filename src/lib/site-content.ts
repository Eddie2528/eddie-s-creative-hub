// Every editable string on the site, with the value it falls back to.
//
// This list is the single source of truth: the page reads through it, and the
// back-office renders its form from it. Adding an editable field means adding
// one entry here — no schema change, no admin UI change.

export type ContentField = {
  key: string;
  section: string;
  label: string;
  value: string;
  multiline?: boolean;
};

export const CONTENT_FIELDS: ContentField[] = [
  { key: "meta.title", section: "Page", label: "Browser title", value: "Eddie Nakharin — Brand, Communications & Business Development" },
  {
    key: "meta.description",
    section: "Page",
    label: "Search description",
    multiline: true,
    value:
      "18 years across advertising, branding, PR, events and business development. Portfolio, work experience and CV of Eddie Nakharin.",
  },

  { key: "hero.kicker", section: "Hero", label: "Kicker line", value: "Bangkok — Advertising, Branding, PR, Events, BD" },
  { key: "hero.headline1", section: "Hero", label: "Headline, first line", value: "Creative mind," },
  { key: "hero.headline2", section: "Hero", label: "Headline, highlighted word", value: "business" },
  { key: "hero.headline3", section: "Hero", label: "Headline, rest", value: "instinct." },
  { key: "hero.greeting", section: "Hero", label: "Greeting", value: "Hi, I’m Eddie." },
  {
    key: "hero.intro1",
    section: "Hero",
    label: "Intro, first paragraph",
    multiline: true,
    value:
      "I’ve spent the past 18 years working across advertising, branding, PR, events, and business development.",
  },
  {
    key: "hero.intro2",
    section: "Hero",
    label: "Intro, second paragraph",
    multiline: true,
    value:
      "My career started from a creative background. I studied Communication Design before continuing with a Master’s degree in Communication Arts, and over time I moved from design and PR into client service and business leadership. That journey has shaped the way I work today. I naturally look at a challenge from both the creative and business side.",
  },

  { key: "experience.kicker", section: "Experience", label: "Kicker line", value: "01 — Experience" },
  { key: "experience.heading", section: "Experience", label: "Heading", value: "Brands & teams I’ve worked with" },

  { key: "works.kicker", section: "Works", label: "Kicker line", value: "02 — Selected works" },
  { key: "works.heading", section: "Works", label: "Heading", value: "Campaigns, brands & experiences" },
  { key: "works.note", section: "Works", label: "Note under heading", value: "Hover a film to preview, click any piece to open it full size." },

  { key: "profile.kicker", section: "Profile", label: "Kicker line", value: "03 — Personal profile" },
  { key: "profile.heading", section: "Profile", label: "Heading", value: "Half maker, half dealmaker" },
  {
    key: "profile.para1",
    section: "Profile",
    label: "First paragraph",
    multiline: true,
    value:
      "I build relationships the same way I build campaigns: with a clear idea, honest conversation and a plan that actually works commercially. Days are split between pitching, shaping strategy with creative teams, and keeping clients close.",
  },
  {
    key: "profile.para2",
    section: "Profile",
    label: "Second paragraph",
    multiline: true,
    value:
      "Outside work you’ll find me shooting photos around Bangkok, collecting design books, and mentoring young planners and designers who are figuring out their own path.",
  },
  { key: "profile.stat1.value", section: "Profile", label: "Stat 1 — number", value: "18+" },
  { key: "profile.stat1.label", section: "Profile", label: "Stat 1 — label", value: "Years" },
  { key: "profile.stat2.value", section: "Profile", label: "Stat 2 — number", value: "120+" },
  { key: "profile.stat2.label", section: "Profile", label: "Stat 2 — label", value: "Campaigns" },
  { key: "profile.stat3.value", section: "Profile", label: "Stat 3 — number", value: "40+" },
  { key: "profile.stat3.label", section: "Profile", label: "Stat 3 — label", value: "Brands" },
  { key: "profile.stat4.value", section: "Profile", label: "Stat 4 — number", value: "MA" },
  { key: "profile.stat4.label", section: "Profile", label: "Stat 4 — label", value: "Comm. Arts" },

  { key: "cta.heading", section: "Closing", label: "Closing headline", value: "Let’s make something" },
  { key: "cta.primary", section: "Closing", label: "Primary button", value: "Get in Touch" },
  { key: "cta.secondary", section: "Closing", label: "Secondary button", value: "Download my CV" },

  { key: "footer.name", section: "Footer", label: "Name", value: "Eddie Nakharin" },
  { key: "footer.location", section: "Footer", label: "Location", value: "Bangkok, Thailand" },
];

export type SiteContent = Record<string, string>;

export const CONTENT_DEFAULTS: SiteContent = Object.fromEntries(
  CONTENT_FIELDS.map((field) => [field.key, field.value]),
);

// Stored rows win, but only for keys still in CONTENT_FIELDS: a row left behind
// by a renamed or deleted field is ignored rather than resurrecting old copy.
export function mergeContent(stored: SiteContent): SiteContent {
  const merged = { ...CONTENT_DEFAULTS };
  for (const field of CONTENT_FIELDS) {
    const value = stored[field.key];
    if (typeof value === "string" && value.length > 0) merged[field.key] = value;
  }
  return merged;
}

// ── Server access ────────────────────────────────────────────────────────────

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type ContentRow = { key: string; value: string };

// types.ts is regenerated by Lovable only when *it* applies a migration. This
// table was created through the Cloud SQL editor, which costs no credits but
// leaves the generated types unaware of it — so describe just the two calls we
// make rather than casting the whole client to any.
type ContentTable = {
  from(table: "site_content"): {
    select(columns: string): PromiseLike<{ data: ContentRow[] | null; error: { message: string } | null }>;
    upsert(
      rows: ContentRow[],
      options?: { onConflict?: string },
    ): PromiseLike<{ error: { message: string } | null }>;
  };
};

async function contentTable() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return (supabaseAdmin as unknown as ContentTable).from("site_content");
}

// Read by the page itself, so it must never throw: copy going missing should
// show the built-in text, not an error page.
export const getSiteContent = createServerFn({ method: "GET" }).handler(async (): Promise<SiteContent> => {
  try {
    const { data, error } = await (await contentTable()).select("key,value");
    if (error) throw new Error(error.message);
    return mergeContent(Object.fromEntries((data ?? []).map((row) => [row.key, row.value])));
  } catch (cause) {
    console.error("[content] Using defaults; load failed", cause);
    return CONTENT_DEFAULTS;
  }
});

export const adminSaveContent = createServerFn({ method: "POST" })
  .validator(
    z.object({
      entries: z
        .array(z.object({ key: z.string().min(1).max(100), value: z.string().max(5000) }))
        .max(200),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireAdmin } = await import("./admin-session");
    await requireAdmin();

    // Only keys the site actually renders — a stray key would be dead weight
    // the page never reads.
    const known = new Set(CONTENT_FIELDS.map((field) => field.key));
    const rows = data.entries.filter((entry) => known.has(entry.key));
    if (rows.length === 0) return { ok: true };

    const { error } = await (await contentTable()).upsert(rows, { onConflict: "key" });
    if (error) throw new Error(`Failed to save content: ${error.message}`);
    return { ok: true };
  });
