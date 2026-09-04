import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Play } from "lucide-react";

import work1 from "@/assets/work-1.jpg";
import work2 from "@/assets/work-2.jpg";
import work3 from "@/assets/work-3.jpg";
import work4 from "@/assets/work-4.jpg";
import work5 from "@/assets/work-5.jpg";
import work6 from "@/assets/work-6.jpg";

const EVENT_VIDEO = "/__l5e/assets-v1/ce380b59-253f-42e8-89f5-814e9d5f4a48/work-event.mp4";
const PRODUCTION_VIDEO = "/__l5e/assets-v1/f6458a88-e128-4fda-90ac-22d9b4577074/work-production.mp4";

type Work = {
  title: string;
  category: string;
  year: string;
  poster: string;
  video?: string;
  span?: string;
};

const works: Work[] = [
  {
    title: "Out-of-home brand campaign",
    category: "Advertising",
    year: "2024",
    poster: work1,
    span: "lg:col-span-7",
  },
  {
    title: "Launch event & brand experience",
    category: "Events / Film",
    year: "2023",
    poster: work3,
    video: EVENT_VIDEO,
    span: "lg:col-span-5",
  },
  {
    title: "Identity system & packaging",
    category: "Branding",
    year: "2023",
    poster: work2,
    span: "lg:col-span-5",
  },
  {
    title: "Content production series",
    category: "Film / Social",
    year: "2025",
    poster: work5,
    video: PRODUCTION_VIDEO,
    span: "lg:col-span-7",
  },
  {
    title: "National press launch",
    category: "Public Relations",
    year: "2022",
    poster: work4,
    span: "lg:col-span-6",
  },
  {
    title: "Retail pop-up installation",
    category: "Experiential",
    year: "2024",
    poster: work6,
    span: "lg:col-span-6",
  },
];

export function Works() {
  const [active, setActive] = useState<Work | null>(null);

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-12">
        {works.map((work) => (
          <button
            key={work.title}
            type="button"
            onClick={() => setActive(work)}
            className={`group relative aspect-[4/3] overflow-hidden rounded-sm bg-secondary text-left ${work.span ?? ""}`}
          >
            <img
              src={work.poster}
              alt={work.title}
              width={1280}
              height={960}
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
                  {work.category} — {work.year}
                </p>
                <h3 className="display mt-2 text-2xl md:text-3xl">{work.title}</h3>
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
              className="w-full rounded-sm"
            />
          ) : (
            active && (
              <img
                src={active.poster}
                alt={active.title}
                width={1280}
                height={960}
                className="w-full rounded-sm"
              />
            )
          )}
          <div className="px-3 pb-3 pt-1">
            <p className="hairline">
              {active?.category} — {active?.year}
            </p>
            <h3 className="display mt-1 text-2xl">{active?.title}</h3>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
