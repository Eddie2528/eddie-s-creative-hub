import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Eye, EyeOff, GripVertical, Play, Plus, Trash2 } from "lucide-react";

import { SESSION_EXPIRED } from "@/routes/admin.leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminDeleteWork,
  adminListCampaigns,
  adminSaveWorks,
  type Campaign,
  type Work,
} from "@/lib/works";
import { adminListAssets, type Asset } from "@/lib/admin-assets";
import { resolveBundled } from "@/lib/bundled-works";

// The same still the site shows, so reordering is done by looking at the work
// rather than by reading its title.
function thumb(work: Work): string | null {
  return resolveBundled(work.kind === "video" ? work.poster : work.asset);
}

export function WorksEditor({ onSessionExpired }: { onSessionExpired?: () => void } = {}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [videos, setVideos] = useState<Asset[]>([]);
  const [images, setImages] = useState<Asset[]>([]);
  const [assetsError, setAssetsError] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setCampaigns(await adminListCampaigns());
        await loadAssets();
      } catch (cause) {
        console.error("Loading works failed", cause);
        setError("Couldn't load the works list.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Kept apart from the campaign load so a failure here is visible and can be
  // retried: an empty file list looks identical to having uploaded nothing,
  // and silently swallowing the error left no way to tell the difference.
  async function loadAssets() {
    try {
      const assets = await adminListAssets();
      setVideos(assets.filter((a) => (a.contentType ?? "").startsWith("video/")));
      setImages(assets.filter((a) => (a.contentType ?? "").startsWith("image/")));
      setAssetsError(false);
    } catch (cause) {
      console.error("Loading files failed", cause);
      setAssetsError(true);
    }
  }

  function update(campaignName: string, updater: (works: Work[]) => Work[]) {
    setCampaigns((current) =>
      current.map((campaign) =>
        campaign.name === campaignName ? { ...campaign, works: updater(campaign.works) } : campaign,
      ),
    );
    setDirty(true);
  }

  function moveCampaign(index: number, delta: number) {
    setCampaigns((current) => {
      const next = [...current];
      const target = index + delta;
      const from = next[index];
      const to = next[target];
      if (!from || !to) return current;
      next[index] = to;
      next[target] = from;
      return next;
    });
    setDirty(true);
  }

  // Lifts the dragged campaign out and drops it in, rather than swapping the
  // two: dragging past several campaigns should land where it was released.
  function dropCampaign(to: number) {
    setCampaigns((current) => {
      if (dragging === null || dragging === to) return current;
      const next = [...current];
      const [moved] = next.splice(dragging, 1);
      if (!moved) return current;
      next.splice(to, 0, moved);
      return next;
    });
    if (dragging !== null && dragging !== to) setDirty(true);
    setDragging(null);
    setDropTarget(null);
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
              asset: work.assetName,
              poster: work.posterName,
              campaign: work.isCustom ? campaign.name : null,
              kind: work.isCustom ? work.kind : null,
            })),
          ),
          campaignOrder: campaigns.map((campaign) => campaign.name),
        },
      });
      setDirty(false);
      // Stays until the next edit: a message that disappears leaves "No
      // changes" on screen, which reads as though nothing was saved.
      setJustSaved(true);
    } catch (cause) {
      console.error("Saving works failed", cause);
      // Pass the server's own words through: "relation does not exist" tells
      // you a migration hasn't been run, which "try again" never would.
      const message = cause instanceof Error ? cause.message : "Couldn't save — try again.";
      if (message.startsWith(SESSION_EXPIRED)) onSessionExpired?.();
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  function addCampaign() {
    const name = prompt("Campaign name")?.trim();
    if (!name) return;
    if (campaigns.some((campaign) => campaign.name === name)) {
      setError(`There's already a campaign called ${name}.`);
      return;
    }
    setCampaigns((current) => [...current, { name, works: [] }]);
    setDirty(true);
  }

  function addPiece(campaignName: string, kind: Work["kind"]) {
    update(campaignName, (works) => [
      ...works,
      {
        id: `custom-${crypto.randomUUID()}`,
        campaign: campaignName,
        title: "Untitled",
        category: kind === "video" ? "Film" : "Branding",
        kind,
        asset: "",
        poster: null,
        assetName: null,
        posterName: null,
        sort: works.length,
        visible: true,
        isCustom: true,
      },
    ]);
  }

  async function removePiece(campaignName: string, work: Work) {
    if (!confirm(`Delete “${work.title}”? This can't be undone.`)) return;
    update(campaignName, (works) => works.filter((w) => w.id !== work.id));
    try {
      await adminDeleteWork({ data: { id: work.id } });
    } catch (cause) {
      console.error("Deleting work failed", cause);
      setError(cause instanceof Error ? cause.message : "Couldn't delete.");
    }
  }

  if (loading) return <p className="py-10 text-muted-foreground">Loading…</p>;

  const hiddenCount = campaigns.flatMap((c) => c.works).filter((w) => !w.visible).length;

  return (
    <div className="space-y-8 pb-28">
      {assetsError ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/50 p-3">
          <p role="alert" className="flex-1 text-sm text-destructive">
            Couldn’t load your uploaded files, so the file dropdowns are empty. If you were signed
            out, sign in again first.
          </p>
          <Button variant="outline" size="sm" onClick={() => void loadAssets()}>
            Reload files
          </Button>
        </div>
      ) : null}

      <p className="text-sm text-muted-foreground">
        Campaigns and the pieces inside them appear on the site in this order. Drag a campaign by
        its handle, or use the chevrons — dragging needs a mouse, the chevrons work anywhere. The
        arrows on a row move one piece. Hidden pieces stay here so you can bring them back. A new
        piece needs a file picked before it can appear on the site.
        {hiddenCount ? ` ${hiddenCount} hidden.` : ""}
      </p>

      {campaigns.map((campaign, campaignIndex) => (
        <section
          key={campaign.name}
          onDragOver={(e) => {
            e.preventDefault();
            setDropTarget(campaignIndex);
          }}
          onDrop={() => dropCampaign(campaignIndex)}
          className={`space-y-3 rounded-lg transition-colors ${
            dropTarget === campaignIndex && dragging !== campaignIndex
              ? "outline-dashed outline-2 outline-offset-4 outline-primary"
              : ""
          } ${dragging === campaignIndex ? "opacity-40" : ""}`}
        >
          <div className="flex items-center gap-2">
            <span
              draggable
              onDragStart={(e) => {
                // Chrome won't start a drag unless the event carries data.
                e.dataTransfer.setData("text/plain", campaign.name);
                e.dataTransfer.effectAllowed = "move";
                setDragging(campaignIndex);
              }}
              onDragEnd={() => {
                setDragging(null);
                setDropTarget(null);
              }}
              aria-hidden
              title="Drag to reorder"
              className="cursor-grab rounded p-1 text-muted-foreground hover:bg-card active:cursor-grabbing"
            >
              <GripVertical className="size-5" />
            </span>
            <h2 className="display text-xl">{campaign.name}</h2>
            <Button
              variant="outline"
              size="sm"
              aria-label={`Move ${campaign.name} up`}
              disabled={campaignIndex === 0}
              onClick={() => moveCampaign(campaignIndex, -1)}
            >
              <ChevronUp className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-label={`Move ${campaign.name} down`}
              disabled={campaignIndex === campaigns.length - 1}
              onClick={() => moveCampaign(campaignIndex, 1)}
            >
              <ChevronDown className="size-4" />
            </Button>
          </div>
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

                <div className="flex w-full gap-2 sm:w-auto sm:min-w-72">
                  <select
                    aria-label={`${work.id} file`}
                    value={work.assetName ?? ""}
                    onChange={(e) => {
                      const name = e.target.value || null;
                      // Carry the chosen file's URL across too, so the
                      // thumbnail changes with the dropdown instead of staying
                      // blank until the next reload.
                      const picked = [...videos, ...images].find((f) => f.name === name);
                      update(campaign.name, (works) =>
                        works.map((w) =>
                          w.id === work.id
                            ? { ...w, assetName: name, asset: picked?.url ?? w.asset }
                            : w,
                        ),
                      );
                    }}
                    className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="">Default file</option>
                    {work.assetName &&
                    ![...videos, ...images].some((f) => f.name === work.assetName) ? (
                      <option value={work.assetName}>{work.assetName}</option>
                    ) : null}
                    {(work.kind === "video" ? videos : images).map((file) => (
                      <option key={file.name} value={file.name}>
                        {file.name}
                      </option>
                    ))}
                  </select>
                  {work.kind === "video" ? (
                    <select
                      aria-label={`${work.id} poster`}
                      value={work.posterName ?? ""}
                      onChange={(e) => {
                        const name = e.target.value || null;
                        const picked = images.find((f) => f.name === name);
                        update(campaign.name, (works) =>
                          works.map((w) =>
                            w.id === work.id
                              ? { ...w, posterName: name, poster: picked?.url ?? w.poster }
                              : w,
                          ),
                        );
                      }}
                      className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="">Default poster</option>
                      {work.posterName && !images.some((f) => f.name === work.posterName) ? (
                        <option value={work.posterName}>{work.posterName}</option>
                      ) : null}
                      {images.map((file) => (
                        <option key={file.name} value={file.name}>
                          {file.name}
                        </option>
                      ))}
                    </select>
                  ) : null}
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
                  {work.isCustom ? (
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label="Delete"
                      onClick={() => void removePiece(campaign.name, work)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => addPiece(campaign.name, "image")}>
              <Plus className="size-4" /> Image
            </Button>
            <Button variant="outline" size="sm" onClick={() => addPiece(campaign.name, "video")}>
              <Plus className="size-4" /> Film
            </Button>
          </div>
        </section>
      ))}

      <Button variant="outline" onClick={addCampaign}>
        <Plus className="size-4" /> New campaign
      </Button>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
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
