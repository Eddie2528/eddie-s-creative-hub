import { useEffect, useMemo, useState } from "react";

import { SESSION_EXPIRED } from "@/routes/admin.leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  adminSaveContent,
  CONTENT_DEFAULTS,
  CONTENT_FIELDS,
  getSiteContent,
  FILE_FIELDS,
  IMAGE_FIELDS,
  type SiteContent,
} from "@/lib/site-content";
import { adminListAssets, type Asset } from "@/lib/admin-assets";
import { RolesEditor } from "@/components/admin/RolesEditor";

const IMAGE_TYPES = /^image\//;

const SECTIONS = [...new Set(CONTENT_FIELDS.map((field) => field.section))];

export function ContentEditor({ onSessionExpired }: { onSessionExpired?: () => void } = {}) {
  const [saved, setSaved] = useState<SiteContent>(CONTENT_DEFAULTS);
  const [draft, setDraft] = useState<SiteContent>(CONTENT_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [images, setImages] = useState<Asset[]>([]);
  const [assetsError, setAssetsError] = useState(false);
  const [docs, setDocs] = useState<Asset[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const content = await getSiteContent();
        setSaved(content);
        setDraft(content);
        await loadAssets();
      } catch (cause) {
        console.error("Loading content failed", cause);
        setError("Couldn't load the current text.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Separate from the content load so a failure is visible and retryable: the
  // picker only offers files already uploaded, and an empty list is otherwise
  // indistinguishable from having uploaded none.
  async function loadAssets() {
    try {
      const assets = await adminListAssets();
      setImages(assets.filter((a) => IMAGE_TYPES.test(a.contentType ?? "")));
      setDocs(
        assets.filter(
          (a) => !IMAGE_TYPES.test(a.contentType ?? "") && !/^video\//.test(a.contentType ?? ""),
        ),
      );
      setAssetsError(false);
    } catch (cause) {
      console.error("Loading files failed", cause);
      setAssetsError(true);
    }
  }

  // Only what actually changed goes to the server, so saving can't quietly
  // write a stale value over an edit made somewhere else.
  const editable = useMemo(
    () => [
      ...CONTENT_FIELDS.map((f) => ({ key: f.key })),
      ...IMAGE_FIELDS.map((f) => ({ key: f.key })),
      ...FILE_FIELDS.map((f) => ({ key: f.key })),
    ],
    [],
  );

  const changed = useMemo(
    () => editable.filter((field) => (draft[field.key] ?? "") !== (saved[field.key] ?? "")),
    [draft, saved, editable],
  );

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await adminSaveContent({
        data: { entries: changed.map((field) => ({ key: field.key, value: draft[field.key] ?? "" })) },
      });
      setSaved(draft);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    } catch (cause) {
      console.error("Saving content failed", cause);
      const message = cause instanceof Error ? cause.message : "Couldn't save — try again.";
      if (message.startsWith(SESSION_EXPIRED)) onSessionExpired?.();
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="py-10 text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-10 pb-28">
      {SECTIONS.map((section) => (
        <section key={section} className="space-y-4">
          <h2 className="display text-xl">{section}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {CONTENT_FIELDS.filter((field) => field.section === section).map((field) => {
              const isChanged = draft[field.key] !== saved[field.key];
              return (
                <div
                  key={field.key}
                  className={`space-y-2 ${field.multiline ? "md:col-span-2" : ""}`}
                >
                  <Label htmlFor={field.key} className="flex items-center gap-2">
                    {field.label}
                    {isChanged ? <span className="size-1.5 rounded-full bg-primary" /> : null}
                  </Label>
                  {field.multiline ? (
                    <Textarea
                      id={field.key}
                      rows={4}
                      value={draft[field.key] ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                    />
                  ) : (
                    <Input
                      id={field.key}
                      value={draft[field.key] ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <RolesEditor onSessionExpired={onSessionExpired} />

      <section className="space-y-4">
        <div>
          <h2 className="display text-xl">Photos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload in the Files tab first, then pick one here. Leave a field on “Built-in photo” to
            keep the picture that ships with the site.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {IMAGE_FIELDS.map((field) => {
            const value = draft[field.key] ?? "";
            const chosen = images.find((image) => image.name === value);
            return (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key} className="flex items-center gap-2">
                  {field.section} — {field.label}
                  {value !== (saved[field.key] ?? "") ? (
                    <span className="size-1.5 rounded-full bg-primary" />
                  ) : null}
                </Label>
                <div className="flex items-center gap-3">
                  <div className="size-16 shrink-0 overflow-hidden rounded-sm border border-border bg-secondary">
                    {chosen ? (
                      <img src={chosen.url} alt="" className="size-full object-cover" />
                    ) : null}
                  </div>
                  <select
                    id={field.key}
                    value={value}
                    onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Built-in photo</option>
                    {/* If the file list didn't load, the stored name has no
                        option to match and the box would show "Built-in photo"
                        — reading as though the choice had been lost. */}
                    {value && !images.some((image) => image.name === value) ? (
                      <option value={value}>{value}</option>
                    ) : null}
                    {images.map((image) => (
                      <option key={image.name} value={image.name}>
                        {image.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
        {assetsError ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/50 p-3">
            <p role="alert" className="flex-1 text-sm text-destructive">
              Couldn’t load your uploaded files. If you were signed out, sign in again first.
            </p>
            <Button variant="outline" size="sm" onClick={() => void loadAssets()}>
              Reload files
            </Button>
          </div>
        ) : images.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No images uploaded yet — add some in the Files tab.
          </p>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="display text-xl">Documents</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {FILE_FIELDS.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key} className="flex items-center gap-2">
                {field.label}
                {(draft[field.key] ?? "") !== (saved[field.key] ?? "") ? (
                  <span className="size-1.5 rounded-full bg-primary" />
                ) : null}
              </Label>
              <select
                id={field.key}
                value={draft[field.key] ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Built-in file</option>
                {draft[field.key] && !docs.some((doc) => doc.name === draft[field.key]) ? (
                  <option value={draft[field.key]}>{draft[field.key]}</option>
                ) : null}
                {docs.map((doc) => (
                  <option key={doc.name} value={doc.name}>
                    {doc.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>

      {/* Pinned so the save button is reachable without scrolling back up. */}
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <p className="text-sm text-muted-foreground">
            {error ? (
              <span role="alert" className="text-destructive">
                {error}
              </span>
            ) : justSaved ? (
              "Saved. Publish in Lovable to put it live."
            ) : changed.length ? (
              `${changed.length} unsaved ${changed.length === 1 ? "change" : "changes"}`
            ) : (
              "No changes"
            )}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDraft(saved)}
              disabled={!changed.length || saving}
            >
              Discard
            </Button>
            <Button size="sm" onClick={() => void save()} disabled={!changed.length || saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
