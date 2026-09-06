import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  adminSaveContent,
  CONTENT_DEFAULTS,
  CONTENT_FIELDS,
  getSiteContent,
  type SiteContent,
} from "@/lib/site-content";

const SECTIONS = [...new Set(CONTENT_FIELDS.map((field) => field.section))];

export function ContentEditor() {
  const [saved, setSaved] = useState<SiteContent>(CONTENT_DEFAULTS);
  const [draft, setDraft] = useState<SiteContent>(CONTENT_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const content = await getSiteContent();
        setSaved(content);
        setDraft(content);
      } catch (cause) {
        console.error("Loading content failed", cause);
        setError("Couldn't load the current text.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Only what actually changed goes to the server, so saving can't quietly
  // write a stale value over an edit made somewhere else.
  const changed = useMemo(
    () => CONTENT_FIELDS.filter((field) => draft[field.key] !== saved[field.key]),
    [draft, saved],
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
      setError("Couldn't save — try again.");
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
