import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { SITE_BUCKET } from "./site-assets";
import { CAMPAIGN_ORDER, WORKS_CATALOGUE, type WorkKind } from "./works-catalogue";

export type Work = {
  id: string;
  campaign: string;
  title: string;
  category: string;
  kind: WorkKind;
  // Resolved for the browser: a storage URL, or the "bundled:<key>" marker the
  // component swaps for the artwork compiled into the build.
  asset: string;
  poster: string | null;
  sort: number;
  visible: boolean;
  assetName: string | null;
  posterName: string | null;
};

export type Campaign = { name: string; works: Work[] };

type WorkRow = {
  id: string;
  title: string;
  category: string;
  sort: number;
  visible: boolean;
  // Null means "whatever the catalogue names".
  asset: string | null;
  poster: string | null;
};

const ORDER_KEY = "works.campaign_order";

type ContentRowTable = {
  from(table: "site_content"): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): PromiseLike<{ data: { value: string } | null }>;
      };
    };
    upsert(
      rows: { key: string; value: string }[],
      options?: { onConflict?: string },
    ): PromiseLike<{ error: { message: string } | null }>;
  };
};

async function contentRows() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return (supabaseAdmin as unknown as ContentRowTable).from("site_content");
}

// The saved campaign order, stored as one row rather than a column per
// campaign — the list is short and only ever read whole.
async function savedCampaignOrder(): Promise<string[]> {
  try {
    const { data } = await (await contentRows()).select("value").eq("key", ORDER_KEY).maybeSingle();
    if (!data?.value) return [];
    const parsed: unknown = JSON.parse(data.value);
    return Array.isArray(parsed) ? parsed.filter((n): n is string => typeof n === "string") : [];
  } catch (cause) {
    console.error("[works] Using the built-in campaign order", cause);
    return [];
  }
}

type WorksTable = {
  from(table: "site_works"): {
    select(columns: string): PromiseLike<{ data: WorkRow[] | null; error: { message: string } | null }>;
    upsert(
      rows: WorkRow[],
      options?: { onConflict?: string },
    ): PromiseLike<{ error: { message: string } | null }>;
  };
};

async function worksTable() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return (supabaseAdmin as unknown as WorksTable).from("site_works");
}

function resolve(asset: string): string {
  if (asset.startsWith("bundled:")) return asset;
  const base = (process.env["SUPABASE_URL"] ?? "").replace(/\/$/, "");
  return base ? `${base}/storage/v1/object/public/${SITE_BUCKET}/${asset}` : asset;
}

// Overlays whatever is stored on top of the catalogue. A piece with no row is
// shown with its built-in title and its position in the catalogue, so the
// section is complete from the first page load and stays complete if a new
// piece is added to the catalogue later.
async function merged(): Promise<Work[]> {
  let rows: WorkRow[] = [];
  try {
    const { data, error } = await (await worksTable()).select("id,title,category,sort,visible,asset,poster");
    if (error) throw new Error(error.message);
    rows = data ?? [];
  } catch (cause) {
    console.error("[works] Using the built-in list; load failed", cause);
  }

  const byId = new Map(rows.map((row) => [row.id, row]));

  return WORKS_CATALOGUE.map((entry, index) => {
    const row = byId.get(entry.id);
    return {
      id: entry.id,
      campaign: entry.campaign,
      title: row?.title ?? entry.title,
      category: row?.category ?? entry.category,
      kind: entry.kind,
      asset: resolve(row?.asset || entry.asset),
      poster: (() => {
        const poster = row?.poster || entry.poster;
        return poster ? resolve(poster) : null;
      })(),
      // The bare filenames, so the back-office can show what's selected
      // without having to parse a URL back apart.
      assetName: row?.asset ?? null,
      posterName: row?.poster ?? null,
      sort: row?.sort ?? index,
      visible: row?.visible ?? true,
    };
  });
}

function group(works: Work[], order: string[]): Campaign[] {
  const campaigns = new Map<string, Work[]>();
  for (const work of works) {
    const list = campaigns.get(work.campaign) ?? [];
    list.push(work);
    campaigns.set(work.campaign, list);
  }

  return [...campaigns.entries()]
    .map(([name, list]) => ({ name, works: list.sort((a, b) => a.sort - b.sort) }))
    .sort((a, b) => {
      // A saved order wins; then the catalogue's; anything named in neither
      // goes last rather than jumping to the front.
      const ai = order.indexOf(a.name);
      const bi = order.indexOf(b.name);
      return (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi);
    });
}

export const getCampaigns = createServerFn({ method: "GET" }).handler(async (): Promise<Campaign[]> => {
  const [works, saved] = await Promise.all([merged(), savedCampaignOrder()]);
  const order = saved.length > 0 ? saved : CAMPAIGN_ORDER;
  return group(works.filter((work) => work.visible), order).filter(
    (campaign) => campaign.works.length > 0,
  );
});

// The back-office needs the hidden pieces too, or they'd be impossible to
// bring back.
export const adminListCampaigns = createServerFn({ method: "POST" }).handler(
  async (): Promise<Campaign[]> => {
    const { requireAdmin } = await import("./admin-session");
    await requireAdmin();
    const [works, saved] = await Promise.all([merged(), savedCampaignOrder()]);
    return group(works, saved.length > 0 ? saved : CAMPAIGN_ORDER);
  },
);

export const adminSaveWorks = createServerFn({ method: "POST" })
  .validator(
    z.object({
      entries: z
        .array(
          z.object({
            id: z.string().min(1).max(120),
            title: z.string().min(1).max(200),
            category: z.string().min(1).max(80),
            sort: z.number().int().min(0).max(9999),
            visible: z.boolean(),
            asset: z.string().max(200).nullable(),
            poster: z.string().max(200).nullable(),
          }),
        )
        .max(200),
      campaignOrder: z.array(z.string().min(1).max(120)).max(50).optional(),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireAdmin } = await import("./admin-session");
    await requireAdmin();

    // Only pieces the catalogue knows: a row for anything else would never be
    // rendered and would just sit there confusing the next reader.
    const known = new Set(WORKS_CATALOGUE.map((entry) => entry.id));
    const rows = data.entries.filter((entry) => known.has(entry.id));
    if (rows.length === 0) return { ok: true };

    const { error } = await (await worksTable()).upsert(rows, { onConflict: "id" });
    if (error) throw new Error(
        `Couldn’t save works — ${error.message}. A missing site_works table or column means ` +
          `migrations 0004 and 0005 still need running in the Cloud SQL editor.`,
      );

    if (data.campaignOrder) {
      const { error: orderError } = await (await contentRows()).upsert(
        [{ key: ORDER_KEY, value: JSON.stringify(data.campaignOrder) }],
        { onConflict: "key" },
      );
      if (orderError) throw new Error(
          `Couldn’t save the campaign order — ${orderError.message}. A missing site_content ` +
            `table means migration 0003 still needs running in the Cloud SQL editor.`,
        );
    }
    return { ok: true };
  });
