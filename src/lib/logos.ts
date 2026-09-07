import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { SITE_BUCKET } from "./site-assets";

export type Logo = {
  id: string;
  name: string;
  // A filename in the bucket, or "" for the logo bundled under this id.
  file: string;
};

export type ResolvedLogo = { id: string; name: string; src: string };

const LOGOS_KEY = "experience.logos";

export const DEFAULT_LOGOS: Logo[] = [
  { id: "v-and", name: "V&", file: "" },
  { id: "ogilvy", name: "Ogilvy", file: "" },
  { id: "spicy-hakuhodo", name: "Spicy Hakuhodo", file: "" },
  { id: "cj-worx", name: "CJ Worx", file: "" },
  { id: "delphys-hakuhodo", name: "Delphys Hakuhodo", file: "" },
  { id: "cenergy-innovation", name: "Cenergy Innovation", file: "" },
  { id: "centerpoint-entertainment", name: "CenterPoint Entertainment", file: "" },
];

const logoSchema = z.object({
  id: z.string().min(1).max(60),
  name: z.string().min(1).max(120),
  file: z.string().max(200),
});

type ContentTable = {
  from(table: "site_content"): {
    select(columns: string): PromiseLike<{
      data: { key: string; value: string }[] | null;
      error: { message: string } | null;
    }>;
    upsert(
      rows: { key: string; value: string }[],
      options?: { onConflict?: string },
    ): PromiseLike<{ error: { message: string } | null }>;
  };
};

async function contentTable() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return (supabaseAdmin as unknown as ContentTable).from("site_content");
}

async function loadLogos(): Promise<Logo[]> {
  try {
    const { data, error } = await (await contentTable()).select("key,value");
    if (error) throw new Error(error.message);
    const stored = new Map((data ?? []).map((row) => [row.key, row.value]));

    const raw = stored.get(LOGOS_KEY);
    if (raw) {
      const parsed = z.array(logoSchema).safeParse(JSON.parse(raw));
      if (parsed.success) return parsed.data;
    }
    // Logos used to be one content key per agency; anything chosen that way
    // still counts, so upgrading doesn't reset the picks.
    return DEFAULT_LOGOS.map((logo) => ({ ...logo, file: stored.get(`logo.${logo.id}`) ?? "" }));
  } catch (cause) {
    console.error("[logos] Using the built-in list; load failed", cause);
    return DEFAULT_LOGOS;
  }
}

function resolve(logo: Logo): ResolvedLogo {
  if (!logo.file) return { id: logo.id, name: logo.name, src: `bundled:${logo.id}` };
  const base = (process.env["SUPABASE_URL"] ?? "").replace(/\/$/, "");
  return {
    id: logo.id,
    name: logo.name,
    src: base ? `${base}/storage/v1/object/public/${SITE_BUCKET}/${logo.file}` : "",
  };
}

export const getLogos = createServerFn({ method: "GET" }).handler(
  async (): Promise<ResolvedLogo[]> => {
    // A logo with no file and no bundled artwork has nothing to show.
    return (await loadLogos())
      .map(resolve)
      .filter((logo) => logo.src);
  },
);

export const adminListLogos = createServerFn({ method: "POST" }).handler(async (): Promise<Logo[]> => {
  const { requireAdmin } = await import("./admin-session");
  await requireAdmin();
  return loadLogos();
});

export const adminSaveLogos = createServerFn({ method: "POST" })
  .validator(z.object({ logos: z.array(logoSchema).max(60) }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireAdmin } = await import("./admin-session");
    await requireAdmin();

    const { error } = await (await contentTable()).upsert(
      [{ key: LOGOS_KEY, value: JSON.stringify(data.logos) }],
      { onConflict: "key" },
    );
    if (error) throw new Error(`Couldn’t save the logos — ${error.message}`);
    return { ok: true };
  });
