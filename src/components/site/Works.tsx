import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Play } from "lucide-react";

import theMallThematic from "@/assets/works/the-mall-thematic.jpg";
import theMallFood from "@/assets/works/the-mall-food.jpg";
import theMallPet from "@/assets/works/the-mall-pet.jpg";
import theMallShopping from "@/assets/works/the-mall-shopping.jpg";
import theMallHarbourland from "@/assets/works/the-mall-harbourland.jpg";
import emDistrictKv from "@/assets/works/em-district-kv.jpg";
import okThinKv from "@/assets/works/ok-thin-kv.jpg";
import okThinBus from "@/assets/works/ok-thin-bus.jpg";
import moongPattanaBook from "@/assets/works/moong-pattana-book.jpg";

type Work = {
  title: string;
  client: string;
  category: string;
  year?: string;
  poster: string;
  video?: string;
  span: string;
  // The tile's ratio, chosen for its slot in the grid rather than for the
  // artwork: key visuals arrive anywhere from 2:3 to 2.4:1, and letting each
  // one set its own height left the grid ragged. Cropping here is safe because
  // opening a piece shows it uncropped.
  ratio: string;
};

const works: Work[] = [
  {
    client: "The Mall M7 M8",
    title: "Thematic key visual",
    category: "Branding",
    poster: theMallThematic,
    span: "sm:col-span-12 lg:col-span-7",
    ratio: "aspect-[4/3]",
  },
  {
    client: "Moong Pattana",
    title: "The Book for All Moms",
    category: "Campaign",
    poster: moongPattanaBook,
    span: "sm:col-span-12 lg:col-span-5",
    ratio: "aspect-[4/3]",
  },
  {
    client: "The Mall M7 M8",
    title: "Food zone",
    category: "Retail",
    poster: theMallFood,
    span: "sm:col-span-6 lg:col-span-3",
    ratio: "aspect-[3/4]",
  },
  {
    client: "The Mall M7 M8",
    title: "Pet zone",
    category: "Retail",
    poster: theMallPet,
    span: "sm:col-span-6 lg:col-span-3",
    ratio: "aspect-[3/4]",
  },
  {
    client: "The Mall M7 M8",
    title: "Shopping zone",
    category: "Retail",
    poster: theMallShopping,
    span: "sm:col-span-6 lg:col-span-3",
    ratio: "aspect-[3/4]",
  },
  {
    client: "The Mall M7 M8",
    title: "Harbourland zone",
    category: "Retail",
    poster: theMallHarbourland,
    span: "sm:col-span-6 lg:col-span-3",
    ratio: "aspect-[3/4]",
  },
  {
    client: "EM District",
    title: "Thematic key visual",
    category: "Branding",
    poster: emDistrictKv,
    span: "sm:col-span-12 lg:col-span-12",
    ratio: "aspect-[21/9]",
  },
  {
    client: "OK Thin",
    title: "Biscuit key visual",
    category: "Advertising",
    poster: okThinKv,
    span: "sm:col-span-12 lg:col-span-7",
    ratio: "aspect-[4/3]",
  },
  {
    client: "OK Thin",
    title: "Bus campaign",
    category: "Out-of-home",
    poster: okThinBus,
    span: "sm:col-span-12 lg:col-span-5",
    ratio: "aspect-[4/3]",
  },
];

export function Works() {
  const [active, setActive] = useState<Work | null>(null);

  return (
    <>
      <div className="grid gap-[clamp(0.75rem,2vw,1.25rem)] sm:grid-cols-12">
        {works.map((work) => (
          <button
            key={work.title}
            type="button"
            onClick={() => setActive(work)}
            className={`group relative overflow-hidden rounded-sm bg-secondary text-left ${work.ratio} ${work.span}`}
          >
            <img
              src={work.poster}
              alt={work.title}
              loading="lazy"
              className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {work.video && (
              <video
                src={work.video}
                muted
                loop
                playsInline
                preload="none"
                onMouseEnter={(e) => void e.currentTarget.play()}
                onMouseLeave={(e) => e.currentTarget.pause()}
                className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
              <div>
                <p className="hairline">
                  {work.client} — {work.category}
                  {work.year ? ` — ${work.year}` : ""}
                </p>
                <h3 className="display mt-2 text-xl md:text-2xl">{work.title}</h3>
              </div>
              {work.video && (
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Play className="size-5 fill-current" />
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl border-border bg-card p-2 sm:p-3">
          <DialogTitle className="sr-only">{active?.title ?? "Work"}</DialogTitle>
          {active?.video ? (
            <video
              src={active.video}
              poster={active.poster}
              controls
              autoPlay
              loop
              playsInline
              className="mx-auto max-h-[75vh] w-auto max-w-full rounded-sm"
            />
          ) : (
            active && (
              <img
                src={active.poster}
                alt={active.title}
                className="mx-auto max-h-[75vh] w-auto max-w-full rounded-sm object-contain"
              />
            )
          )}
          <div className="px-3 pb-3 pt-1">
            <p className="hairline">
              {active?.client} — {active?.category}
              {active?.year ? ` — ${active.year}` : ""}
            </p>
            <h3 className="display mt-1 text-2xl">{active?.title}</h3>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
