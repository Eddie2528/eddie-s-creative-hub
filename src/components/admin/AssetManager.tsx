import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownUp, Check, Copy, Film, FileText, Search, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminDeleteAsset, adminListAssets, adminUploadAsset, type Asset } from "@/lib/admin-assets";

// Grouped the way someone looking for a file thinks about it, not the way a
// MIME type is written: "the showreel" and "the logo" rather than video/mp4.
const KINDS = {
  all: "All",
  image: "Images",
  video: "Video",
  file: "Documents",
} as const;
type Kind = keyof typeof KINDS;

function kindOf(asset: Asset): Exclude<Kind, "all"> {
  const type = asset.contentType ?? "";
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  return "file";
}

const SORTS = {
  name: "Name A–Z",
  newest: "Newest first",
  largest: "Largest first",
} as const;
type Sort = keyof typeof SORTS;

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
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const [sort, setSort] = useState<Sort>("name");
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

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = assets.filter((asset) => {
      if (kind !== "all" && kindOf(asset) !== kind) return false;
      return !needle || asset.name.toLowerCase().includes(needle);
    });

    return [...matched].sort((a, b) => {
      switch (sort) {
        case "newest":
          // A file with no timestamp sorts last rather than ahead of everything.
          return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
        case "largest":
          return b.size - a.size;
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [assets, query, kind, sort]);

  if (loading) return <p className="py-10 text-muted-foreground">Loading…</p>;

  const totalSize = visible.reduce((sum, a) => sum + a.size, 0);
  const filtered = visible.length !== assets.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {visible.length} {visible.length === 1 ? "file" : "files"}
          {filtered ? ` of ${assets.length}` : ""} · {formatSize(totalSize)}
        </p>
        <div>
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

      {/* Same shape as the Leads tab: search narrows, the buttons cut to one
          kind, the menu orders what's left. */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search file name"
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {(Object.keys(KINDS) as Kind[]).map((value) => (
            <Button
              key={value}
              variant={kind === value ? "default" : "outline"}
              size="sm"
              onClick={() => setKind(value)}
            >
              {KINDS[value]}
            </Button>
          ))}
        </div>
        <Select value={sort} onValueChange={(next) => setSort(next as Sort)}>
          <SelectTrigger className="w-44" aria-label="Sort files">
            <ArrowDownUp className="size-4 shrink-0 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SORTS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {progress ? (
        <p className="text-sm text-muted-foreground">Sending {progress.name}…</p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-16 text-center text-muted-foreground">
          {assets.length
            ? "No files match that search."
            : "No files yet. Upload the CV, showreels and images here."}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {visible.map((asset) => (
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
                <p className="truncate text-sm font-medium">{asset.name}</p>
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
      )}
    </div>
  );
}
