import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { SITE_BUCKET } from "./site-assets";

// Where new uploads can go. Files already in the bucket root stay there —
// moving them would break every stored reference, which names a file without
// any folder.
export const ASSET_FOLDERS = ["works", "logos", "profile", "documents"] as const;
export type AssetFolder = (typeof ASSET_FOLDERS)[number];

export type Asset = {
  // Full path in the bucket, folder included — this is what gets stored and
  // resolved, so it has to travel with the file.
  name: string;
  size: number;
  contentType: string | null;
  updatedAt: string | null;
  url: string;
};

// Storage isn't in the generated Database types, and the admin client is typed
// against them — describe only the calls we make.
type StorageApi = {
  storage: {
    listBuckets(): PromiseLike<{ data: { name: string }[] | null; error: unknown }>;
    createBucket(
      id: string,
      options: { public: boolean; fileSizeLimit?: number },
    ): PromiseLike<{ error: { message: string } | null }>;
    from(bucket: string): {
      list(
        path: string,
        options: { limit: number; sortBy?: { column: string; order: string } },
      ): PromiseLike<{
        data:
          | {
              name: string;
              updated_at: string | null;
              metadata: { size?: number; mimetype?: string } | null;
            }[]
          | null;
        error: { message: string } | null;
      }>;
      upload(
        path: string,
        body: ArrayBuffer | Uint8Array,
        options: { contentType?: string; upsert?: boolean; cacheControl?: string },
      ): PromiseLike<{ error: { message: string } | null }>;
      remove(paths: string[]): PromiseLike<{ error: { message: string } | null }>;
    };
  };
};

async function storage() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return (supabaseAdmin as unknown as StorageApi).storage;
}

function publicUrl(name: string): string {
  const base = (process.env["SUPABASE_URL"] ?? "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${SITE_BUCKET}/${name}`;
}

// Creating the bucket needs the service role, which only the server holds — so
// it happens here rather than as a manual step in the Lovable dashboard.
async function ensureBucket(): Promise<void> {
  const api = await storage();
  const { data } = await api.listBuckets();
  if (data?.some((bucket) => bucket.name === SITE_BUCKET)) return;

  // Public: visitors download the CV and watch the showreels without a session.
  // Nothing private belongs in here.
  const { error } = await api.createBucket(SITE_BUCKET, {
    public: true,
    fileSizeLimit: 200 * 1024 * 1024,
  });
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(`Failed to create bucket: ${error.message}`);
  }
}

export const adminListAssets = createServerFn({ method: "POST" }).handler(async (): Promise<Asset[]> => {
  const { requireAdmin } = await import("./admin-session");
  await requireAdmin();
  await ensureBucket();

  const api = (await storage()).from(SITE_BUCKET);

  // Storage lists one prefix at a time, so the root and each folder are
  // separate calls; entries without metadata are the folders themselves.
  const read = async (prefix: string): Promise<Asset[]> => {
    const { data, error } = await api.list(prefix, {
      limit: 1000,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`Failed to list files: ${error.message}`);
    return (data ?? [])
      .filter((item) => item.metadata)
      .map((item) => {
        const path = prefix ? `${prefix}/${item.name}` : item.name;
        return {
          name: path,
          size: item.metadata?.size ?? 0,
          contentType: item.metadata?.mimetype ?? null,
          updatedAt: item.updated_at,
          url: publicUrl(path),
        };
      });
  };

  const groups = await Promise.all(["", ...ASSET_FOLDERS].map(read));
  return groups.flat();
});

export const adminUploadAsset = createServerFn({ method: "POST" })
  .validator(
    z.object({
      // The filename itself carries no slashes; the folder is chosen separately.
      name: z
        .string()
        .min(1)
        .max(160)
        .regex(/^[A-Za-z0-9._-]+$/, "Use letters, numbers, dots, dashes and underscores only"),
      folder: z.enum(ASSET_FOLDERS).nullable(),
      contentType: z.string().max(128),
      base64: z.string().max(140_000_000),
    }),
  )
  .handler(async ({ data }): Promise<Asset> => {
    const { requireAdmin } = await import("./admin-session");
    await requireAdmin();
    await ensureBucket();

    const binary = atob(data.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const path = data.folder ? `${data.folder}/${data.name}` : data.name;

    const { error } = await (await storage()).from(SITE_BUCKET).upload(path, bytes, {
      contentType: data.contentType || "application/octet-stream",
      upsert: true, // re-uploading a name replaces it, so links never break
      cacheControl: "3600",
    });
    if (error) throw new Error(`Upload failed: ${error.message}`);

    return {
      name: path,
      size: bytes.length,
      contentType: data.contentType,
      updatedAt: new Date().toISOString(),
      url: publicUrl(path),
    };
  });

export const adminDeleteAsset = createServerFn({ method: "POST" })
  // Slashes allowed here: a file inside a folder is addressed by its path.
  .validator(z.object({ name: z.string().min(1).max(200) }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireAdmin } = await import("./admin-session");
    await requireAdmin();

    const { error } = await (await storage()).from(SITE_BUCKET).remove([data.name]);
    if (error) throw new Error(`Delete failed: ${error.message}`);
    return { ok: true };
  });
