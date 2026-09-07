import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { SESSION_EXPIRED } from "@/routes/admin.leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminListRoles, adminSaveRoles, type Role } from "@/lib/roles";

export function RolesEditor({
  onSessionExpired,
}: {
  onSessionExpired?: (() => void) | undefined;
} = {}) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setRoles(await adminListRoles());
      } catch (cause) {
        console.error("Loading roles failed", cause);
        setError("Couldn't load the roles.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function edit(id: string, patch: Partial<Role>) {
    setRoles((current) => current.map((role) => (role.id === id ? { ...role, ...patch } : role)));
    setDirty(true);
  }

  function move(index: number, delta: number) {
    setRoles((current) => {
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

  function add() {
    setRoles((current) => [
      ...current,
      { id: `role-${crypto.randomUUID()}`, period: "", title: "", company: "" },
    ]);
    setDirty(true);
  }

  function remove(role: Role) {
    if (!confirm(`Remove ${role.title || "this role"}?`)) return;
    setRoles((current) => current.filter((r) => r.id !== role.id));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await adminSaveRoles({ data: { roles } });
      setDirty(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    } catch (cause) {
      console.error("Saving roles failed", cause);
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
        <h2 className="display text-xl">Work history</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Newest first — this is the order the site shows. A role with no title and no company is
          left off the page.
        </p>
      </div>

      <div className="space-y-3">
        {roles.map((role, index) => (
          // A card per role: the fields used to sit in one flat grid, where
          // reading across two columns mixed one job's years with the next
          // job's title.
          <div key={role.id} className="rounded-lg border border-border p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="hairline">{index + 1}</span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Move up"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Move down"
                  disabled={index === roles.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button variant="outline" size="sm" aria-label="Remove" onClick={() => remove(role)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[9rem_1fr_1fr]">
              <div className="space-y-1.5">
                <Label htmlFor={`${role.id}-period`}>Years</Label>
                <Input
                  id={`${role.id}-period`}
                  value={role.period}
                  placeholder="2019 — Now"
                  onChange={(e) => edit(role.id, { period: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${role.id}-title`}>Title</Label>
                <Input
                  id={`${role.id}-title`}
                  value={role.title}
                  placeholder="Account Director"
                  onChange={(e) => edit(role.id, { title: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${role.id}-company`}>Company</Label>
                <Input
                  id={`${role.id}-company`}
                  value={role.company}
                  placeholder="Agency name"
                  onChange={(e) => edit(role.id, { company: e.target.value })}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={add}>
          <Plus className="size-4" /> Add role
        </Button>
        <Button onClick={() => void save()} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save roles"}
        </Button>
        <p className="text-sm text-muted-foreground">
          {error ? (
            <span role="alert" className="text-destructive">
              {error}
            </span>
          ) : justSaved ? (
            "Saved. Publish in Lovable to put it live."
          ) : dirty ? (
            "Unsaved changes"
          ) : (
            ""
          )}
        </p>
      </div>
    </section>
  );
}
