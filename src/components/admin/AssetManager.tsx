import { useEffect, useRef, useState } from "react";
import { Check, Copy, Film, FileText, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminDeleteAsset,
  adminListAssets,
  adminUploadAsset,
  ASSET_FOLDERS,
  type Asset,
  type AssetFolder,
} from "@/lib/admin-assets";

// Files uploaded before folders existed live in the bucket root. Moving them
// would break every stored reference, so they keep their place and get a group
// of their own.
const ROOT_GROUP = "Unsorted";

// The file travels to the server as base64 inside the RPC, which inflates it by
// a third — keep a ceiling well under the request limit.
const MAX_BYTES = 60 * 1024 * 1024;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Storage paths are flat and ASCII, so a file picked from a Thai-named folder
// still lands on a URL that survives copy-paste.
function safeName(name: string) {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return cleaned || `file-${Date.now()}`;
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(file);
  });
}

export function AssetManager() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ name: string; done: number; total: number } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [folder, setFolder] = useState<AssetFolder | "">("works");
  const fileInput = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      setAssets(await adminListAssets());
      setError(null);
    } catch (cause) {
      console.error("Listing files failed", cause);
      setError("Couldn't load the file list.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function upload(files: FileList) {
    const list = [...files];
    setError(null);

    for (const [index, file] of list.entries()) {
      setProgress({ name: file.name, done: index, total: list.length });

      if (file.size > MAX_BYTES) {
        setError(`${file.name} is ${formatSize(file.size)} — over the ${formatSize(MAX_BYTES)} limit.`);
        continue;
      }

      try {
        const uploaded = await adminUploadAsset({
          data: {
            name: safeName(file.name),
            folder: folder || null,
            contentType: file.type,
            base64: await toBase64(file),
          },
        });
        // Replace in place when overwriting, so the list doesn't grow duplicates.
        setAssets((current) => [...current.filter((a) => a.name !== uploaded.name), uploaded]);
      } catch (cause) {
        console.error("Upload failed", cause);
        setError(`Couldn't upload ${file.name}.`);
      }
    }

    setProgress(null);
    if (fileInput.current) fileInput.current.value = "";
    void load();
  }

  async function remove(asset: Asset) {
    if (!confirm(`Delete ${asset.name}? Anything on the site pointing at it will break.`)) return;
    const previous = assets;
    setAssets((current) => current.filter((a) => a.name !== asset.name));
    try {
      await adminDeleteAsset({ data: { name: asset.name } });
    } catch (cause) {
      console.error("Delete failed", cause);
      setAssets(previous);
      setError(`Couldn't delete ${asset.name}.`);
    }
  }

  async function copyUrl(asset: Asset) {
    await navigator.clipboard.writeText(asset.url);
    setCopied(asset.name);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) return <p className="py-10 text-muted-foreground">Loading…</p>;

  const totalSize = assets.reduce((sum, a) => sum + a.size, 0);

  const grouped = [...ASSET_FOLDERS, ROOT_GROUP]
    .map((group) => ({
      group,
      files: assets.filter((asset) =>
        group === ROOT_GROUP ? !asset.name.includes("/") : asset.name.startsWith(`${group}/`),
      ),
    }))
    .filter((section) => section.files.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {assets.length} {assets.length === 1 ? "file" : "files"} · {formatSize(totalSize)}
        </p>
        <div className="flex items-center gap-2">
          <select
            aria-label="Upload into"
            value={folder}
            onChange={(e) => setFolder(e.target.value as AssetFolder | "")}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm capitalize"
          >
            {ASSET_FOLDERS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value="">No folder</option>
          </select>
          <Input
            ref={fileInput}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && void upload(e.target.files)}
          />
          <Button onClick={() => fileInput.current?.click()} disabled={progress !== null}>
            <Upload className="size-4" />
            {progress ? `Uploading ${progress.done + 1}/${progress.total}…` : "Upload files"}
          </Button>
        </div>
      </div>

      {progress ? (
        <p className="text-sm text-muted-foreground">Sending {progress.name}…</p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {assets.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-16 text-center text-muted-foreground">
          No files yet. Upload the CV, showreels and images here.
        </p>
      ) : (
        <div className="space-y-6">
          {grouped.map((section) => (
            <section key={section.group} className="space-y-2">
              <h3 className="hairline capitalize">
                {section.group} · {section.files.length}
              </h3>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {section.files.map((asset) => (
                  <li key={asset.name} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    {/* Filenames alone make it hard to tell one key visual from
                        another; a still answers it at a glance. Videos have no
                        thumbnail of their own, so they show their type instead. */}
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-sm bg-secondary">
                      {(asset.contentType ?? "").startsWith("image/") ? (
                        <img src={asset.url} alt="" loading="lazy" className="size-full object-cover" />
                      ) : (
                        <span className="flex size-full items-center justify-center">
                          {(asset.contentType ?? "").startsWith("video/") ? (
                            <Film className="size-5 text-muted-foreground" />
                          ) : (
                            <FileText className="size-5 text-muted-foreground" />
                          )}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {asset.name.includes("/") ? asset.name.split("/").pop() : asset.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatSize(asset.size)}
                        {asset.contentType ? ` · ${asset.contentType}` : ""}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => void copyUrl(asset)}>
                      {copied === asset.name ? <Check className="size-4" /> : <Copy className="size-4" />}
                      {copied === asset.name ? "Copied" : "Copy URL"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void remove(asset)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

    </div>
  );
}
