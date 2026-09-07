import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { SESSION_EXPIRED } from "@/routes/admin.leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminListAssets, type Asset } from "@/lib/admin-assets";
import { adminListLogos, adminSaveLogos, type Logo } from "@/lib/logos";
import { BUNDLED_LOGOS } from "@/lib/bundled-logos";

export function LogosEditor({
  onSessionExpired,
}: {
  onSessionExpired?: (() => void) | undefined;
} = {}) {
  const [logos, setLogos] = useState<Logo[]>([]);
  const [images, setImages] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [list, assets] = await Promise.all([adminListLogos(), adminListAssets()]);
        setLogos(list);
        setImages(assets.filter((a) => (a.contentType ?? "").startsWith("image/")));
      } catch (cause) {
        console.error("Loading logos failed", cause);
        setError("Couldn't load the logos.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function edit(id: string, patch: Partial<Logo>) {
    setLogos((current) => current.map((logo) => (logo.id === id ? { ...logo, ...patch } : logo)));
    setDirty(true);
  }

  function move(index: number, delta: number) {
    setLogos((current) => {
      const next = [...current];
      const from = next[index];
      const to = next[index + delta];
      if (!from || !to) return current;
      next[index] = to;
      next[index + delta] = from;
      return next;
    });
    setDirty(true);
  }

  function preview(logo: Logo): string | null {
    if (!logo.file) return BUNDLED_LOGOS[logo.id] ?? null;
    return images.find((image) => image.name === logo.file)?.url ?? null;
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await adminSaveLogos({ data: { logos } });
      setDirty(false);
      setJustSaved(true);
    } catch (cause) {
      console.error("Saving logos failed", cause);
      const message = cause instanceof Error ? cause.message : "Couldn't save — try again.";
      if (message.startsWith(SESSION_EXPIRED)) onSessionExpired?.();
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="py-6 text-muted-foreground">Loading…</p>;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="display text-xl">Company logos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The marquee under the experience heading, in this order. Upload a logo in the Files tab
          first, then pick it here — a transparent PNG sits best on the light chip.
        </p>
      </div>

      <ul className="space-y-2">
        {logos.map((logo, index) => (
          <li key={logo.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-white p-1">
              {preview(logo) ? (
                <img src={preview(logo) as string} alt="" className="max-h-full max-w-full object-contain" />
              ) : null}
            </div>

            <Input
              className="min-w-40 flex-1"
              value={logo.name}
              aria-label="Company name"
              placeholder="Company name"
              onChange={(e) => edit(logo.id, { name: e.target.value })}
            />

            <select
              aria-label="Logo file"
              value={logo.file}
              onChange={(e) => edit(logo.id, { file: e.target.value })}
              className="h-9 min-w-52 flex-1 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">{BUNDLED_LOGOS[logo.id] ? "Built-in logo" : "No file yet"}</option>
              {logo.file && !images.some((image) => image.name === logo.file) ? (
                <option value={logo.file}>{logo.file}</option>
              ) : null}
              {images.map((image) => (
                <option key={image.name} value={image.name}>
                  {image.name}
                </option>
              ))}
            </select>

            <div className="flex gap-1">
              <Button variant="outline" size="sm" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>
                <ArrowUp className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                aria-label="Move down"
                disabled={index === logos.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                aria-label="Remove"
                onClick={() => {
                  if (!confirm(`Remove ${logo.name || "this logo"}?`)) return;
                  setLogos((current) => current.filter((l) => l.id !== logo.id));
                  setDirty(true);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          onClick={() => {
            setLogos((current) => [
              ...current,
              { id: `logo-${crypto.randomUUID()}`, name: "", file: "" },
            ]);
            setDirty(true);
          }}
        >
          <Plus className="size-4" /> Add logo
        </Button>
        <Button onClick={() => void save()} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save logos"}
        </Button>
        <p className="text-sm text-muted-foreground">
          {error ? (
            <span role="alert" className="text-destructive">
              {error}
            </span>
          ) : dirty ? (
            "Unsaved changes"
          ) : justSaved ? (
            "Saved. Publish in Lovable to put it live."
          ) : (
            ""
          )}
        </p>
      </div>
    </section>
  );
}
