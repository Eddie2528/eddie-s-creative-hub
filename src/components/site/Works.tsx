import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Play } from "lucide-react";

import type { Campaign, Work } from "@/lib/works";

import theMallThematic from "@/assets/works/the-mall-thematic.jpg";
import theMallFood from "@/assets/works/the-mall-food.jpg";
import theMallPet from "@/assets/works/the-mall-pet.jpg";
import theMallShopping from "@/assets/works/the-mall-shopping.jpg";
import theMallHarbourland from "@/assets/works/the-mall-harbourland.jpg";
import emDistrictKv from "@/assets/works/em-district-kv.jpg";
import okThinKv from "@/assets/works/ok-thin-kv.jpg";
import okThinBus from "@/assets/works/ok-thin-bus.jpg";
import moongPattanaBook from "@/assets/works/moong-pattana-book.jpg";

// Artwork compiled into the build, for pieces that were never uploaded.
const BUNDLED: Record<string, string> = {
  "the-mall-thematic": theMallThematic,
  "the-mall-food": theMallFood,
  "the-mall-pet": theMallPet,
  "the-mall-shopping": theMallShopping,
  "the-mall-harbourland": theMallHarbourland,
  "em-district-kv": emDistrictKv,
  "ok-thin-kv": okThinKv,
  "ok-thin-bus": okThinBus,
  "moong-pattana-book": moongPattanaBook,
};

function src(value: string, override?: string): string {
  if (override) return override;
  return value.startsWith("bundled:") ? (BUNDLED[value.slice(8)] ?? "") : value;
}

// A video's still comes from its poster; a photo is its own still.
function still(work: Work, overrides: Record<string, string>): string {
  const override = overrides[`works.${work.id}`];
  return work.kind === "video" ? src(work.poster ?? "", override) : src(work.asset, override);
}

export function Works({
  campaigns = [],
  images = {},
}: {
  campaigns?: Campaign[];
  images?: Record<string, string>;
}) {
  const [active, setActive] = useState<Work | null>(null);

  return (
    <>
      <div className="space-y-[clamp(2.5rem,6vw,4rem)]">
        {campaigns.map((campaign) => (
          <section key={campaign.name}>
            <h3 className="hairline border-b border-border pb-3">{campaign.name}</h3>
            {/* One ratio across the grid keeps the rows aligned however the
                artwork arrives; opening a piece shows it uncropped. */}
            <div className="mt-5 grid gap-[clamp(0.75rem,2vw,1.25rem)] sm:grid-cols-2 lg:grid-cols-3">
              {campaign.works.map((work) => (
                <button
                  key={work.id}
                  type="button"
                  onClick={() => setActive(work)}
                  className="group relative aspect-[4/3] overflow-hidden rounded-sm bg-secondary text-left"
                >
                  <img
                    src={still(work, images)}
                    alt={work.title}
                    loading="lazy"
                    className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="hairline truncate">{work.category}</p>
                      <h4 className="display mt-1 truncate text-lg md:text-xl">{work.title}</h4>
                    </div>
                    {work.kind === "video" && (
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Play className="size-4 fill-current" />
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl border-border bg-card p-2 sm:p-3">
          <DialogTitle className="sr-only">{active?.title ?? "Work"}</DialogTitle>
          {active?.kind === "video" ? (
            <video
              src={src(active.asset)}
              poster={still(active, images)}
              controls
              autoPlay
              playsInline
              className="mx-auto max-h-[75vh] w-auto max-w-full rounded-sm"
            />
          ) : (
            active && (
              <img
                src={still(active, images)}
                alt={active.title}
                className="mx-auto max-h-[75vh] w-auto max-w-full rounded-sm object-contain"
              />
            )
          )}
          <div className="px-3 pb-3 pt-1">
            <p className="hairline">
              {active?.campaign} — {active?.category}
            </p>
            <h3 className="display mt-1 text-2xl">{active?.title}</h3>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
