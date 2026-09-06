import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminListCampaigns, adminSaveWorks, type Campaign, type Work } from "@/lib/works";

// Mirrors the bundled artwork in the public Works component, so pieces that
// were never uploaded still show a thumbnail here.
const BUNDLED_PREFIX = "bundled:";

function thumb(work: Work): string | null {
  const value = work.kind === "video" ? work.poster : work.asset;
  if (!value || value.startsWith(BUNDLED_PREFIX)) return null;
  return value;
}

export function WorksEditor() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setCampaigns(await adminListCampaigns());
      } catch (cause) {
        console.error("Loading works failed", cause);
        setError("Couldn't load the works list.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function update(campaignName: string, updater: (works: Work[]) => Work[]) {
    setCampaigns((current) =>
      current.map((campaign) =>
        campaign.name === campaignName ? { ...campaign, works: updater(campaign.works) } : campaign,
      ),
    );
    setDirty(true);
  }

  function move(campaignName: string, index: number, delta: number) {
    update(campaignName, (works) => {
      const next = [...works];
      const target = index + delta;
      const from = next[index];
      const to = next[target];
      if (!from || !to) return works;
      next[index] = to;
      next[target] = from;
      // Renumber the whole campaign so the saved order can't drift apart.
      return next.map((work, i) => ({ ...work, sort: i }));
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await adminSaveWorks({
        data: {
          entries: campaigns.flatMap((campaign) =>
            campaign.works.map((work, i) => ({
              id: work.id,
              title: work.title,
              category: work.category,
              sort: i,
              visible: work.visible,
            })),
          ),
        },
      });
      setDirty(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    } catch (cause) {
      console.error("Saving works failed", cause);
      setError("Couldn't save — try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="py-10 text-muted-foreground">Loading…</p>;

  const hiddenCount = campaigns.flatMap((c) => c.works).filter((w) => !w.visible).length;

  return (
    <div className="space-y-8 pb-28">
      <p className="text-sm text-muted-foreground">
        Pieces are grouped by campaign, in the order they appear on the site. Hidden pieces stay
        here so you can bring them back.
        {hiddenCount ? ` ${hiddenCount} hidden.` : ""}
      </p>

      {campaigns.map((campaign) => (
        <section key={campaign.name} className="space-y-3">
          <h2 className="display text-xl">{campaign.name}</h2>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {campaign.works.map((work, index) => (
              <li
                key={work.id}
                className={`flex flex-wrap items-center gap-3 p-3 ${work.visible ? "" : "opacity-50"}`}
              >
                <div className="relative size-14 shrink-0 overflow-hidden rounded-sm bg-secondary">
                  {thumb(work) ? (
                    <img src={thumb(work) as string} alt="" className="size-full object-cover" />
                  ) : null}
                  {work.kind === "video" ? (
                    <span className="absolute bottom-0.5 right-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Play className="size-2.5 fill-current" />
                    </span>
                  ) : null}
                </div>

                <div className="grid min-w-56 flex-1 gap-2 sm:grid-cols-2">
                  <Input
                    value={work.title}
                    aria-label={`${work.id} title`}
                    onChange={(e) =>
                      update(campaign.name, (works) =>
                        works.map((w) => (w.id === work.id ? { ...w, title: e.target.value } : w)),
                      )
                    }
                  />
                  <Input
                    value={work.category}
                    aria-label={`${work.id} category`}
                    onChange={(e) =>
                      update(campaign.name, (works) =>
                        works.map((w) => (w.id === work.id ? { ...w, category: e.target.value } : w)),
                      )
                    }
                  />
                </div>

                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Move up"
                    disabled={index === 0}
                    onClick={() => move(campaign.name, index, -1)}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Move down"
                    disabled={index === campaign.works.length - 1}
                    onClick={() => move(campaign.name, index, 1)}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={work.visible ? "Hide" : "Show"}
                    onClick={() =>
                      update(campaign.name, (works) =>
                        works.map((w) => (w.id === work.id ? { ...w, visible: !w.visible } : w)),
                      )
                    }
                  >
                    {work.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
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
              "No changes"
            )}
          </p>
          <Button size="sm" onClick={() => void save()} disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
