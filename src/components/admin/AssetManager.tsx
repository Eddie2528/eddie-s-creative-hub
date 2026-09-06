import { useEffect, useRef, useState } from "react";
import { Check, Copy, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminDeleteAsset, adminListAssets, adminUploadAsset, type Asset } from "@/lib/admin-assets";

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

  if (loading) return <p className="py-10 text-muted-foreground">Loading…</p>;

  const totalSize = assets.reduce((sum, a) => sum + a.size, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {assets.length} {assets.length === 1 ? "file" : "files"} · {formatSize(totalSize)}
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
        <ul className="divide-y divide-border rounded-lg border border-border">
          {assets.map((asset) => (
            <li key={asset.name} className="flex flex-wrap items-center gap-3 px-4 py-3">
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
